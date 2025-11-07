from flask import Flask, request, jsonify
from deepface import DeepFace
import importlib
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

# Try to resolve extract_faces dynamically
extract_faces_fn = None
for candidate in (
    'deepface.commons.functions',
    'deepface.commons.extractor',
    'deepface.extractor',
):
    try:
        mod = importlib.import_module(candidate)
        if hasattr(mod, 'extract_faces'):
            extract_faces_fn = getattr(mod, 'extract_faces')
            logger.info(f"Using extract_faces from {candidate}")
            break
    except Exception:
        continue
if extract_faces_fn is None:
    logger.warning("extract_faces helper not found; fallback will be used")

# Decode base64 image
def decode_image(b64: str):
    if b64.startswith('data:image'):
        b64 = b64.split(',')[1]
    b = base64.b64decode(b64)
    img = Image.open(io.BytesIO(b)).convert('RGB')
    return np.array(img)[:, :, ::-1]  # RGB -> BGR


def _summarize(obj, max_len=160):
    """Return a short summary string for logging (type, len/shape, first-item type).
    Keeps output small so we can safely include in logs/responses."""
    try:
        t = type(obj)
        if isinstance(obj, (list, tuple)):
            ln = len(obj)
            first = obj[0] if ln > 0 else None
            return f"{t.__name__}(len={ln}, first={type(first).__name__})"
        if isinstance(obj, dict):
            return f"dict(keys={list(obj.keys())[:5]})"
        if isinstance(obj, np.ndarray):
            return f"ndarray(shape={obj.shape},dtype={obj.dtype})"
        return f"{t.__name__}({str(obj)[:max_len]})"
    except Exception:
        return f"{type(obj).__name__}(summary_error)"

# Global motion variables
previous_frame = None
previous_frame_ts = 0.0
motion_history = []
_motion_lock = threading.Lock()

# Convert NumPy types to native Python types
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
    global previous_frame_ts
    data = request.get_json() or {}
    img_b64 = data.get('imageBase64', '')
    # enable fallback by default to improve robustness for edge-case images
    allow_fallback = bool(data.get('allowFallback', True))
    # optional: let caller prefer a detector ('retinaface', 'mtcnn', 'opencv')
    preferred_detector = data.get('preferredDetector')

    try:
        logger.info("📸 Decoding image")
        img = decode_image(img_b64)
        try:
            # log some diagnostics about the decoded image
            logger.debug("decoded image type=%s shape=%s dtype=%s min=%s max=%s mean=%.4f",
                         type(img), getattr(img, 'shape', None), getattr(img, 'dtype', None),
                         None if img is None else float(img.min()), None if img is None else float(img.max()),
                         None if img is None else float(img.mean()))
        except Exception:
            logger.debug("could not compute debug stats for decoded image")
    except Exception as e:
        logger.exception("❌ Image decoding failed")
        return jsonify({'error': 'invalid_image', 'message': str(e)}), 400

    face_img = img  # default to full image
    used_fallback = False
    try:
        # Try detect face if helper exists
        if extract_faces_fn:
            # Try a cascade of detectors for robustness; allow caller to prefer one
            default_detectors = ['retinaface', 'mtcnn', 'opencv']
            if preferred_detector and preferred_detector in default_detectors:
                detectors_to_try = [preferred_detector] + [d for d in default_detectors if d != preferred_detector]
            else:
                detectors_to_try = default_detectors
            faces = None
            for det in detectors_to_try:
                try:
                    logger.info(f"🔍 Detecting face using DeepFace {det}")
                    faces = extract_faces_fn(img_path=img, detector_backend=det, enforce_detection=False)
                    logger.debug("extract_faces returned: %s", _summarize(faces))
                    # some deepface internals return 0 to indicate failure — treat that as no faces
                    if isinstance(faces, (int, float)) and faces == 0:
                        logger.debug(f"extract_faces returned numeric 0 for detector {det}; treating as no faces")
                        faces = None
                        continue
                    # extract_faces may return 0, None, [] or nested lists
                    if isinstance(faces, (list, tuple)) and len(faces) > 0:
                        # faces[0] might be (face_img, region) or {'face': array}
                        candidate = faces[0]
                        if isinstance(candidate, (list, tuple)) and len(candidate) > 0:
                            face_img = candidate[0]
                        elif isinstance(candidate, dict) and 'face' in candidate:
                            face_img = candidate['face']
                        else:
                            # sometimes extract_faces returns a raw array inside list
                            if isinstance(candidate, np.ndarray):
                                face_img = candidate
                        logger.info(f"Detected {len(faces)} face(s) with {det})")
                        break
                    else:
                        logger.debug(f"No faces found with {det} -> { _summarize(faces) }")
                except Exception as det_exc:
                    logger.debug(f"Detector {det} raised: {det_exc}")
            if faces is None or (hasattr(faces, '__len__') and len(faces) == 0) or isinstance(faces, (int, float)):
                logger.warning("No face detected by any detector, using fallback; faces_summary=%s", _summarize(faces))
                # save the decoded image for debugging to uploads/fails
                try:
                    import os
                    fails_dir = os.path.join(os.path.dirname(__file__), '..', '..', 'uploads', 'fails')
                    os.makedirs(fails_dir, exist_ok=True)
                    ts = int(time.time() * 1000)
                    fname = os.path.join(fails_dir, f'fail_{ts}.jpg')
                    cv2.imwrite(fname, img)
                    logger.info(f"Saved failing image to {fname}")
                    saved_fail_path = fname
                except Exception:
                    saved_fail_path = None
        else:
            logger.warning("No extract_faces helper, using fallback")
        
        emb = DeepFace.represent(img_path=face_img, model_name='Facenet', enforce_detection=False)
        # DeepFace sometimes returns numeric 0 to indicate failure — detect that explicitly
        if isinstance(emb, (int, float)) and emb == 0:
            raise ValueError('DeepFace.represent returned numeric 0 (no embedding)')
        logger.debug("DeepFace.represent returned: %s", _summarize(emb))
        # Parse embedding robustly
        vect = None
        try:
            if isinstance(emb, (list, tuple)) and len(emb) > 0:
                first = emb[0]
                if isinstance(first, dict) and 'embedding' in first:
                    vect = first['embedding']
                elif isinstance(first, (list, tuple, np.ndarray)):
                    vect = np.array(first).flatten().tolist()
                else:
                    vect = first
            elif isinstance(emb, dict) and 'embedding' in emb:
                vect = emb['embedding']
            elif isinstance(emb, (list, tuple, np.ndarray)):
                vect = np.array(emb).flatten().tolist()
            else:
                # unknown shape (maybe 0 or scalar)
                vect = emb
        except Exception as parse_exc:
            logger.exception('Failed to parse embedding: %s', parse_exc)

        if vect is None:
            raise ValueError(f'unable_to_parse_embedding: emb_summary={_summarize(emb)}')

        # finally coerce to float list
        try:
            descriptor = [float(x) for x in np.array(vect).flatten().tolist()]
        except Exception as conv_exc:
            raise ValueError(f'embedding_coercion_failed: {conv_exc} emb_summary={_summarize(vect)}')

        used_fallback = (face_img is img)
    except Exception as e:
        # log full traceback to server logs for debug
        logger.exception("Face embedding extraction failed")
        err = str(e)
        # include diagnostics (short summaries)
        faces_summary = _summarize(locals().get('faces', None))
        emb_summary = _summarize(locals().get('emb', None))
        logger.debug("faces_summary=%s emb_summary=%s", faces_summary, emb_summary)
        if allow_fallback:
            try:
                logger.info('Attempting fallback DeepFace.represent on full image')
                emb_fb = DeepFace.represent(img_path=img, model_name='Facenet', enforce_detection=False)
                if isinstance(emb_fb, (int, float)) and emb_fb == 0:
                    raise ValueError('DeepFace.represent fallback returned numeric 0')
                logger.debug('fallback represent returned: %s', _summarize(emb_fb))
                # parse fallback
                if isinstance(emb_fb, (list, tuple)) and len(emb_fb) > 0 and isinstance(emb_fb[0], dict) and 'embedding' in emb_fb[0]:
                    vect = emb_fb[0]['embedding']
                elif isinstance(emb_fb, dict) and 'embedding' in emb_fb:
                    vect = emb_fb['embedding']
                else:
                    vect = emb_fb
                descriptor = [float(x) for x in np.array(vect).flatten().tolist()]
                used_fallback = True
            except Exception as e2:
                # fallback failed — try a quick preprocessing attempt (histogram equalize + resize) before final failure
                logger.exception("❌ Fallback extraction failed, trying preprocessing retry")
                try:
                    img_p = img.copy()
                    # ensure uint8
                    img_p = (np.clip(img_p, 0, 255)).astype('uint8')
                    # convert to YCrCb and equalize the Y channel
                    ycb = cv2.cvtColor(img_p, cv2.COLOR_BGR2YCrCb)
                    ycb[:, :, 0] = cv2.equalizeHist(ycb[:, :, 0])
                    img_p = cv2.cvtColor(ycb, cv2.COLOR_YCrCb2BGR)
                    # resize to a reasonable size to help small faces
                    h, w = img_p.shape[:2]
                    target = 640
                    if max(h, w) > target:
                        scale = target / max(h, w)
                        img_p = cv2.resize(img_p, (int(w * scale), int(h * scale)))
                    emb_retry = DeepFace.represent(img_path=img_p, model_name='Facenet', enforce_detection=False)
                    logger.debug('preprocess retry represent returned: %s', _summarize(emb_retry))
                    if isinstance(emb_retry, (list, tuple)) and len(emb_retry) > 0 and isinstance(emb_retry[0], dict) and 'embedding' in emb_retry[0]:
                        vect = emb_retry[0]['embedding']
                    elif isinstance(emb_retry, dict) and 'embedding' in emb_retry:
                        vect = emb_retry['embedding']
                    else:
                        vect = emb_retry
                    descriptor = [float(x) for x in np.array(vect).flatten().tolist()]
                    used_fallback = True
                except Exception:
                    logger.exception('Preprocessing retry also failed')
                    # Return 200 with structured failure payload (so the Java client doesn't throw on 400)
                    return jsonify({
                        'reason': 'descriptor_extraction_failed',
                        'descriptor': None,
                        'distance': None,
                        'similarity': None,
                        'matched': False,
                        'diagnostics': {
                            'faces_summary': faces_summary,
                            'emb_summary': emb_summary,
                            'savedFailPath': saved_fail_path,
                            'image_shape': getattr(img, 'shape', None),
                            'image_dtype': str(getattr(img, 'dtype', None))
                        },
                        'humanMessageVi': 'Không phát hiện khuôn mặt trong ảnh. Hãy đảm bảo ánh sáng tốt, đối diện camera và thử nháy mắt/xoay đầu nhẹ khi chụp lại.'
                    }), 200
        else:
            # Return 200 with structured failure payload (so the Java client doesn't throw on 400)
            return jsonify({
                'reason': 'descriptor_extraction_failed',
                'descriptor': None,
                'distance': None,
                'similarity': None,
                'matched': False,
                'diagnostics': {'faces': faces_summary, 'emb': emb_summary},
                'humanMessageVi': 'Không phát hiện khuôn mặt trong ảnh. Hãy đảm bảo ánh sáng tốt, đối diện camera và thử nháy mắt/xoay đầu nhẹ khi chụp lại.'
            }), 200

    # Liveness & motion calculation (simplified)
    try:
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)

        # compute entropy from histogram
        hist = cv2.calcHist([gray], [0], None, [256], [0, 256]).flatten()
        probs = hist / (hist.sum() + 1e-9)
        entropy = float(-np.sum([p * np.log(p + 1e-9) for p in probs]))

        blur_var = float(cv2.Laplacian(gray, cv2.CV_64F).var())
        mean_brightness = float(np.mean(gray) / 255.0)

        entropy_score = float(min(max((entropy / 5.0), 0.0), 1.0))
        quality_score = float(min(max((blur_var / 100.0), 0.0), 1.0))
        brightness_score = float(max(0.0, 1.0 - abs(mean_brightness - 0.5) * 2.0))

        # Motion: only use if we have a recent previous frame
        motion_score = 0.0
        use_motion = False
        now = time.time()
        with _motion_lock:
            if previous_frame is not None and (now - previous_frame_ts) < 1.5:
                try:
                    flow = cv2.calcOpticalFlowFarneback(previous_frame, gray, None, 0.5, 3, 15, 3, 5, 1.2, 0)
                    motion_score = float(np.mean(np.sqrt(flow[..., 0]**2 + flow[..., 1]**2)))
                    use_motion = True
                except Exception:
                    logger.debug('optical flow calc failed')
            # update frame and timestamp
            try:
                previous_frame = gray.copy()
            except Exception:
                previous_frame = gray
            previous_frame_ts = now

        if len(motion_history) >= 0:
            try:
                motion_history.append(motion_score if use_motion else 0.0)
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

        if use_motion:
            liveness_combined = 0.45 * entropy_score + 0.25 * motion_norm + 0.15 * quality_score + 0.15 * brightness_score
        else:
            liveness_combined = 0.6 * entropy_score + 0.2 * quality_score + 0.2 * brightness_score

        liveness_score = float(min(max(liveness_combined, 0.0), 1.0))
    except Exception as e:
        logger.warning(f"Liveness calc failed: {e}")
        liveness_score = 0.5
        motion_score = 0.0

    resp = {
        'descriptor': descriptor,
        'livenessScore': liveness_score,
        'motionScore': motion_score
    }
    if used_fallback:
        resp['usedFallback'] = True
        resp['warning'] = 'fallback_embedding_used'

    return jsonify(convert_to_native(resp))

if __name__ == '__main__':
    print("✅ DeepFace AI server running at http://localhost:5001")
    app.run(host='0.0.0.0', port=5001)
