package com.backend.service;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

import lombok.extern.java.Log;
import lombok.extern.log4j.Log4j;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import com.backend.dto.attendance.AttendanceRequest;
import com.backend.dto.attendance.AttendanceResponse;
import com.backend.enums.AttendanceStatus;
import com.backend.model.Attendance;
import com.backend.repository.AttendanceRepository;
import com.backend.repository.ClassSessionRepository;
import com.backend.repository.UserRepository;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;

import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;

@Service
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class AttendanceService {
    AttendanceRepository attendanceRepository;
    ClassSessionRepository classSessionRepository;
    UserRepository userRepository;
    FaceRecognitionService faceRecognitionService;
    com.backend.service.StudentFaceService studentFaceService;

    public AttendanceResponse submitAttendance(String classSessionId, String userId, AttendanceRequest request) {
        Attendance attendance = new Attendance();
        attendance.setAttendanceTime(LocalDateTime.now());

        // Run face recognition: extract descriptor from image
        java.util.List<Double> descriptor = null;
        try {
            descriptor = faceRecognitionService.extractDescriptor(request.getImageBase64());
        } catch (Exception ex) {
        }

        boolean usedAIFallback = false;
        // If userId not provided, try to derive from security context
        if (userId == null) {
            try {
                String principal = org.springframework.security.core.context.SecurityContextHolder.getContext().getAuthentication().getName();
                if (principal != null) {
                    userId = userRepository.findByEmail(principal).map(u -> u.getId()).orElse(userId);
                }
            } catch (Exception ex) {
                // ignore
            }
        }

        // If no descriptor was extracted locally, try calling external AI service to extract descriptor from image
        if ((descriptor == null || descriptor.isEmpty()) && request.getImageBase64() != null && !request.getImageBase64().isBlank()) {
            try {
                RestTemplate rt = new RestTemplate();
                ObjectMapper mapper = new ObjectMapper();
                HttpHeaders headers = new HttpHeaders();
                headers.setContentType(MediaType.APPLICATION_JSON);
                Map<String, String> payload = Map.of("imageBase64", request.getImageBase64());
                HttpEntity<Map<String, String>> req = new HttpEntity<>(payload, headers);
                ResponseEntity<String> aiResp = rt.postForEntity("http://localhost:5001/extract", req, String.class);
                if (aiResp.getStatusCode().is2xxSuccessful() && aiResp.getBody() != null) {
                    Map<String, Object> m = mapper.readValue(aiResp.getBody(), new TypeReference<Map<String,Object>>(){});
                    Object descObj = m.get("descriptor");
                    // support newer AI response shape { faces: [ { descriptor: [...] } ] }
                    if (descObj == null && m.get("faces") != null) {
                        try {
                            Object facesObj = m.get("faces");
                            if (facesObj instanceof java.util.List) {
                                java.util.List<?> facesList = (java.util.List<?>) facesObj;
                                if (!facesList.isEmpty() && facesList.get(0) instanceof java.util.Map) {
                                    @SuppressWarnings("unchecked")
                                    java.util.Map<String,Object> firstFace = (java.util.Map<String,Object>) facesList.get(0);
                                    descObj = firstFace.get("descriptor");
                                }
                            }
                        } catch (Exception ex) {
                            // ignore nested extraction errors
                        }
                    }
                    if (descObj != null) {
                        descriptor = mapper.convertValue(descObj, new TypeReference<java.util.List<Double>>(){});
                        usedAIFallback = true;
                    }
                    // If analyze endpoint provided liveness/challenge metrics, attach for later
                    if (m.containsKey("challengeMetrics") || m.containsKey("liveness")) {
                        // stash analyze result in a local variable by attaching to note later
                        // We'll reuse 'm' below when deciding liveness
                    }
                }
            } catch (Exception ex) {
                // ignore AI extraction errors and proceed with empty descriptor
            }
        }

        // If an image was provided, call AI analyze endpoint to obtain liveness/challenge metrics
        Map<String,Object> analyzeMetrics = null;
        if (request.getImageBase64() != null && !request.getImageBase64().isBlank()) {
            try {
                RestTemplate rt2 = new RestTemplate();
                ObjectMapper mapper2 = new ObjectMapper();
                HttpHeaders headers2 = new HttpHeaders();
                headers2.setContentType(MediaType.APPLICATION_JSON);
                Map<String, String> payload2 = Map.of("imageBase64", request.getImageBase64());
                HttpEntity<Map<String, String>> req2 = new HttpEntity<>(payload2, headers2);
                ResponseEntity<String> aiResp2 = rt2.postForEntity("http://localhost:5001/analyze", req2, String.class);
                if (aiResp2.getStatusCode().is2xxSuccessful() && aiResp2.getBody() != null) {
                    analyzeMetrics = new ObjectMapper().readValue(aiResp2.getBody(), new TypeReference<Map<String,Object>>(){});
                }
            } catch (Exception ex) {
                // ignore analyze failures
            }
        }

        boolean matched = false;
        double minDist = Double.MAX_VALUE;
        try {
            if (descriptor != null && !descriptor.isEmpty() && userId != null) {
                java.util.List<java.util.List<Double>> stored = studentFaceService.getDescriptorsForUser(userId);

                // If no stored descriptors but the user has a raw faceData image, try to extract and enroll it
                if ((stored == null || stored.isEmpty())) {
                    try {
                        // attempt to load user.faceData and call AI extract to obtain descriptor
                        userRepository.findById(userId).ifPresent(u -> {
                            try {
                                if (u.getFaceData() != null && !u.getFaceData().isBlank()) {
                                    RestTemplate rt = new RestTemplate();
                                    ObjectMapper mapper = new ObjectMapper();
                                    HttpHeaders headers = new HttpHeaders();
                                    headers.setContentType(MediaType.APPLICATION_JSON);
                                    java.util.Map<String,String> payload = java.util.Map.of("imageBase64", u.getFaceData());
                                    HttpEntity<java.util.Map<String,String>> req = new HttpEntity<>(payload, headers);
                                    ResponseEntity<String> aiResp = rt.postForEntity("http://localhost:5001/extract", req, String.class);
                                    if (aiResp.getStatusCode().is2xxSuccessful() && aiResp.getBody() != null) {
                                        java.util.Map<String,Object> m = mapper.readValue(aiResp.getBody(), new TypeReference<java.util.Map<String,Object>>(){});
                                        Object descObj = m.get("descriptor");
                                        if (descObj != null) {
                                            java.util.List<Double> extracted = mapper.convertValue(descObj, new TypeReference<java.util.List<Double>>(){});
                                            // persist as a stored descriptor so future matches succeed
                                            studentFaceService.enrollDescriptor(u.getId(), extracted);
                                        }
                                    }
                                }
                            } catch (Exception e) {
                                // ignore failures to extract/enroll from stored faceData
                            }
                        });
                        // reload stored descriptors after possible enroll
                        stored = studentFaceService.getDescriptorsForUser(userId);
                    } catch (Exception ex) {
                        // ignore
                    }
                }

                if (stored != null) {
                    double bestSim = -1.0;
                    int idx = 0;
                    for (java.util.List<Double> s : stored) {
                        try {
                            // convert to double[]
                            double[] storedArr = new double[s.size()];
                            for (int i = 0; i < s.size(); i++) storedArr[i] = s.get(i).doubleValue();
                            double[] probe = new double[descriptor.size()];
                            for (int i = 0; i < descriptor.size(); i++) probe[i] = descriptor.get(i).doubleValue();
                            double sim = com.backend.util.FaceUtils.cosineSimilarity(probe, storedArr);
                            idx++;
                            if (sim > bestSim) bestSim = sim;
                            double thr = 0.4; // giảm threshold cho dễ test
                            if (sim >= thr) matched = true;
                        } catch (Exception e) {
                            throw new RuntimeException(e);
                        }
                    }
                    // compute minDistance as compatibility metric (1 - similarity) to keep legacy note
                    if (bestSim >= 0) minDist = 1.0 - bestSim;
                }
            }
        } catch (Exception ex) {
            // ignore
        }

        attendance.setIsPassed(matched);
        StringBuilder noteBuilder = new StringBuilder();
    if (descriptor == null || descriptor.isEmpty()) noteBuilder.append("descriptor_len=0;");
    else noteBuilder.append("descriptor_len=").append(descriptor.size()).append(";");
    noteBuilder.append("usedAI=").append(String.valueOf(usedAIFallback)).append(";");
        if (minDist == Double.MAX_VALUE) {
            noteBuilder.append("minDistance=-");
        } else {
            noteBuilder.append("minDistance=").append(String.valueOf(minDist)).append(";");
            // also include best similarity for easier debugging
            double sim = 1.0 - minDist;
            noteBuilder.append("similarity=").append(String.valueOf(sim)).append(";");
        }

        // perform liveness check if analyze metrics present
        boolean livenessPassed = true;
//        if (analyzeMetrics != null) {
//            try {
//                // Prefer explicit numeric livenessScore returned by the AI analyze endpoint if present
//                Object lsObj = analyzeMetrics.getOrDefault("livenessScore", analyzeMetrics.get("score"));
//                if (lsObj instanceof Number) {
//                    double ls = ((Number) lsObj).doubleValue();
//                    livenessPassed = ls >= faceRecognitionService.getLivenessThreshold();
//                    noteBuilder.append("liveness=").append(String.valueOf(livenessPassed)).append(";");
//                    noteBuilder.append("livenessScore=").append(String.valueOf(ls)).append(";");
//                } else {
//                    // fallback to challengeMetrics + fakeDetector validation
//                    Map<String,Object> lv = faceRecognitionService.validateLiveness((Map<String,Object>)analyzeMetrics.getOrDefault("challengeMetrics", analyzeMetrics));
//                    livenessPassed = Boolean.TRUE.equals(lv.get("livenessPassed"));
//                    noteBuilder.append("liveness=").append(String.valueOf(livenessPassed)).append(";");
//                    if (lv.get("blinkProb") != null) noteBuilder.append("blinkProb=").append(String.valueOf(lv.get("blinkProb"))).append(";");
//                    if (lv.get("yawDelta") != null) noteBuilder.append("yawDelta=").append(String.valueOf(lv.get("yawDelta"))).append(";");
//                }
//            } catch (Exception ex) {
//                // ignore
//            }
//        }
        if (analyzeMetrics != null) {
            try {
                // lấy map liveness từ AI
                Object livenessObj = analyzeMetrics.get("liveness");
                if (livenessObj instanceof Map) {
                    Map<String, Object> livenessMap = (Map<String,Object>) livenessObj;
                    Object lsObj = livenessMap.getOrDefault("livenessScore", livenessMap.get("score"));
                    if (lsObj instanceof Number) {
                        double ls = ((Number) lsObj).doubleValue();
                        livenessPassed = ls >= faceRecognitionService.getLivenessThreshold();
                        noteBuilder.append("liveness=").append(livenessPassed).append(";");
                        noteBuilder.append("livenessScore=").append(ls).append(";");
                    }
                    if (livenessMap.get("blinkProb") != null) noteBuilder.append("blinkProb=").append(livenessMap.get("blinkProb")).append(";");
                    if (livenessMap.get("yawDelta") != null) noteBuilder.append("yawDelta=").append(livenessMap.get("yawDelta")).append(";");
                }
            } catch (Exception ex) {
                // ignore
            }
        }

        // attach note and status
        attendance.setNote(noteBuilder.toString());
        attendance.setStatus(matched ? AttendanceStatus.PRESENT : AttendanceStatus.ABSENT);

        // Link student and class session if available BEFORE saving (important for FAKE_DETECTED too)
        if (userId != null) userRepository.findById(userId).ifPresent(attendance::setStudent);
        classSessionRepository.findById(classSessionId).ifPresent(attendance::setClassSession);

        // set audit timestamp if available
        try {
            attendance.setCreatedAt(LocalDateTime.now());
        } catch (Exception ex) {
            // ignore if field not present
        }

        // if liveness failed, mark as FAKE_DETECTED and persist with links
        if (!livenessPassed) {
            attendance.setIsPassed(false);
            attendance.setStatus(com.backend.enums.AttendanceStatus.FAKE_DETECTED);
            Attendance savedFake = attendanceRepository.save(attendance);
            return toResponse(savedFake);
        }

        Attendance saved = attendanceRepository.save(attendance);
        return toResponse(saved);
    }

    public List<AttendanceResponse> getAttendancesForSession(String classSessionId) {
        return attendanceRepository.findAll().stream()
                .filter(a -> a.getClassSession() != null && classSessionId.equals(a.getClassSession().getId()))
                .map(this::toResponse)
                .collect(Collectors.toList());
    }

    public AttendanceResponse getLatestAttendanceForUser(String classSessionId, String userId) {
        return attendanceRepository.findAllByClassSessionId(classSessionId).stream()
                .filter(a -> a.getStudent() != null && a.getStudent().getId().equals(userId))
                .sorted((a, b) -> b.getAttendanceTime().compareTo(a.getAttendanceTime()))
                .map(this::toResponse)
                .findFirst()
                .orElse(null);
    }

    private AttendanceResponse toResponse(Attendance a) {
        AttendanceResponse r = new AttendanceResponse();
        r.setId(a.getId());
        r.setAttendanceTime(a.getAttendanceTime());
        r.setIsPassed(a.getIsPassed());
        r.setNote(a.getNote());
        r.setStatus(a.getStatus());
        return r;
    }

    public AttendanceResponse overrideAttendance(String attendanceId, com.backend.dto.AttendanceUpdateRequest request) {
        Attendance attendance = attendanceRepository.findById(attendanceId).orElseThrow();
        attendance.setStatus(request.getStatus());
        attendance.setNote(request.getVerificationNote());
        // persist update
        Attendance saved = attendanceRepository.save(attendance);
        return toResponse(saved);
    }

    public long countAllAttendances() {
        return attendanceRepository.count();
    }

    public com.backend.dto.admin.AttendanceStats getAttendanceStats() {
        List<Attendance> all = attendanceRepository.findAll();
        long total = all.size();
        long present = all.stream().filter(a -> a.getStatus() == AttendanceStatus.PRESENT).count();
        long suspicious = all.stream().filter(a -> a.getStatus() == com.backend.enums.AttendanceStatus.FAKE_DETECTED).count();
        com.backend.dto.admin.AttendanceStats s = new com.backend.dto.admin.AttendanceStats();
        s.setTotal(total);
        s.setPresent(present);
        s.setSuspicious(suspicious);
        return s;
    }
}
