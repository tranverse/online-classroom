from deepface import DeepFace

# Thử lấy embedding trực tiếp
embedding = DeepFace.represent("test_face.jpg", model_name="ArcFace", enforce_detection=False)
print(embedding)