import traceback
import numpy as np
from deepface import DeepFace
import sys

print('python executable=', sys.executable)
try:
    import deepface
    print('deepface version=', getattr(deepface,'__version__','unknown'))
except Exception as e:
    print('deepface import error', e)

arr = np.zeros((200,200,3),dtype='uint8')
print('calling extract_faces on blank array...')
try:
    faces = DeepFace.extract_faces(img_path=arr, detector_backend='retinaface', enforce_detection=False)
    print('extract_faces returned type=', type(faces), 'repr=', repr(faces)[:400])
except Exception as e:
    print('extract_faces raised:', repr(e))
    traceback.print_exc()

print('calling represent on blank array...')
try:
    emb = DeepFace.represent(img_path=arr, model_name='Facenet', enforce_detection=False)
    print('represent returned type=', type(emb), 'repr=', repr(emb)[:400])
except Exception as e:
    print('represent raised:', repr(e))
    traceback.print_exc()
