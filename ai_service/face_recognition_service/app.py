from flask import Flask, request, jsonify
import numpy as np
import base64
import cv2
import io
from PIL import Image
import logging
import os
import threading

# base dir for saving debug files
BASE_DIR = os.path.dirname(__file__)

# detector availability flags (defaults)
INSIGHTFACE_AVAILABLE = False
RETINAFACE_AVAILABLE = False
MTCNN_AVAILABLE = False

# --- Optional libs ---
try:
    from insightface.app import FaceAnalysis
    INSIGHTFACE_AVAILABLE = True
except Exception:
    INSIGHTFACE_AVAILABLE = False

try:
    import faiss
    FAISS_AVAILABLE = True
except Exception:
    FAISS_AVAILABLE = False

try:
    from skimage.feature import local_binary_pattern
    SKIMAGE_AVAILABLE = True
except Exception:
    SKIMAGE_AVAILABLE = False

# --- Flask app ---
app = Flask(__name__)
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Enable CORS (prefer flask_cors if installed, otherwise set headers in after_request)
try:
    from flask_cors import CORS
    CORS(app, resources={r"/*": {"origins": "*"}})
    logger.info('CORS enabled via flask_cors')
except Exception:
    logger.warning('flask_cors not installed, will add CORS headers in after_request')

# --- Helpers ---
def decode_image(b64: str):
    if not b64:
        raise ValueError("empty_image")
    if b64.startswith("data:image"):
        b64 = b64.split(",")[1]
    b = base64.b64decode(b64)
    img = Image.open(io.BytesIO(b)).convert("RGB")
    return np.array(img)[:, :, ::-1]  # RGB -> BGR

def l2_normalize(vec: np.ndarray):
    norm = np.linalg.norm(vec)
    if norm == 0:
        return vec
    return vec / norm

def make_json_serializable(obj):
    if obj is None:
        return None
    if isinstance(obj, (str, bool, int, float)):
        return obj
    if isinstance(obj, np.ndarray):
        return obj.tolist()
    if isinstance(obj, dict):
        return {str(k): make_json_serializable(v) for k, v in obj.items()}
    if isinstance(obj, (list, tuple)):
        return [make_json_serializable(v) for v in obj]
    return str(obj)

# --- InsightFace Model ---
INSIGHTFACE_READY = False
detector = None
embedder = None
# embedding dimension: default 128 to match backend expectations; override with EMBEDDING_DIM env var
embed_dim = int(os.environ.get('EMBEDDING_DIM', '128'))
# allow forcing placeholder embeddings via env
PLACEHOLDER_EMBEDDING = str(os.environ.get('PLACEHOLDER_EMBEDDING', '')).lower() in ('1','true','yes')

def init_models():
    global detector, embedder, INSIGHTFACE_READY
    if INSIGHTFACE_AVAILABLE:
        try:
            app_ins = FaceAnalysis(name="buffalo_l", providers=["CPUExecutionProvider"])
            logger.info("Preparing InsightFace model...")
            app_ins.prepare(ctx_id=-1, det_size=(640, 640))
            detector = app_ins
            embedder = app_ins
            INSIGHTFACE_READY = True
            logger.info("✅ InsightFace ready")
        except Exception as e:
            logger.error("InsightFace init failed: %s", e)
            INSIGHTFACE_READY = False

init_models()

# --- Face detection & embedding ---
def detect_face_boxes(img: np.ndarray):
    if not INSIGHTFACE_READY:
        return []
    try:
        faces = detector.get(img)
        out = []
        for f in faces:
            if f.bbox is None:
                continue
            x1, y1, x2, y2 = map(int, f.bbox)
            crop = img[max(0, y1):y2, max(0, x1):x2]
            out.append({"face": crop, "bbox": (x1, y1, x2, y2), "kps": getattr(f, "kps", None)})
        return out
    except Exception as e:
        logger.exception("detect_face_boxes failed: %s", e)
        return []

def embed_face(face_img: np.ndarray):
    try:
        if INSIGHTFACE_READY and embedder is not None:
            arr = embedder.get(np.asarray(face_img))
            if isinstance(arr, (list, tuple)) and len(arr) > 0 and hasattr(arr[0], "embedding"):
                vec = np.array(arr[0].embedding, dtype="float32")
                return l2_normalize(vec).tolist()
            else:
                logger.warning("InsightFace returned empty embedding")
        # fallback to placeholder embedding when no real model available or model failed
        if PLACEHOLDER_EMBEDDING or not INSIGHTFACE_READY:
            return _placeholder_embedding_from_image(face_img)
        return None
    except Exception as e:
        logger.exception("embed_face failed: %s", e)
        # fallback
        return _placeholder_embedding_from_image(face_img)


def _placeholder_embedding_from_image(face_img: np.ndarray):
    try:
        gray = cv2.cvtColor(face_img, cv2.COLOR_BGR2GRAY)
        base_size = 32
        small = cv2.resize(gray, (base_size, base_size)).astype('float32') / 255.0
        d = cv2.dct(small)
        flat = d.flatten()
        coeffs = flat[:embed_dim]
        if coeffs.shape[0] < embed_dim:
            coeffs = np.pad(coeffs, (0, embed_dim - coeffs.shape[0]), 'constant')
        vec = np.array(coeffs, dtype='float32')
        return l2_normalize(vec).tolist()
    except Exception as e:
        logger.warning('placeholder embedding failed: %s', e)
        return np.zeros(embed_dim, dtype='float32').tolist()

# --- Liveness ---
def compute_lbp_score(gray_face: np.ndarray):
    try:
        if SKIMAGE_AVAILABLE:
            lbp = local_binary_pattern(gray_face, P=8, R=1, method="uniform")
            hist, _ = np.histogram(lbp.ravel(), bins=np.arange(0, 10), range=(0, 9))
            hist = hist.astype("float")
            hist /= (hist.sum() + 1e-9)
            score = -np.sum([p * np.log(p + 1e-9) for p in hist])
            return float(min(max(score / 3.0, 0.0), 1.0))
        else:
            var = float(cv2.Laplacian(gray_face, cv2.CV_64F).var())
            return float(min(max(var / 100.0, 0.0), 1.0))
    except Exception as e:
        logger.warning("LBP score failed: %s", e)
        return 0.5

def simple_liveness_checks(img, kps=None):
    try:
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        lbp_score = compute_lbp_score(gray)
        # Try a cheap Haar-eye detector to guess if eyes are visible (helps single-frame liveness in dev)
        blink_score = 0.0
        try:
            eye_cascade_path = cv2.data.haarcascades + 'haarcascade_eye.xml'
            if os.path.exists(eye_cascade_path):
                eye_cascade = cv2.CascadeClassifier(eye_cascade_path)
                eyes = eye_cascade.detectMultiScale(gray, scaleFactor=1.1, minNeighbors=3, minSize=(10,10))
                # if eyes detected, set a higher blink/eye-open score
                if len(eyes) >= 1:
                    blink_score = 1.0
        except Exception as e:
            logger.debug('eye cascade check failed: %s', e)
        combined = 0.5 * lbp_score + 0.5 * blink_score
        return float(min(max(combined, 0.0), 1.0)), float(lbp_score), float(blink_score)
    except Exception as e:
        logger.warning("simple_liveness_checks failed: %s", e)
        return 0.5, 0.5, 0.0

# --- API Endpoints ---
@app.route("/extract", methods=["POST"])
def extract():
    data = request.get_json() or {}
    img_b64 = data.get("imageBase64")
    try:
        img = decode_image(img_b64)
    except Exception as e:
        return jsonify({"error": "invalid_image", "message": str(e)}), 400

    # Debug: save incoming image so developer can inspect when detections fail
    try:
        debug_path = os.path.join(BASE_DIR, 'debug_last_incoming.jpg')
        # re-create bytes from base64 (support data: URI)
        try:
            raw_b64 = img_b64.split(',')[1] if img_b64.startswith('data:image') else img_b64
        except Exception:
            raw_b64 = img_b64
        with open(debug_path, 'wb') as f:
            f.write(base64.b64decode(raw_b64))
        logger.info('Saved debug incoming image to %s (shape=%s)', debug_path, getattr(img, 'shape', None))
    except Exception as ex:
        logger.warning('Failed to write debug incoming image: %s', ex)

    # Primary detectors
    faces = detect_face_boxes(img)
    # If primary detectors found nothing, try an OpenCV Haar-cascade fallback which sometimes
    # catches frontal faces missed by other detectors (useful for debugging on small images)
    if not faces:
        try:
            logger.info('Primary detectors found no faces; trying Haar cascade fallback (insight=%s,retina=%s,mtcnn=%s)', INSIGHTFACE_AVAILABLE, RETINAFACE_AVAILABLE, MTCNN_AVAILABLE)
            cascade_path = cv2.data.haarcascades + 'haarcascade_frontalface_default.xml'
            if os.path.exists(cascade_path):
                cascade = cv2.CascadeClassifier(cascade_path)
                gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
                rects = cascade.detectMultiScale(gray, scaleFactor=1.1, minNeighbors=4, minSize=(30, 30))
                out = []
                for (x, y, w, h) in rects:
                    crop = img[max(0, y):y + h, max(0, x):x + w]
                    out.append({'face': crop, 'bbox': (int(x), int(y), int(x + w), int(y + h)), 'kps': None})
                if out:
                    faces = out
                    logger.info('Haar fallback found %d face(s)', len(out))
        except Exception as ex:
            logger.warning('Haar cascade fallback failed: %s', ex)

    if not faces:
        return jsonify({'reason': 'no_face_detected', 'descriptor': None}), 200

    results = []
    for face_entry in faces:  # handle multiple faces
        face_crop = face_entry["face"]
        descriptor = embed_face(face_crop)
        liveness_score, lbp_score, blink_score = simple_liveness_checks(face_crop, face_entry.get("kps"))
        results.append({
            "descriptor": descriptor,
            "bbox": face_entry.get("bbox"),
            # Provide multiple aliases so backend heuristic detector can consume
            "livenessScore": liveness_score,
            "liveness": liveness_score,
            "lbp": lbp_score,
            "blink": blink_score,
            "blinkProb": blink_score,
            # yawDelta not computed here; provide placeholder so backend doesn't see null
            "yawDelta": -1.0
        })

    return jsonify({"faces": results})

@app.route("/analyze", methods=["POST"])
def analyze():
    data = request.get_json() or {}
    img_b64 = data.get("imageBase64")
    try:
        img = decode_image(img_b64)
    except Exception as e:
        return jsonify({"error": "invalid_image", "message": str(e)}), 400
    # Use same primary detectors + Haar fallback as /extract so analyze behaves consistently
    faces = detect_face_boxes(img)
    if not faces:
        try:
            logger.info('Analyze: primary detectors found no faces; trying Haar cascade fallback')
            cascade_path = cv2.data.haarcascades + 'haarcascade_frontalface_default.xml'
            if os.path.exists(cascade_path):
                cascade = cv2.CascadeClassifier(cascade_path)
                gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
                rects = cascade.detectMultiScale(gray, scaleFactor=1.1, minNeighbors=4, minSize=(30, 30))
                out = []
                for (x, y, w, h) in rects:
                    crop = img[max(0, y):y + h, max(0, x):x + w]
                    out.append({'face': crop, 'bbox': (int(x), int(y), int(x + w), int(y + h)), 'kps': None})
                if out:
                    faces = out
                    logger.info('Analyze Haar fallback found %d face(s)', len(out))
        except Exception as ex:
            logger.warning('Analyze Haar fallback failed: %s', ex)

    if not faces:
        return jsonify({"detection": {"ok": False}, "liveness": {"ok": False}})

    results = []
    for face_entry in faces:
        face_crop = face_entry["face"]
        kps = make_json_serializable(face_entry.get("kps"))
        detection_result = {"ok": True, "bbox": face_entry.get("bbox"), "kps": kps}
        liveness_score, lbp_score, blink_score = simple_liveness_checks(face_crop, kps)
        # include aliases expected by backend heuristics
        liveness_result = {"ok": True, "score": liveness_score, "livenessScore": liveness_score, "lbp": lbp_score, "blink": blink_score, "blinkProb": blink_score, "yawDelta": -1.0}
        results.append({"detection": detection_result, "liveness": liveness_result})

    # Backwards-compatible top-level fields for single-face clients
    out = {"faces": results}
    if len(results) > 0:
        out["detection"] = results[0]["detection"]
        out["liveness"] = results[0]["liveness"]
    else:
        out["detection"] = {"ok": False}
        out["liveness"] = {"ok": False}

    return jsonify(out)

@app.route("/health", methods=["GET"])
def health():
    return jsonify({
        "ok": True,
        "insightface": INSIGHTFACE_READY,
        "faiss": FAISS_AVAILABLE
    })


    @app.after_request
    def _add_cors_headers(response):
        # Always add CORS headers as a fallback (safe for local dev).
        response.headers.setdefault('Access-Control-Allow-Origin', '*')
        response.headers.setdefault('Access-Control-Allow-Methods', 'GET,POST,OPTIONS')
        response.headers.setdefault('Access-Control-Allow-Headers', 'Content-Type,Authorization')
        return response

if __name__ == "__main__":
    logger.info("✅ Face service starting on http://0.0.0.0:5001")
    app.run(host="0.0.0.0", port=5001)
