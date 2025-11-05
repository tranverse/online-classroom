package com.backend.controller;

import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import com.backend.dto.ApiResponse;
import com.backend.model.Folder;
import com.backend.model.Resource;
import com.backend.model.User;
import com.backend.repository.UserRepository;
import com.backend.service.ResourceService;

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
    public ResponseEntity<ApiResponse<Resource>> uploadResource(@RequestPart("file") MultipartFile file, @RequestParam(required = false) String folderId) {
            String email = SecurityContextHolder.getContext().getAuthentication().getName();
            User user = userRepository.findByEmail(email).orElse(null);
            if (user == null) return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(ApiResponse.<Resource>builder().success(false).message("User not found").build());

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
                Resource r = resourceService.saveResourceMetadata(file.getOriginalFilename(), storagePath, file.getContentType(), file.getSize(), folderId, user);
                return ResponseEntity.ok(ApiResponse.<Resource>builder().message("Uploaded").data(r).build());
            } catch (java.io.IOException ex) {
                return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(ApiResponse.<Resource>builder().success(false).message("Upload failed").build());
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
    public ResponseEntity<ApiResponse<List<Resource>>> listResources(@RequestParam(required = false) String folderId) {
        List<Resource> list = resourceService.listByFolder(folderId);
        return ResponseEntity.ok(ApiResponse.<List<Resource>>builder().data(list).build());
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

