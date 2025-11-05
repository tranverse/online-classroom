from flask import Flask, request, jsonify
import base64
import hashlib
import struct
import math

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


@app.route('/extract', methods=['POST'])
def extract():
    # Return a deterministic pseudo-descriptor (128 floats) and liveness
    data = request.get_json() or {}
    img_b64 = data.get('imageBase64', '')
    try:
        b = base64.b64decode(img_b64)
    except Exception:
        b = b''
    h = hashlib.sha256(b).digest()
    # create 128 floats from hash by repeating and mixing
    descriptor = []
    for i in range(128):
        # use two bytes from hash, wrap around
        a = h[i % len(h)]
        b2 = h[(i + 7) % len(h)]
        # combine into a float in range -1..1
        val = ((a << 8) | b2) & 0xFFFF
        f = (val / 65535.0) * 2.0 - 1.0
        # small sinusoid to add variety
        f = f * math.sin((i + 1) * 0.1)
        descriptor.append(round(f, 6))

    # liveness same as analyze heuristic
    sim_hash = int(hashlib.sha256(b).hexdigest()[-2:], 16) / 255.0
    liv_hash = int(hashlib.sha256(b).hexdigest()[:2], 16) / 255.0

    return jsonify({
        'descriptor': descriptor,
        'livenessScore': round(liv_hash, 4),
        'similarity': round(sim_hash, 4)
    })

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5001)
