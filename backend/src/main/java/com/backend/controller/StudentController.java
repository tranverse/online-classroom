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
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.multipart.MultipartFile;

import com.backend.dto.ApiResponse;
import com.backend.enums.Role;
import com.backend.model.User;
import com.backend.repository.UserRepository;

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

            // store base64 faceData in user model
            user.setFaceData(base64);
            userRepository.save(user);

            return ResponseEntity.ok(ApiResponse.<Map<String,Object>>builder().code("attendance-photo-upload").message("Uploaded and analyzed").data(result).build());
        } catch (java.io.IOException | org.springframework.web.client.RestClientException ex) {
            log.error("Failed to upload attendance photo", ex);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(ApiResponse.<Map<String,Object>>builder().success(false).message("Upload failed").build());
        }
    }
}
