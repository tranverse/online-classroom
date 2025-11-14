package com.backend.controller;

import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import com.backend.dto.ApiResponse;
import com.backend.model.Folder;
import com.backend.model.Resource;
import com.backend.model.User;
import com.backend.repository.UserRepository;
import com.backend.service.ResourceService;

import jakarta.servlet.http.HttpServletRequest;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;

@RestController
@RequestMapping("/api/resources")
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
@RequiredArgsConstructor
public class ResourceController {

    ResourceService resourceService;
    UserRepository userRepository;

    @PostMapping("/folders")
    @PreAuthorize("hasAnyRole('STUDENT','TEACHER','ADMIN')")
    public ResponseEntity<ApiResponse<Folder>> createFolder(@RequestParam String name, @RequestParam(required = false) String parentId) {
        String email = SecurityContextHolder.getContext().getAuthentication().getName();
        User user = userRepository.findByEmail(email).orElse(null);
        if (user == null) return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(ApiResponse.<Folder>builder().success(false).message("User not found").build());

        Folder f = resourceService.createFolder(name, parentId, user);
        return ResponseEntity.ok(ApiResponse.<Folder>builder().message("Folder created").data(f).build());
    }

    @GetMapping("/folders")
    @PreAuthorize("hasAnyRole('STUDENT','TEACHER','ADMIN')")
    public ResponseEntity<ApiResponse<java.util.List<Folder>>> listFolders() {
        String email = SecurityContextHolder.getContext().getAuthentication().getName();
        User user = userRepository.findByEmail(email).orElse(null);
        if (user == null) return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(ApiResponse.<java.util.List<Folder>>builder().success(false).message("User not found").build());

        java.util.List<Folder> list = resourceService.listFoldersForUser(user);
        return ResponseEntity.ok(ApiResponse.<java.util.List<Folder>>builder().data(list).build());
    }

    @PostMapping(value = "/upload", consumes = {"multipart/form-data"})
    @PreAuthorize("hasAnyRole('STUDENT','TEACHER','ADMIN')")
    public ResponseEntity<ApiResponse<com.backend.dto.resource.ResourceResponse>> uploadResource(@RequestPart("file") MultipartFile file, @RequestParam(required = false) String folderId, HttpServletRequest request) {
            String email = SecurityContextHolder.getContext().getAuthentication().getName();
            User user = userRepository.findByEmail(email).orElse(null);
            if (user == null) return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(ApiResponse.<com.backend.dto.resource.ResourceResponse>builder().success(false).message("User not found").build());

            // Save file bytes to local uploads folder
            try {
                java.nio.file.Path uploadsDir = java.nio.file.Paths.get("uploads");
                java.nio.file.Files.createDirectories(uploadsDir);
                String filename = java.util.UUID.randomUUID().toString() + "_" + java.nio.file.Paths.get(file.getOriginalFilename()).getFileName().toString();
                java.nio.file.Path dest = uploadsDir.resolve(filename);
                try (java.io.InputStream in = file.getInputStream()) {
                    java.nio.file.Files.copy(in, dest, java.nio.file.StandardCopyOption.REPLACE_EXISTING);
                }
                String storagePath = dest.toString();
                // Detailed debug: show parameters and query to detect where folderId lives
                try {
                    java.util.Map<String, String[]> params = request.getParameterMap();
                    System.out.println("uploadResource: request.getParameterMap keys=" + java.util.Arrays.toString(params.keySet().toArray()));
                    if (params.containsKey("folderId")) {
                        System.out.println("uploadResource: folderId param value(s)=" + java.util.Arrays.toString(params.get("folderId")));
                    }
                    System.out.println("uploadResource: raw queryString=" + request.getQueryString());
                } catch (Exception e) {
                    System.out.println("uploadResource: failed to read parameter map: " + e.getMessage());
                }

                // If folderId wasn't bound via @RequestParam, try to read it from the multipart/form-data fields
                String resolvedFolderId = folderId;
                if (resolvedFolderId == null) {
                    try {
                        String p = request.getParameter("folderId");
                        if (p != null && !p.isBlank()) resolvedFolderId = p;
                    } catch (Exception ignored) {}
                }

                // classroomId param may be included to associate resource with a classroom
                String resolvedClassroomId = null;
                try {
                    String c = request.getParameter("classroomId");
                    if (c != null && !c.isBlank()) resolvedClassroomId = c;
                } catch (Exception ignored) {}

                Resource r = resourceService.saveResourceMetadata(file.getOriginalFilename(), storagePath, file.getContentType(), file.getSize(), resolvedFolderId, resolvedClassroomId, user);
                // Log folder association for debugging
                System.out.println("uploadResource: received folderId=" + resolvedFolderId + ", saved resource folderId=" + (r.getFolder() != null ? r.getFolder().getId() : "null"));
                com.backend.dto.resource.ResourceResponse rr = com.backend.dto.resource.ResourceResponse.from(r);
                return ResponseEntity.ok(ApiResponse.<com.backend.dto.resource.ResourceResponse>builder().message("Uploaded").data(rr).build());
            } catch (java.io.IOException ex) {
                return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(ApiResponse.<com.backend.dto.resource.ResourceResponse>builder().success(false).message("Upload failed").build());
            }
    }

    @GetMapping("/download/{id}")
    @PreAuthorize("hasAnyRole('STUDENT','TEACHER','ADMIN')")
    public ResponseEntity<?> downloadResource(@PathVariable String id) {
        java.util.Optional<Resource> opt = resourceService.findById(id);
        if (opt.isEmpty()) return ResponseEntity.status(HttpStatus.NOT_FOUND).body(ApiResponse.builder().success(false).message("Resource not found").build());
        Resource r = opt.get();
        java.nio.file.Path p = java.nio.file.Paths.get(r.getStoragePath());
        if (!java.nio.file.Files.exists(p)) return ResponseEntity.status(HttpStatus.NOT_FOUND).body(ApiResponse.builder().success(false).message("File missing on server").build());
        try {
            org.springframework.core.io.InputStreamResource isr = new org.springframework.core.io.InputStreamResource(java.nio.file.Files.newInputStream(p));
            org.springframework.http.HttpHeaders headers = new org.springframework.http.HttpHeaders();
            headers.add(org.springframework.http.HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + r.getName() + "\"");
            org.springframework.http.MediaType mt = org.springframework.http.MediaType.APPLICATION_OCTET_STREAM;
            if (r.getMimeType() != null) {
                try {
                    mt = org.springframework.http.MediaType.parseMediaType(r.getMimeType());
                } catch (Exception ignored) {}
            }
            return ResponseEntity.ok().headers(headers).contentLength(java.nio.file.Files.size(p)).contentType(mt).body(isr);
        } catch (java.io.IOException ex) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(ApiResponse.builder().success(false).message("Failed to read file").build());
        }
    }

    @GetMapping
    @PreAuthorize("hasAnyRole('STUDENT','TEACHER','ADMIN')")
    public ResponseEntity<ApiResponse<java.util.List<com.backend.dto.resource.ResourceResponse>>> listResources(@RequestParam(required = false) String folderId) {
        String email = SecurityContextHolder.getContext().getAuthentication().getName();
        User authUser = userRepository.findByEmail(email).orElse(null);
        if (authUser == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(ApiResponse.<java.util.List<com.backend.dto.resource.ResourceResponse>>builder()
                            .success(false)
                            .message("User not found")
                            .build());
        }
        String classroomId = null;
        try {
            // if a query param classroomId present, it will be picked up automatically by Spring if declared; read from request param instead
            // but to keep signature simple, we allow folderId or classroomId via the same param name
        } catch (Exception ignored) {}

        // If client passed folderId starting with "classroom:" interpret as classroomId marker (optional)
        List<Resource> list;
        if (folderId != null && folderId.startsWith("classroom:")) {
            String cid = folderId.substring("classroom:".length());
            list = resourceService.listByClassroom(cid);
        } else {
            list = resourceService.listByFolder(folderId, authUser.getId());
        }
        java.util.List<com.backend.dto.resource.ResourceResponse> dto = list.stream().map(com.backend.dto.resource.ResourceResponse::from).toList();
        return ResponseEntity.ok(ApiResponse.<java.util.List<com.backend.dto.resource.ResourceResponse>>builder().data(dto).build());
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('STUDENT','TEACHER','ADMIN')")
    public ResponseEntity<ApiResponse<Object>> deleteResource(@PathVariable String id) {
        String email = SecurityContextHolder.getContext().getAuthentication().getName();
        User user = userRepository.findByEmail(email).orElse(null);
        if (user == null) return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(ApiResponse.builder().success(false).message("User not found").build());
        boolean ok = resourceService.deleteResource(id);
        if (!ok) return ResponseEntity.status(HttpStatus.NOT_FOUND).body(ApiResponse.builder().success(false).message("Resource not found").build());
        return ResponseEntity.ok(ApiResponse.builder().message("Deleted").build());
    }

    @DeleteMapping("/folders/{id}")
    @PreAuthorize("hasAnyRole('STUDENT','TEACHER','ADMIN')")
    public ResponseEntity<ApiResponse<Object>> deleteFolder(@PathVariable String id) {
        String email = SecurityContextHolder.getContext().getAuthentication().getName();
        User user = userRepository.findByEmail(email).orElse(null);
        if (user == null) return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(ApiResponse.builder().success(false).message("User not found").build());
        boolean ok = resourceService.deleteFolder(id);
        if (!ok) return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(ApiResponse.builder().success(false).message("Folder not empty or not found").build());
        return ResponseEntity.ok(ApiResponse.builder().message("Folder deleted").build());
    }
}

