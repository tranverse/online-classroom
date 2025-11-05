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
    public ResponseEntity<ApiResponse<Map<String, Object>>> uploadAttendancePhoto(@RequestPart("photo") MultipartFile photo) {
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
            String allowRaw = System.getenv().getOrDefault("ENV_ALLOW_RAW_IMAGE_UPLOAD_FOR_DEBUG", "false");
            if ("true".equalsIgnoreCase(allowRaw)) {
                user.setFaceData(base64);
                userRepository.save(user);
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
            // extract descriptor from payload
            Object descObj = payload.get("descriptor");
            if (descObj == null) {
                return ResponseEntity.badRequest().body(ApiResponse.<Map<String,Object>>builder().success(false).message("descriptor missing").build());
            }
            com.fasterxml.jackson.databind.ObjectMapper mapper = new com.fasterxml.jackson.databind.ObjectMapper();
            java.util.List<Double> descriptor = mapper.convertValue(descObj, new com.fasterxml.jackson.core.type.TypeReference<java.util.List<Double>>(){});

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

            double minDist = Double.MAX_VALUE;
            boolean matched = false;
            if (descriptor != null && !descriptor.isEmpty() && studentId != null) {
                java.util.List<java.util.List<Double>> stored = studentFaceService.getDescriptorsForUser(studentId);
                for (java.util.List<Double> s : stored) {
                    double d = com.backend.service.StudentFaceService.euclidean(s, descriptor);
                    if (d < minDist) minDist = d;
                    if (d <= 0.58) matched = true;
                }
            }

            Map<String, Object> result = new HashMap<>();
            result.put("matched", matched);
            result.put("distance", minDist == Double.MAX_VALUE ? null : minDist);
            return ResponseEntity.ok(ApiResponse.<Map<String,Object>>builder().message("verify").data(result).build());
        } catch (Exception ex) {
            log.error("Verify failed", ex);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(ApiResponse.<Map<String,Object>>builder().success(false).message("Verify failed").build());
        }
    }
}
