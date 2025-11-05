package com.backend.service;

import java.nio.charset.StandardCharsets;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Base64;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Collectors;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import com.backend.anti.FakeDetector;
import com.backend.model.FaceEmbedding;
import com.backend.repository.FaceEmbeddingRepository;
import com.backend.util.CryptoUtil;
import com.backend.util.FaceUtils;

@Service
public class FaceRecognitionService {
    private final FaceEmbeddingRepository faceEmbeddingRepository;
    private final FakeDetector fakeDetector;

    @Value("${app.face.similarity.threshold:0.6}")
    private double similarityThreshold;

    @Value("${EMBEDDING_ENCRYPTION_KEY:}")
    private String encryptionKeyBase64;

    @Autowired
    public FaceRecognitionService(FaceEmbeddingRepository faceEmbeddingRepository, FakeDetector fakeDetector) {
        this.faceEmbeddingRepository = faceEmbeddingRepository;
        this.fakeDetector = fakeDetector;
    }

    public Map<String, Object> randomChallenge() {
        String[] opts = new String[] {"blink", "turn_left", "turn_right", "open_mouth"};
        String c = opts[new java.util.Random().nextInt(opts.length)];
        return java.util.Collections.singletonMap("challenge", c);
    }

    public void saveEmbedding(String studentId, String classroomId, double[] embedding) throws Exception {
        FaceEmbedding fe = new FaceEmbedding();
        fe.setStudentId(studentId);
        fe.setClassroomId(classroomId);
        String json = toJson(embedding);
        if (encryptionKeyBase64 != null && !encryptionKeyBase64.isBlank()) {
            fe.setEncryptedEmbedding(CryptoUtil.encrypt(encryptionKeyBase64, json.getBytes(StandardCharsets.UTF_8)));
        } else {
            fe.setEncryptedEmbedding(Base64.getEncoder().encodeToString(json.getBytes(StandardCharsets.UTF_8)));
        }
        fe.setCreatedAt(LocalDateTime.now());
        faceEmbeddingRepository.save(fe);
    }

    public List<double[]> loadEmbeddingsForClassroom(String classroomId) {
        List<FaceEmbedding> list = faceEmbeddingRepository.findAllByClassroomId(classroomId);
        List<double[]> out = new ArrayList<>();
        for (FaceEmbedding fe : list) {
            try {
                String stored = fe.getEncryptedEmbedding();
                byte[] raw;
                if (encryptionKeyBase64 != null && !encryptionKeyBase64.isBlank()) {
                    raw = CryptoUtil.decrypt(encryptionKeyBase64, stored);
                } else {
                    raw = Base64.getDecoder().decode(stored);
                }
                String json = new String(raw, StandardCharsets.UTF_8);
                out.add(fromJson(json));
            } catch (Exception ex) {
                // ignore malformed
            }
        }
        return out;
    }

    public boolean verify(double[] probe, List<double[]> gallery) {
        for (double[] g : gallery) {
            double sim = FaceUtils.cosineSimilarity(probe, g);
            if (sim >= similarityThreshold) return true;
        }
        return false;
    }

    public Map<String, Object> validateLiveness(Map<String, Object> challengeMetrics) {
        return fakeDetector.validate(challengeMetrics);
    }

    private static String toJson(double[] arr) {
        StringBuilder sb = new StringBuilder();
        sb.append('[');
        for (int i = 0; i < arr.length; i++) {
            if (i > 0) sb.append(',');
            sb.append(arr[i]);
        }
        sb.append(']');
        return sb.toString();
    }

    private static double[] fromJson(String json) {
        String t = json.trim();
        if (t.startsWith("[")) t = t.substring(1);
        if (t.endsWith("]")) t = t.substring(0, t.length()-1);
        String[] parts = t.split(",");
        double[] out = new double[parts.length];
        for (int i = 0; i < parts.length; i++) out[i] = Double.parseDouble(parts[i]);
        return out;
    }

    // Accept either a raw JSON array string like "[0.1,0.2,...]" or a base64 encoded JSON payload
    // Return descriptor as a List<Double> for compatibility with older services.
    public java.util.List<Double> extractDescriptor(String imageBase64OrJson) {
        if (imageBase64OrJson == null) return java.util.Collections.emptyList();
        String s = imageBase64OrJson.trim();
        // if looks like base64, try decode
        try {
            // heuristics: contains only base64 chars and no brackets
            if (!s.startsWith("[") && s.matches("^[A-Za-z0-9+/=\\r\\n]+$") ) {
                byte[] decoded = Base64.getDecoder().decode(s);
                s = new String(decoded, StandardCharsets.UTF_8).trim();
            }
        } catch (Exception ex) {
            // fallback to original string
        }

        // now expect s to be a JSON array like [0.1,0.2,...]
        try {
            double[] arr = fromJson(s);
            java.util.List<Double> out = new java.util.ArrayList<>(arr.length);
            for (double v : arr) out.add(v);
            return out;
        } catch (Exception ex) {
            return java.util.Collections.emptyList();
        }
    }
}

