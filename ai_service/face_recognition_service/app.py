from flask import Flask, request, jsonify
import base64
import hashlib

app = Flask(__name__)

# Very small demo: compute deterministic similarity and liveness from image bytes
@app.route('/analyze', methods=['POST'])
def analyze():
    data = request.get_json() or {}
    img_b64 = data.get('imageBase64', '')
    try:
        b = base64.b64decode(img_b64)
    except Exception:
        b = b''
    h = hashlib.sha256(b).hexdigest()
    # similarity: take last two hex digits -> 0..255 -> normalize
    sim = int(h[-2:], 16) / 255.0
    # liveness: use first two hex digits
    liv = int(h[:2], 16) / 255.0
    matched = sim > 0.45 and liv > 0.2
    return jsonify({
        'matched': matched,
        'similarity': round(sim, 4),
        'livenessScore': round(liv, 4)
    })

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5001)
