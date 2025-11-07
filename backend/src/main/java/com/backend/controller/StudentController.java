package com.backend.controller;

import java.util.Base64;
import java.util.HashMap;
import java.util.Map;

import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.multipart.MultipartFile;

import com.backend.dto.ApiResponse;
import com.backend.enums.Role;
import com.backend.model.User;
import com.backend.util.FaceUtils;
import com.backend.repository.UserRepository;
import com.backend.mapper.ClassroomMapper;
import com.backend.dto.classroom.ClassroomResponse;
import com.backend.mapper.ClassSessionMapper;
import com.backend.dto.classSession.ClassSessionResponse;
import com.backend.repository.ClassroomRepository;
import com.backend.repository.ClassSessionRepository;
import com.backend.repository.StudentClassroomRepository;

import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import lombok.extern.slf4j.Slf4j;

@RestController
@RequestMapping("/api/student")
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
@RequiredArgsConstructor
@Slf4j
public class StudentController {

    UserRepository userRepository;
    com.backend.service.StudentFaceService studentFaceService;
    com.backend.service.AttendanceService attendanceService;
    com.backend.service.FaceRecognitionService faceRecognitionService;
    ClassroomRepository classroomRepository;
    ClassSessionRepository classSessionRepository;
    ClassSessionMapper classSessionMapper;
    StudentClassroomRepository studentClassroomRepository;
    ClassroomMapper classroomMapper;

    // new: enroll descriptor endpoint
    @PostMapping(value = "/face/enroll", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @PreAuthorize("hasRole('STUDENT')")
    public ResponseEntity<ApiResponse<?>> enrollFace(@RequestPart("photo") MultipartFile photo) {
        try {
            String email = SecurityContextHolder.getContext().getAuthentication().getName();
            User user = userRepository.findByEmail(email).orElse(null);
            if (user == null) return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(ApiResponse.builder().success(false).message("User not found").build());

            byte[] bytes = photo.getBytes();
            String base64 = Base64.getEncoder().encodeToString(bytes);

            // Save raw face image for debugging/enrollment convenience
            try {
                user.setFaceData(base64);
                userRepository.save(user);
                log.info("Saved faceData for user {} (enroll endpoint)", user.getId());
            } catch (Exception ex) {
                log.warn("Failed to save faceData on enroll for user {}", user.getId(), ex);
            }

            // call ai_service to get descriptor
            RestTemplate rt = new RestTemplate();
            String aiUrl = "http://localhost:5001/extract"; // ai_service should implement /extract returning descriptor
            Map<String, String> payload = new HashMap<>();
            payload.put("imageBase64", base64);
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            HttpEntity<Map<String, String>> request = new HttpEntity<>(payload, headers);
            ResponseEntity<String> aiResp = rt.postForEntity(aiUrl, request, String.class);

            Map<String, Object> result = new HashMap<>();
            if (aiResp.getStatusCode().is2xxSuccessful() && aiResp.getBody() != null) {
                com.fasterxml.jackson.databind.ObjectMapper mapper = new com.fasterxml.jackson.databind.ObjectMapper();
                com.fasterxml.jackson.core.type.TypeReference<java.util.Map<String, Object>> tr = new com.fasterxml.jackson.core.type.TypeReference<java.util.Map<String, Object>>(){};
                Map<String, Object> m = mapper.readValue(aiResp.getBody(), tr);
                result.putAll(m);
            }

            // get descriptor from result
            Object descObj = result.get("descriptor");
            if (descObj == null) {
                return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(ApiResponse.builder().success(false).message("AI service didn't return descriptor").build());
            }
            com.fasterxml.jackson.databind.ObjectMapper mapper = new com.fasterxml.jackson.databind.ObjectMapper();
            java.util.List<Double> descriptor = mapper.convertValue(descObj, new com.fasterxml.jackson.core.type.TypeReference<java.util.List<Double>>(){});

            // save descriptor using StudentFaceService
            studentFaceService.enrollDescriptor(user.getId(), descriptor);

            return ResponseEntity.ok(ApiResponse.builder().message("Enrolled").data(result).build());
        } catch (java.io.IOException | org.springframework.web.client.RestClientException ex) {
            log.error("Enroll failed", ex);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(ApiResponse.builder().success(false).message("Enroll failed").build());
        }
    }

    // GET /api/student/classrooms
    @GetMapping("/classrooms")
    @PreAuthorize("hasRole('STUDENT')")
    public ResponseEntity<ApiResponse<java.util.List<ClassroomResponse>>> getMyClassrooms() {
        try {
            String email = SecurityContextHolder.getContext().getAuthentication().getName();
            User user = userRepository.findByEmail(email).orElse(null);
            if (user == null) return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(ApiResponse.<java.util.List<ClassroomResponse>>builder().success(false).message("User not found").build());
            java.util.List<com.backend.model.StudentClassroom> links = studentClassroomRepository.findByStudentId(user.getId());
            log.debug("getMyClassrooms: userId={} email={} linksFound={}", user.getId(), email, links == null ? 0 : links.size());
            java.util.List<ClassroomResponse> out = new java.util.ArrayList<>();
            for (com.backend.model.StudentClassroom link : links) {
                if (link.getClassroom() == null) continue;
                out.add(classroomMapper.toClassroomResponse(link.getClassroom()));
            }

            return ResponseEntity.ok(ApiResponse.<java.util.List<ClassroomResponse>>builder().message("my-classrooms").data(out).build());
        } catch (Exception ex) {
            log.error("Failed to fetch classrooms", ex);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(ApiResponse.<java.util.List<ClassroomResponse>>builder().success(false).message("Failed").build());
        }
    }

    // GET /api/student/sessions/upcoming
    @GetMapping("/sessions/upcoming")
    @PreAuthorize("hasRole('STUDENT')")
    public ResponseEntity<ApiResponse<java.util.List<ClassSessionResponse>>> getMyUpcomingSessions() {
        try {
            String email = SecurityContextHolder.getContext().getAuthentication().getName();
            User user = userRepository.findByEmail(email).orElse(null);
            if (user == null) return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(ApiResponse.<java.util.List<ClassSessionResponse>>builder().success(false).message("User not found").build());

            // find classrooms the student is enrolled in via StudentClassroom links
            java.util.List<com.backend.model.StudentClassroom> links = studentClassroomRepository.findByStudentId(user.getId());
            System.out.println(links);
            System.out.println("user.getId()" + user.getId());

            log.debug("getMyUpcomingSessions: userId={} email={} studentClassroomLinks={}", user.getId(), email, links == null ? 0 : links.size());
            java.util.List<ClassSessionResponse> upcoming = new java.util.ArrayList<>();
            if (links != null) {
                for (com.backend.model.StudentClassroom link : links) {
                if (link.getClassroom() == null) continue;
                String cid = link.getClassroom().getId();
                java.util.List<com.backend.model.ClassSession> list = classSessionRepository.findUpcomingSessionsByClassroom(cid, java.time.LocalDateTime.now());
                log.debug("  classroomId={} upcomingSessionsFound={}", cid, list == null ? 0 : list.size());
                if (list != null) {
                    for (com.backend.model.ClassSession cs : list) {
                        upcoming.add(classSessionMapper.toClassSessionResponse(cs));
                    }
                }
                }
            }

            return ResponseEntity.ok(ApiResponse.<java.util.List<ClassSessionResponse>>builder().message("upcoming").data(upcoming).build());
        } catch (Exception ex) {
            log.error("Failed to fetch upcoming sessions", ex);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(ApiResponse.<java.util.List<ClassSessionResponse>>builder().success(false).message("Failed").build());
        }
    }

    // DEBUG: GET /api/student/sessions/upcoming/debug
    // Returns detailed info (student id, classroom links, per-classroom session lists)
    @GetMapping("/sessions/upcoming/debug")
    @PreAuthorize("hasRole('STUDENT')")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getMyUpcomingSessionsDebug() {
        try {
            String email = SecurityContextHolder.getContext().getAuthentication().getName();
            User user = userRepository.findByEmail(email).orElse(null);
            if (user == null) return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(ApiResponse.<Map<String,Object>>builder().success(false).message("User not found").build());

            java.util.List<com.backend.model.StudentClassroom> links = studentClassroomRepository.findByStudentId(user.getId());
            Map<String, Object> out = new HashMap<>();
            out.put("userId", user.getId());
            out.put("email", email);
            out.put("linksFound", links == null ? 0 : links.size());

            java.util.List<Map<String, Object>> perClass = new java.util.ArrayList<>();
            for (com.backend.model.StudentClassroom link : links) {
                Map<String, Object> info = new HashMap<>();
                if (link.getClassroom() == null) {
                    info.put("classroomId", null);
                    info.put("sessions", new java.util.ArrayList<>());
                    info.put("count", 0);
                    perClass.add(info);
                    continue;
                }
                String cid = link.getClassroom().getId();
                info.put("classroomId", cid);
                info.put("classroomName", link.getClassroom().getName());
                java.util.List<com.backend.model.ClassSession> list = classSessionRepository.findUpcomingSessionsByClassroom(cid, java.time.LocalDateTime.now());
                info.put("count", list == null ? 0 : list.size());
                // include minimal session info
                java.util.List<Map<String, Object>> sessionsShort = new java.util.ArrayList<>();
                if (list != null) {
                    for (com.backend.model.ClassSession s : list) {
                        Map<String, Object> si = new HashMap<>();
                        si.put("id", s.getId());
                        si.put("title", s.getTitle());
                        si.put("startTime", s.getStartTime());
                        si.put("endTime", s.getEndTime());
                        si.put("sessionStatus", s.getSessionStatus());
                        sessionsShort.add(si);
                    }
                }
                info.put("sessions", sessionsShort);
                perClass.add(info);
            }

            out.put("perClassrooms", perClass);
            return ResponseEntity.ok(ApiResponse.<Map<String,Object>>builder().message("debug-upcoming").data(out).build());
        } catch (Exception ex) {
            log.error("Failed to fetch upcoming sessions (debug)", ex);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(ApiResponse.<Map<String,Object>>builder().success(false).message("Failed").build());
        }
    }

    // POST /api/student/attendance/photo
    @PostMapping(value = "/attendance/photo", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @PreAuthorize("hasRole('STUDENT')")
    public ResponseEntity<ApiResponse<Map<String, Object>>> uploadAttendancePhoto(@RequestPart("photo") MultipartFile photo,
                                                                                  @org.springframework.web.bind.annotation.RequestParam(value = "classSessionId", required = false) String classSessionId) {
        try {
            String email = SecurityContextHolder.getContext().getAuthentication().getName();
            User user = userRepository.findByEmail(email).orElse(null);
            if (user == null) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(ApiResponse.<Map<String,Object>>builder().success(false).message("User not found").build());
            }
            if (user.getRole() != Role.STUDENT) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN).body(ApiResponse.<Map<String,Object>>builder().success(false).message("Only students can upload attendance photos").build());
            }

            byte[] bytes = photo.getBytes();
            String base64 = Base64.getEncoder().encodeToString(bytes);

            // call ai_service analyze endpoint
            RestTemplate rt = new RestTemplate();
            String aiUrl = "http://localhost:5001/analyze"; // ai_service should be running
            Map<String, String> payload = new HashMap<>();
            payload.put("imageBase64", base64);
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            HttpEntity<Map<String, String>> request = new HttpEntity<>(payload, headers);
            ResponseEntity<String> aiResp = rt.postForEntity(aiUrl, request, String.class);

            Map<String, Object> result = new HashMap<>();
            if (aiResp.getStatusCode().is2xxSuccessful() && aiResp.getBody() != null) {
                // parse JSON string
                com.fasterxml.jackson.databind.ObjectMapper mapper = new com.fasterxml.jackson.databind.ObjectMapper();
                try {
            com.fasterxml.jackson.core.type.TypeReference<java.util.Map<String, Object>> tr =
                new com.fasterxml.jackson.core.type.TypeReference<java.util.Map<String, Object>>() {};
            Map<String, Object> m = mapper.readValue(aiResp.getBody(), tr);
                    result.putAll(m);
                } catch (java.io.IOException ex) {
                    log.warn("Failed to parse AI response", ex);
                }
            }

            // store base64 faceData in user model only if debug env allows it
            String allowRaw = System.getenv().getOrDefault("ENV_ALLOW_RAW_IMAGE_UPLOAD_FOR_DEBUG", "true");
            boolean faceDataSaved = false;
            if ("true".equalsIgnoreCase(allowRaw)) {
                try {
                    user.setFaceData(base64);
                    User savedUser = userRepository.save(user);
                    faceDataSaved = savedUser.getFaceData() != null && !savedUser.getFaceData().isBlank();
                    log.info("Saved faceData for user {} (attendance upload) length={}", user.getId(), faceDataSaved ? savedUser.getFaceData().length() : 0);
                } catch (Exception ex) {
                    log.warn("Failed to save faceData for user {} during attendance photo upload", user.getId(), ex);
                }
                // Optionally auto-extract and enroll descriptor from saved faceData so embeddings table is populated.
                String allowAutoEnroll = System.getenv().getOrDefault("ENV_ALLOW_AUTO_ENROLL_FROM_RAW_FACE_DATA", "true");
                if ("true".equalsIgnoreCase(allowAutoEnroll)) {
                    try {
                        // only enroll if user has no descriptors yet
                        java.util.List<java.util.List<Double>> existing = studentFaceService.getDescriptorsForUser(user.getId());
                        if (existing == null || existing.isEmpty()) {
                            RestTemplate rt2 = new RestTemplate();
                            String aiExtract = "http://localhost:5001/extract";
                            Map<String, String> p2 = new HashMap<>();
                            p2.put("imageBase64", base64);
                            HttpHeaders h2 = new HttpHeaders();
                            h2.setContentType(MediaType.APPLICATION_JSON);
                            HttpEntity<Map<String, String>> req2 = new HttpEntity<>(p2, h2);
                            ResponseEntity<String> aiResp2 = rt2.postForEntity(aiExtract, req2, String.class);
                            if (aiResp2.getStatusCode().is2xxSuccessful() && aiResp2.getBody() != null) {
                                com.fasterxml.jackson.databind.ObjectMapper mapper2 = new com.fasterxml.jackson.databind.ObjectMapper();
                                com.fasterxml.jackson.core.type.TypeReference<java.util.Map<String, Object>> tr2 = new com.fasterxml.jackson.core.type.TypeReference<java.util.Map<String, Object>>(){};
                                Map<String, Object> m2 = mapper2.readValue(aiResp2.getBody(), tr2);
                                Object descObj2 = m2.get("descriptor");
                                if (descObj2 != null) {
                                    java.util.List<Double> descriptor = mapper2.convertValue(descObj2, new com.fasterxml.jackson.core.type.TypeReference<java.util.List<Double>>(){});
                                    studentFaceService.enrollDescriptor(user.getId(), descriptor);
                                }
                            }
                        }
                    } catch (Exception ex) {
                        log.warn("Auto-enroll from faceData failed for user {}", user.getId(), ex);
                    }
                }
            }

            // If caller passed a classSessionId, persist an attendance record using AttendanceService
            if (classSessionId != null && !classSessionId.isBlank()) {
                try {
                    com.backend.dto.attendance.AttendanceRequest ar = new com.backend.dto.attendance.AttendanceRequest();
                    ar.setImageBase64(base64);
                    com.backend.dto.attendance.AttendanceResponse attendanceResp = attendanceService.submitAttendance(classSessionId, user.getId(), ar);
                    result.put("attendance", attendanceResp);
                    return ResponseEntity.ok(ApiResponse.<Map<String,Object>>builder().code("attendance-photo-upload-saved").message("Uploaded, analyzed and attendance saved").data(result).build());
                } catch (Exception ex) {
                    log.warn("Failed to save attendance for session {}", classSessionId, ex);
                    result.put("attendance_error", ex.getMessage());
                    return ResponseEntity.ok(ApiResponse.<Map<String,Object>>builder().code("attendance-photo-upload").message("Uploaded and analyzed (attendance save failed)").data(result).build());
                }
            }

            return ResponseEntity.ok(ApiResponse.<Map<String,Object>>builder().code("attendance-photo-upload").message("Uploaded and analyzed").data(result).build());
        } catch (java.io.IOException | org.springframework.web.client.RestClientException ex) {
            log.error("Failed to upload attendance photo", ex);
            // For local debugging return exception message in response body. Remove in production.
            String msg = ex.getMessage() == null ? "Upload failed" : ex.getMessage();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(ApiResponse.<Map<String,Object>>builder().success(false).message("Upload failed: " + msg).build());
        }
    }

    // POST /api/student/attendance/verify
    @PostMapping(value = "/attendance/verify")
    @PreAuthorize("hasRole('STUDENT')")
    public ResponseEntity<ApiResponse<Map<String, Object>>> verifyAttendance(@RequestBody Map<String, Object> payload) {
        try {
            log.debug("verifyAttendance payload keys: {}", payload == null ? "null" : payload.keySet());
            // extract descriptor from payload (either client-side descriptor array or imageBase64 -> server extractor)
            Object descObj = payload.get("descriptor");
            com.fasterxml.jackson.databind.ObjectMapper mapper = new com.fasterxml.jackson.databind.ObjectMapper();
            java.util.List<Double> descriptor = null;
            if (descObj != null) {
                descriptor = mapper.convertValue(descObj, new com.fasterxml.jackson.core.type.TypeReference<java.util.List<Double>>(){});
                log.debug("Descriptor present, length: {}", descriptor.size());
            } else if (payload.get("imageBase64") != null) {
                // allow frontend to POST imageBase64 so server uses same extractor as enroll
                try {
                    String imageBase64 = String.valueOf(payload.get("imageBase64"));
                    // FaceRecognitionService.extractDescriptor accepts either a base64 string or JSON array string
                    java.util.List<Double> extracted = faceRecognitionService.extractDescriptor(imageBase64);
                    if (extracted != null && !extracted.isEmpty()) {
                        descriptor = extracted;
                        log.debug("Extracted descriptor length: {}", descriptor.size());
                    } else {
                        // set a reason later; continue so we can respond with helpful message
                        // but ensure descriptor remains null to indicate failure
                    }
                } catch (Exception e) {
                    // extraction failed; leave descriptor null
                }
            }

            String studentId = null;
            if (payload.get("studentId") != null) studentId = String.valueOf(payload.get("studentId"));
            else {
                // derive from authenticated principal (email stored as name)
                try {
                    String email = SecurityContextHolder.getContext().getAuthentication().getName();
                    com.backend.model.User u = userRepository.findByEmail(email).orElse(null);
                    if (u != null) studentId = u.getId();
                } catch (Exception ex) {
                    // ignore
                }
            }

            double bestSim = -1.0;
            boolean matched = false;
            String reason = null;
            String nearestDescriptorId = null;

            if (studentId == null) {
                reason = "student_not_found";
                log.debug("Reason: {}", reason);
            } else if (descriptor == null || descriptor.isEmpty()) {
                // descriptor extraction failed or not provided
                reason = "descriptor_extraction_failed";
                log.debug("Reason: {}", reason);
            } else {
                java.util.List<java.util.Map<String,Object>> rows = studentFaceService.getDescriptorRowsForUser(studentId);
                if (rows == null || rows.isEmpty()) {
                    reason = "no_descriptors";
                    log.debug("Reason: {}", reason);
                } else {
                    for (java.util.Map<String,Object> row : rows) {
                        @SuppressWarnings("unchecked")
                        java.util.List<Double> s = (java.util.List<Double>) row.get("descriptor");
                        // convert to double[] for cosineSimilarity
                        double[] stored = new double[s.size()];
                        for (int i = 0; i < s.size(); i++) stored[i] = s.get(i);
                        double[] probe = new double[descriptor.size()];
                        for (int i = 0; i < descriptor.size(); i++) probe[i] = descriptor.get(i);
                        double sim = com.backend.util.FaceUtils.cosineSimilarity(probe, stored);
                        if (sim > bestSim) {
                            bestSim = sim;
                            nearestDescriptorId = String.valueOf(row.get("id"));
                        }
                        if (sim >= faceRecognitionService.getSimilarityThreshold()) matched = true;
                    }
                }
            }

            Map<String, Object> result = new HashMap<>();
            result.put("matched", matched);
            // report similarity and a compatibility 'distance' for older clients: distance = 1 - similarity
            result.put("similarity", bestSim < 0 ? null : bestSim);
            result.put("distance", bestSim < 0 ? null : (1.0 - bestSim));
            if (nearestDescriptorId != null) result.put("nearestDescriptorId", nearestDescriptorId);
            if (reason != null) result.put("reason", reason);

            // human readable Vietnamese message suggestions
            String humanMsg = null;
            if (reason != null) {
                switch (reason) {
                    case "student_not_found":
                        humanMsg = "Không tìm thấy tài khoản. Vui lòng đăng nhập lại.";
                        break;
                    case "no_descriptors":
                        humanMsg = "Bạn chưa đăng ký khuôn mặt. Vui lòng enroll (đăng ký) khuôn mặt trước khi điểm danh.";
                        break;
                    case "no_face_detected":
                    case "descriptor_extraction_failed":
                        humanMsg = "Không phát hiện khuôn mặt trong ảnh. Hãy đảm bảo ánh sáng tốt, đối diện camera và thử nháy mắt/xoay đầu nhẹ khi chụp lại.";
                        break;
                    default:
                        humanMsg = "Không thể xác thực khuôn mặt. Vui lòng thử lại hoặc liên hệ giảng viên.";
                }
            } else {
                // no explicit reason: infer from matched/similarity
                if (!matched) {
                    double thr = faceRecognitionService != null ? faceRecognitionService.getSimilarityThreshold() : 0.58;
                    if (bestSim >= 0 && bestSim < thr) {
                        humanMsg = "Không khớp với dữ liệu đã lưu. Hãy thử chụp lại hoặc enroll lại.";
                    } else {
                        humanMsg = "Không thể xác thực khuôn mặt. Vui lòng thử lại.";
                    }
                } else {
                    humanMsg = "Xác thực khuôn mặt thành công.";
                }
            }
            result.put("humanMessageVi", humanMsg);

            // include any analyze/liveness hints if present in payload (if client sent them)
            if (payload.get("analyzeMetrics") != null) {
                result.put("analyzeMetrics", payload.get("analyzeMetrics"));
            }

            return ResponseEntity.ok(ApiResponse.<Map<String,Object>>builder().message("verify").data(result).build());
        } catch (Exception ex) {
            log.error("Verify failed", ex);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(ApiResponse.<Map<String,Object>>builder().success(false).message("Verify failed").build());
        }
    }

    // DEBUG: return descriptors for current student
    @GetMapping(value = "/face/descriptors")
    @PreAuthorize("hasRole('STUDENT')")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getMyDescriptors() {
        try {
            String email = SecurityContextHolder.getContext().getAuthentication().getName();
            com.backend.model.User u = userRepository.findByEmail(email).orElse(null);
            if (u == null) return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(ApiResponse.<Map<String,Object>>builder().success(false).message("User not found").build());
            java.util.List<java.util.List<Double>> stored = studentFaceService.getDescriptorsForUser(u.getId());
            Map<String, Object> out = new HashMap<>();
            out.put("count", stored == null ? 0 : stored.size());
            out.put("descriptors", stored == null ? new java.util.ArrayList<>() : stored);
            return ResponseEntity.ok(ApiResponse.<Map<String,Object>>builder().message("descriptors").data(out).build());
        } catch (Exception ex) {
            log.error("Failed to fetch descriptors", ex);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(ApiResponse.<Map<String,Object>>builder().success(false).message("Failed").build());
        }
    }

}
