# Face Recognition Microservice (demo)

This microservice provides a simple deterministic face-analysis API.

POST /analyze

- Request JSON: { "imageBase64": "..." }
- Response JSON: { matched: bool, similarity: float, livenessScore: float }

This is a demo stub. Replace the algorithm with a production model (FaceNet, ArcFace, or a commercial API).

Run:

```bash
python -m venv .venv; .\.venv\Scripts\activate; pip install -r requirements.txt; python app.py
```
