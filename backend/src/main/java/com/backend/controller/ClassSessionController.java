package com.backend.controller;

import com.backend.dto.ApiResponse;
import com.backend.dto.classSession.ClassSessionRequest;
import com.backend.dto.classSession.ClassSessionResponse;
import com.backend.dto.classroom.ClassroomRequest;
import com.backend.dto.classroom.ClassroomResponse;
import com.backend.service.ClassSessionService;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/class-session")
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class ClassSessionController {
    ClassSessionService classSessionService;

    @PostMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'TEACHER')")
    public ResponseEntity<ApiResponse<ClassSessionResponse>> addClassSession(@RequestBody ClassSessionRequest classSessionRequest) {
        return ResponseEntity.ok(
                ApiResponse.<ClassSessionResponse>builder()
                        .message("Add class session successfully")
                        .code("classroom-s-add")
                        .data(classSessionService.addClassSession(classSessionRequest))
                        .build()
        );
    }


    @PutMapping("/{class_Session_Id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'TEACHER')")
    public ResponseEntity<ApiResponse<ClassSessionResponse>> updateClassSession(@PathVariable String class_Session_Id,
                                                                                @RequestBody ClassSessionRequest classSessionRequest) {
        return ResponseEntity.ok(
                ApiResponse.<ClassSessionResponse>builder()
                        .message("Update class session successfully")
                        .code("classroom-s-update")
                        .data(classSessionService.updateClassSession(classSessionRequest, class_Session_Id))
                        .build()
        );
    }


    @GetMapping("/{classSessionId}")
    @PreAuthorize("hasAnyRole('ADMIN', 'TEACHER', 'STUDENT')")
    public ResponseEntity<ApiResponse<ClassSessionResponse>> getClassSession(@PathVariable String classSessionId) {
        return ResponseEntity.ok(
                ApiResponse.<ClassSessionResponse>builder()
                        .message("Get class session successfully")
                        .code("classroom-s-get")
                        .data(classSessionService.getClassSession(classSessionId))
                        .build()
        );
    }

    @GetMapping("/get-all")
    @PreAuthorize("hasAnyRole('ADMIN')")
    public ResponseEntity<ApiResponse<List<ClassSessionResponse>>> getAllClassSessions() {
        return ResponseEntity.ok(
                ApiResponse.<List<ClassSessionResponse>>builder()
                        .message("Get all class session successfully")
                        .code("classroom-s-get-all")
                        .data(classSessionService.getAllClassSessions())
                        .build()
        );
    }

    @DeleteMapping("/{classSessionId}")
    @PreAuthorize("hasAnyRole('ADMIN', 'TEACHER')")
    public ResponseEntity<ApiResponse<?>> deleteClassSession(@PathVariable String classSessionId) {
        return ResponseEntity.ok(
                ApiResponse.<Void>builder()
                        .message("Delete class session successfully")
                        .code("classroom-s-delete")
                        .data(classSessionService.deleteClassSession(classSessionId))
                        .build()
        );
    }
}
