package com.backend.controller;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.context.SecurityContextHolder;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.backend.dto.ApiResponse;
import com.backend.service.AttendanceService;
import com.backend.service.FaceRecognitionService;

import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import lombok.AccessLevel;

@RestController
@RequestMapping("/api/face")
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class FaceController {
    FaceRecognitionService faceRecognitionService;
    AttendanceService attendanceService;

    @GetMapping("/challenge")
    public ResponseEntity<ApiResponse<Map<String, Object>>> challenge(HttpServletRequest request) {
        // require TLS by default unless explicitly allowed
        String allowInsecure = System.getenv().getOrDefault("ALLOW_INSECURE_TRANSPORT_FOR_FACE", "false");
        boolean secure = request.isSecure() || "https".equalsIgnoreCase(request.getHeader("X-Forwarded-Proto"));
        if (!secure && !"true".equalsIgnoreCase(allowInsecure)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(ApiResponse.<Map<String,Object>>builder().success(false).message("Insecure transport not allowed").build());
        }
        return ResponseEntity.ok(ApiResponse.<Map<String,Object>>builder().message("challenge").data(faceRecognitionService.randomChallenge()).build());
    }

    // enroll embedding for student in classroom
    @PostMapping("/enroll/{classroomId}")
    public ResponseEntity<ApiResponse<Void>> enroll(@PathVariable String classroomId, @RequestBody Map<String,Object> payload, HttpServletRequest request) {
        try {
            String allowInsecure = System.getenv().getOrDefault("ALLOW_INSECURE_TRANSPORT_FOR_FACE", "false");
            boolean secure = request.isSecure() || "https".equalsIgnoreCase(request.getHeader("X-Forwarded-Proto"));
            if (!secure && !"true".equalsIgnoreCase(allowInsecure)) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN).body(ApiResponse.<Void>builder().success(false).message("Insecure transport not allowed").build());
            }
            String email = SecurityContextHolder.getContext().getAuthentication().getName();
            String studentId = (String) payload.getOrDefault("studentId", email);
            Object emb = payload.get("embedding");
            if (emb == null) return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(ApiResponse.<Void>builder().success(false).message("embedding missing").build());
            java.util.List<Number> list = (java.util.List<Number>) emb;
            double[] arr = new double[list.size()];
            for (int i = 0; i < list.size(); i++) arr[i] = list.get(i).doubleValue();
            faceRecognitionService.saveEmbedding(studentId, classroomId, arr);
            return ResponseEntity.ok(ApiResponse.<Void>builder().message("enrolled").build());
        } catch (Exception ex) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(ApiResponse.<Void>builder().success(false).message("enroll failed").build());
        }
    }

    // POST /api/face/check/{classroomId}/{sessionId}
    @PostMapping("/check/{classroomId}/{sessionId}")
    public ResponseEntity<ApiResponse<Map<String,Object>>> check(@PathVariable String classroomId, @PathVariable String sessionId, @RequestBody Map<String,Object> payload) {
        try {
            // ensure secure transport
            HttpServletRequest request = ((org.springframework.web.context.request.ServletRequestAttributes) org.springframework.web.context.request.RequestContextHolder.currentRequestAttributes()).getRequest();
            String allowInsecure = System.getenv().getOrDefault("ALLOW_INSECURE_TRANSPORT_FOR_FACE", "false");
            boolean secure = request.isSecure() || "https".equalsIgnoreCase(request.getHeader("X-Forwarded-Proto"));
            if (!secure && !"true".equalsIgnoreCase(allowInsecure)) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN).body(ApiResponse.<Map<String,Object>>builder().success(false).message("Insecure transport not allowed").build());
            }
            // payload: { studentId, embedding: [..], challengeMetrics: {...} }
            Object emb = payload.get("embedding");
            Object cm = payload.get("challengeMetrics");
            String studentId = payload.get("studentId") == null ? SecurityContextHolder.getContext().getAuthentication().getName() : String.valueOf(payload.get("studentId"));
            if (emb == null) return ResponseEntity.badRequest().body(ApiResponse.<Map<String,Object>>builder().success(false).message("embedding missing").build());
            java.util.List<Number> list = (java.util.List<Number>) emb;
            double[] arr = new double[list.size()];
            for (int i = 0; i < list.size(); i++) arr[i] = list.get(i).doubleValue();

            Map<String,Object> cmMap = cm == null ? new HashMap<>() : (Map<String,Object>) cm;

            // validate liveness
            Map<String,Object> lv = faceRecognitionService.validateLiveness(cmMap);
            boolean liveness = lv.get("livenessPassed") == Boolean.TRUE;

            // load gallery embeddings for classroom and verify
            List<double[]> gallery = faceRecognitionService.loadEmbeddingsForClassroom(classroomId);
            boolean matched = faceRecognitionService.verify(arr, gallery);

            Map<String,Object> res = new HashMap<>();
            res.put("liveness", lv);
            res.put("matched", matched);

            // Only create attendance if liveness and matched
            if (liveness && matched) {
                com.backend.dto.attendance.AttendanceRequest ar = new com.backend.dto.attendance.AttendanceRequest();
                // do not store raw image by default; store a small liveness score
                ar.setImageBase64(null);
                Object lvScore = lv.get("livenessScore");
                if (lvScore instanceof Number) ar.setLivenessScore(((Number) lvScore).doubleValue());
                attendanceService.submitAttendance(sessionId, studentId, ar);
                res.put("recorded", true);
            } else {
                res.put("recorded", false);
            }

            return ResponseEntity.ok(ApiResponse.<Map<String,Object>>builder().message("check").data(res).build());
        } catch (Exception ex) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(ApiResponse.<Map<String,Object>>builder().success(false).message("check failed").build());
        }
    }
}
