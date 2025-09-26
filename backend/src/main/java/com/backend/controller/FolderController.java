package com.backend.controller;

import com.backend.dto.ApiResponse;
import com.backend.dto.classSession.ClassSessionRequest;
import com.backend.dto.classSession.ClassSessionResponse;
import com.backend.dto.folder.FolderRequest;
import com.backend.dto.folder.FolderResponse;
import com.backend.service.FolderService;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/folder")
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class FolderController {
    FolderService folderService;

    @PostMapping
    @PreAuthorize("hasAnyRole('STUDENT', 'TEACHER')")
    public ResponseEntity<ApiResponse<FolderResponse>> addFolder(@RequestBody FolderRequest folderRequest) {
        return ResponseEntity.ok(
                ApiResponse.<FolderResponse>builder()
                        .message("Add folder successfully")
                        .code("folder-s-add")
                        .data(folderService.createFolder(folderRequest))
                        .build()
        );
    }

    @PutMapping("/{folder_id}")
    @PreAuthorize("hasAnyRole('STUDENT', 'TEACHER')")
    public ResponseEntity<ApiResponse<FolderResponse>> addFolder(@RequestBody FolderRequest folderRequest, @PathVariable String folder_id) {
        return ResponseEntity.ok(
                ApiResponse.<FolderResponse>builder()
                        .message("Update folder successfully")
                        .code("folder-s-update")
                        .data(folderService.updateFolder(folderRequest, folder_id))
                        .build()
        );
    }

    @GetMapping("/{folder_id}")
    @PreAuthorize("hasAnyRole('STUDENT', 'TEACHER')")
    public ResponseEntity<ApiResponse<FolderResponse>> getFolder(@PathVariable String folder_id) {
        return ResponseEntity.ok(
                ApiResponse.<FolderResponse>builder()
                        .message("Get folder successfully")
                        .code("folder-s-get")
                        .data(folderService.getFolder(folder_id))
                        .build()
        );
    }

    @DeleteMapping("/{folder_id}")
    @PreAuthorize("hasAnyRole('STUDENT', 'TEACHER')")
    public ResponseEntity<ApiResponse<Void>> deleteFolder(@PathVariable String folder_id) {
        return ResponseEntity.ok(
                ApiResponse.<Void>builder()
                        .message("Delete folder successfully")
                        .code("folder-s-delete")
                        .data(folderService.deleteFolder(folder_id))
                        .build()
        );
    }
}
