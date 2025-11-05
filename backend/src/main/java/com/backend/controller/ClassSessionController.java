package com.backend.controller;

import java.util.List;

import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.backend.dto.ApiResponse;
import com.backend.dto.attendance.AttendanceRequest;
import com.backend.dto.attendance.AttendanceResponse;
import com.backend.dto.classSession.ClassSessionRequest;
import com.backend.dto.classSession.ClassSessionResponse;
import com.backend.service.AttendanceService;
import com.backend.service.ClassSessionService;

import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/class-session")
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class ClassSessionController {
    ClassSessionService classSessionService;
    AttendanceService attendanceService;

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

    @PostMapping("/{classSessionId}/attendance")
    @PreAuthorize("hasAnyRole('STUDENT')")
    public ResponseEntity<ApiResponse<AttendanceResponse>> submitAttendance(@PathVariable String classSessionId,
                                                                            @RequestParam(required = false) String userId,
                                                                            @RequestBody AttendanceRequest attendanceRequest) {
        return ResponseEntity.ok(
                ApiResponse.<AttendanceResponse>builder()
                        .message("Submit attendance")
                        .code("attendance-submit")
                        .data(attendanceService.submitAttendance(classSessionId, userId, attendanceRequest))
                        .build()
        );
    }

    @GetMapping("/{classSessionId}/attendance")
    @PreAuthorize("hasAnyRole('ADMIN', 'TEACHER')")
    public ResponseEntity<ApiResponse<java.util.List<AttendanceResponse>>> getAttendances(@PathVariable String classSessionId) {
        return ResponseEntity.ok(
                ApiResponse.<java.util.List<AttendanceResponse>>builder()
                        .message("Get attendances")
                        .code("attendance-list")
                        .data(attendanceService.getAttendancesForSession(classSessionId))
                        .build()
        );
    }

    @GetMapping("/{classSessionId}/attendance/me")
    @PreAuthorize("hasAnyRole('STUDENT')")
    public ResponseEntity<ApiResponse<AttendanceResponse>> getMyAttendance(@PathVariable String classSessionId) {
        // student id is retrieved from security context in service layer or controller
        String userId = null;
        try {
            userId = org.springframework.security.core.context.SecurityContextHolder.getContext().getAuthentication().getName();
        } catch (Exception ex) {
            // ignore
        }
        AttendanceResponse r = attendanceService.getLatestAttendanceForUser(classSessionId, userId);
        return ResponseEntity.ok(ApiResponse.<AttendanceResponse>builder().message("My attendance").data(r).build());
    }
}
