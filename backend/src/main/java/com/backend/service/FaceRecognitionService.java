package com.backend.service;

import java.nio.charset.StandardCharsets;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Base64;
import java.util.List;
import java.util.Map;

import com.fasterxml.jackson.core.type.TypeReference;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import com.backend.anti.FakeDetector;
import com.backend.model.FaceEmbedding;
import com.backend.repository.FaceEmbeddingRepository;
import com.backend.util.CryptoUtil;
import com.backend.util.FaceUtils;

@Service
public class FaceRecognitionService {
    private final FaceEmbeddingRepository faceEmbeddingRepository;
    private final FakeDetector fakeDetector;
    private static final Logger log = LoggerFactory.getLogger(FaceRecognitionService.class);

    @Value("${app.face.similarity.threshold:0.6}")
    private double similarityThreshold;

    @Value("${app.face.liveness.threshold:0.5}")
    private double livenessThreshold;

    @Value("${EMBEDDING_ENCRYPTION_KEY:}")
    private String encryptionKeyBase64;

    @Autowired
    public FaceRecognitionService(FaceEmbeddingRepository faceEmbeddingRepository, FakeDetector fakeDetector) {
        this.faceEmbeddingRepository = faceEmbeddingRepository;
        this.fakeDetector = fakeDetector;
    }

    // expose similarity threshold for other components
    public double getSimilarityThreshold() {
        return similarityThreshold;
    }

    // expose liveness threshold for other components
    public double getLivenessThreshold() {
        return livenessThreshold;
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
            // Heuristic: if the input is long or contains typical base64 markers, treat as image
            boolean looksLikeBase64Image = s.length() > 200 || s.contains("/9j/") || s.contains("data:image");

            // If it looks like an image, call external AI extractor immediately
            if (looksLikeBase64Image) {
                try {
                    String aiUrl = System.getenv().getOrDefault("AI_SERVICE_URL", "http://localhost:5001/extract");
                    RestTemplate rt = new RestTemplate();
                    HttpHeaders headers = new HttpHeaders();
                    headers.setContentType(MediaType.APPLICATION_JSON);
                    java.util.Map<String, String> payload = java.util.Map.of("imageBase64", s);
                    HttpEntity<java.util.Map<String, String>> req = new HttpEntity<>(payload, headers);
                    ResponseEntity<String> resp = rt.postForEntity(aiUrl, req, String.class);
                    if (resp.getStatusCode().is2xxSuccessful() && resp.getBody() != null) {
                        log.info("AI service response body: {}", resp.getBody());
                        com.fasterxml.jackson.databind.ObjectMapper mapper = new com.fasterxml.jackson.databind.ObjectMapper();
                        com.fasterxml.jackson.core.type.TypeReference<java.util.Map<String,Object>> tr = new com.fasterxml.jackson.core.type.TypeReference<java.util.Map<String,Object>>(){};
                        java.util.Map<String,Object> m = mapper.readValue(resp.getBody(), tr);

                        Object facesObj = m.get("faces");
                        if (facesObj instanceof List && !((List<?>)facesObj).isEmpty()) {
                            Map<String,Object> face0 = (Map<String,Object>) ((List<?>)facesObj).get(0);
                            Object descObj = face0.get("descriptor");
                            if (descObj != null) {
                                List<Double> descriptor = mapper.convertValue(descObj, new TypeReference<List<Double>>() {});
                                // Trim nếu cần
                                if (descriptor.size() == 512) {
                                    descriptor = descriptor.subList(0, 128);
                                }
                                return descriptor;
                            }
                        }

                    }
                } catch (Exception ex) {
                    log.warn("AI extract failed", ex);
                }
                // if AI extraction failed, fallthrough to legacy parsing attempts
            }

            // If we reach here, the input did not look like a base64 image (or AI extraction failed)
            // Try parsing a raw JSON array (legacy client behavior)
            if (s.startsWith("[")) {
                try {
                    double[] arr = fromJson(s);
                    java.util.List<Double> out = new java.util.ArrayList<>(arr.length);
                    for (double v : arr) out.add(v);
                    return out;
                } catch (Exception ex) {
                    // fallthrough to attempt base64-decoded JSON
                }
            }

            // maybe it is base64-encoded JSON array (legacy clients). Try decode once.
            try {
                if (s.matches("^[A-Za-z0-9+/=\\r\\n]+$")) {
                    byte[] decoded = Base64.getDecoder().decode(s);
                    String dec = new String(decoded, StandardCharsets.UTF_8).trim();
                    if (dec.startsWith("[")) {
                        double[] arr = fromJson(dec);
                        java.util.List<Double> out = new java.util.ArrayList<>(arr.length);
                        for (double v : arr) out.add(v);
                        return out;
                    }
                }
            } catch (Exception ex) {
                // ignore and return empty
            }

            // Fallback: call external AI service /extract to obtain real embeddings
            try {
                String aiUrl = System.getenv().getOrDefault("AI_SERVICE_URL", "http://localhost:5001/extract");
                RestTemplate rt = new RestTemplate();
                HttpHeaders headers = new HttpHeaders();
                headers.setContentType(MediaType.APPLICATION_JSON);
                java.util.Map<String, String> payload = java.util.Map.of("imageBase64", s);
                HttpEntity<java.util.Map<String, String>> req = new HttpEntity<>(payload, headers);
                ResponseEntity<String> resp = rt.postForEntity(aiUrl, req, String.class);
                if (resp.getStatusCode().is2xxSuccessful() && resp.getBody() != null) {
                    log.info("AI service response body: {}", resp.getBody());
                    com.fasterxml.jackson.databind.ObjectMapper mapper = new com.fasterxml.jackson.databind.ObjectMapper();
                    com.fasterxml.jackson.core.type.TypeReference<java.util.Map<String,Object>> tr = new com.fasterxml.jackson.core.type.TypeReference<java.util.Map<String,Object>>(){};
                    java.util.Map<String,Object> m = mapper.readValue(resp.getBody(), tr);
                    Object descObj = m.get("descriptor");
                    if (descObj != null) {
    // Sau khi lấy descriptor từ AI service
                        java.util.List<Double> descriptor = mapper.convertValue(descObj, new com.fasterxml.jackson.core.type.TypeReference<java.util.List<Double>>(){});
                        if (descriptor != null) {
                            log.info("Parsed descriptor length from AI: {}", descriptor.size());

                            // If AI returns 512-d descriptors but the rest of the system expects 128-d,
                            // trim to the first 128 elements for backward compatibility.
                            if (descriptor.size() == 512) {
                                log.info("Trimming descriptor from 512 -> 128 for backward compatibility");
                                descriptor = descriptor.subList(0, 128);
                            } else if (descriptor.size() != 128) {
                                log.warn("Descriptor length unexpected ({}). Expected 128 or 512.", descriptor.size());
                            }
                        }
                        return descriptor;

                    }
                }
            } catch (Exception ex) {
                // ignore and return empty
                log.warn("AI extract failed", ex);
            }

            return java.util.Collections.emptyList();
        }
}

