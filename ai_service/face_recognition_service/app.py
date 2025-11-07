from flask import Flask, request, jsonify
from deepface import DeepFace, extract_faces
import numpy as np
import base64
import cv2
import io
from PIL import Image
import logging
import time
import threading

app = Flask(__name__)

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# utility: decode base64 image to BGR numpy array
def decode_image(b64: str):
    if b64.startswith('data:image'):
        b64 = b64.split(',')[1]
    b = base64.b64decode(b64)
    img = Image.open(io.BytesIO(b)).convert('RGB')
    arr = np.array(img)[:, :, ::-1]  # RGB->BGR for OpenCV
    return arr

import cv2
import numpy as np

# Global variables for motion detection and thread-safety
previous_frame = None
previous_frame_ts = 0.0
motion_history = []
_motion_lock = threading.Lock()

# Utility function to convert NumPy types to native Python types
def convert_to_native(obj):
    if isinstance(obj, np.ndarray):
        return obj.tolist()
    elif isinstance(obj, (np.float32, np.float64)):
        return float(obj)
    elif isinstance(obj, (np.int32, np.int64)):
        return int(obj)
    elif isinstance(obj, dict):
        return {key: convert_to_native(value) for key, value in obj.items()}
    elif isinstance(obj, list):
        return [convert_to_native(item) for item in obj]
    return obj

@app.route('/extract', methods=['POST'])
def extract():
    global previous_frame, motion_history
    data = request.get_json() or {}
    img_b64 = data.get('imageBase64', '')
    allow_fallback = bool(data.get('allowFallback', False))

    try:
        logger.info("📸 Decoding image for extraction")
        img = decode_image(img_b64)
    except Exception as e:
        logger.error(f"❌ Image decoding failed: {e}")
        return jsonify({'error': 'invalid_image', 'message': str(e)}), 400

    try:
        logger.info("🔍 Detecting face using DeepFace RetinaFace")
        faces = extract_faces(img_path=img, detector_backend='retinaface', enforce_detection=False)
        if len(faces) == 0:
            raise ValueError("No face detected")
        face = faces[0][0]

        logger.info("🔍 Extracting embedding using DeepFace (Facenet)")
        emb = DeepFace.represent(img_path=face, model_name='Facenet', enforce_detection=False)

        if isinstance(emb, list) and len(emb) > 0 and isinstance(emb[0], dict) and 'embedding' in emb[0]:
            vect = emb[0]['embedding']
        elif isinstance(emb, dict) and 'embedding' in emb:
            vect = emb['embedding']
        else:
            vect = emb

        descriptor = [float(x) for x in np.array(vect).flatten().tolist()]
        used_fallback = False

    except Exception as e:
        err = str(e)
        logger.warning(f"⚠️ DeepFace.extract failed: {err}")

        if allow_fallback:
            try:
                logger.info("Retrying extraction with fallback mode (no face crop)")
                emb = DeepFace.represent(img_path=img, model_name='Facenet', enforce_detection=False)
                if isinstance(emb, list) and len(emb) > 0 and isinstance(emb[0], dict) and 'embedding' in emb[0]:
                    vect = emb[0]['embedding']
                elif isinstance(emb, dict) and 'embedding' in emb:
                    vect = emb['embedding']
                else:
                    vect = emb

                descriptor = [float(x) for x in np.array(vect).flatten().tolist()]
                used_fallback = True
            except Exception as e2:
                logger.error(f"❌ Fallback extraction failed: {e2}")
                return jsonify({
                    'error': 'descriptor_extraction_failed',
                    'message': err,
                    'humanMessageVi': 'Không phát hiện khuôn mặt trong ảnh. Hãy chụp cận mặt, ánh sáng tốt, đối diện camera và thử lại.'
                }), 400
        else:
            return jsonify({
                'error': 'descriptor_extraction_failed',
                'message': err,
                'humanMessageVi': 'Không phát hiện khuôn mặt trong ảnh. Hãy chụp cận mặt, ánh sáng tốt, đối diện camera và thử lại.'
            }), 400

    # 🧩 Tính liveness như trước
    try:
        logger.info("⚙️ Calculating liveness score")
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)

        # Entropy (texture / noise) — helps detect printed photos
        hist = cv2.calcHist([gray], [0], None, [256], [0, 256]).flatten()
        probs = hist / (hist.sum() + 1e-9)
        entropy = float(-np.sum([p * np.log(p + 1e-9) for p in probs]))
        entropy_score = float(min(max((entropy / 5.0), 0.0), 1.0))

        # Sharpness / blur (high variance -> sharp)
        try:
            blur_var = float(cv2.Laplacian(gray, cv2.CV_64F).var())
        except Exception:
            blur_var = 0.0
        blur_cap = 100.0
        quality_score = float(min(max((blur_var / blur_cap), 0.0), 1.0))

        # Brightness: prefer mid-range brightness
        mean_brightness = float(np.mean(gray) / 255.0)
        brightness_score = float(max(0.0, 1.0 - abs(mean_brightness - 0.5) * 2.0))

        # Motion: only use if we have a recent previous frame (avoid cross-user contamination and stale frames)
        motion_score = 0.0
        use_motion = False
        now = time.time()
        with _motion_lock:
            if previous_frame is not None and (now - previous_frame_ts) < 1.5:
                try:
                    flow = cv2.calcOpticalFlowFarneback(previous_frame, gray, None, 0.5, 3, 15, 3, 5, 1.2, 0)
                    motion_score = float(np.mean(np.sqrt(flow[..., 0]**2 + flow[..., 1]**2)))
                    use_motion = True
                except Exception as e:
                    logger.debug("optical flow failed: %s", e)
            # update frame and timestamp for next call
            try:
                previous_frame = gray.copy()
                previous_frame_ts = now
            except Exception:
                previous_frame = gray

        # maintain motion history (thread-safe-ish by lock while updating)
        with _motion_lock:
            try:
                if use_motion:
                    motion_history.append(motion_score)
                else:
                    motion_history.append(0.0)
            except Exception:
                motion_history.append(0.0)
            if len(motion_history) > 10:
                motion_history.pop(0)

        try:
            avg_motion = float(np.mean(motion_history)) if len(motion_history) > 0 else float(motion_score)
        except Exception:
            avg_motion = float(motion_score)

        motion_cap = 2.0
        motion_norm = float(min(max((avg_motion / motion_cap), 0.0), 1.0))

        # combine scores: if motion not available, give more weight to entropy+quality+brightness
        if use_motion:
            liveness_combined = 0.45 * entropy_score + 0.25 * motion_norm + 0.15 * quality_score + 0.15 * brightness_score
        else:
            liveness_combined = 0.6 * entropy_score + 0.2 * quality_score + 0.2 * brightness_score

        liveness_score = float(min(max(liveness_combined, 0.0), 1.0))
        logger.info("Liveness components: entropy=%.3f motion_norm=%.3f quality=%.3f brightness=%.3f use_motion=%s -> liveness=%.3f",
                    entropy_score, motion_norm, quality_score, brightness_score, use_motion, liveness_score)

    except Exception as e:
        logger.warning(f"Liveness calc failed: {e}")
        liveness_score = 0.5
        motion_score = 0.0

    logger.info("✅ Extraction successful")
    resp = {
        'descriptor': descriptor,
        'livenessScore': liveness_score,
        'motionScore': motion_score
    }

    if 'used_fallback' in locals() and used_fallback:
        resp['usedFallback'] = True
        resp['warning'] = 'fallback_embedding_used'

    # Convert all values in the response to native Python types
    resp = convert_to_native(resp)

    return jsonify(resp)

@app.route('/analyze', methods=['POST'])
def analyze():
    data = request.get_json() or {}
    img_b64 = data.get('imageBase64', '')
    try:
        img = decode_image(img_b64)
    except Exception as e:
        return jsonify({'error': 'invalid_image', 'message': str(e)}), 400

    # run a quick liveness/quality analysis
    try:
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        blur = cv2.Laplacian(gray, cv2.CV_64F).var()
        brightness = float(np.mean(gray) / 255.0)
        hist = cv2.calcHist([gray], [0], None, [256], [0,256]).flatten()
        probs = hist / (hist.sum() + 1e-9)
        entropy = float(-np.sum([p*np.log(p+1e-9) for p in probs]))
        liveness_score = float(min(max((entropy / 5.0), 0.0), 1.0))
        quality = float(min(max((blur / 100.0), 0.0), 1.0))
        # simple combined score
        combined = 0.6 * liveness_score + 0.4 * quality
    except Exception:
        combined = 0.5
        brightness = 0.5
        blur = 0.0

    return jsonify({'livenessScore': combined, 'brightness': brightness, 'blur': blur})


if __name__ == '__main__':
    print("✅ DeepFace AI server running at http://localhost:5001")
    app.run(host='0.0.0.0', port=5001)
