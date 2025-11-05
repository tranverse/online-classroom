#!/usr/bin/env bash
set -euo pipefail
mkdir -p public/models
BASE=https://raw.githubusercontent.com/justadudewhohacks/face-api.js/master/weights
FILES=(
  face_landmark_68_model-weights_manifest.json
  face_recognition_model-weights_manifest.json
  ssd_mobilenetv1_model-weights_manifest.json
)
for f in "${FILES[@]}"; do
  curl -L "$BASE/$f" -o "public/models/$f"
done
echo "Downloaded models to public/models"
