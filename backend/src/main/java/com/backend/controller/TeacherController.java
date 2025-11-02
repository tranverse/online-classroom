package com.backend.controller;

import java.util.List;

import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.backend.dto.AttendanceDTO;
import com.backend.dto.AttendanceUpdateRequest;
import com.backend.dto.ClassSessionRequest;
import com.backend.model.ClassSession;
import com.backend.model.ClassStatistics;
import com.backend.model.Classroom;
import com.backend.model.User;
import com.backend.service.TeacherService;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/teacher")
@RequiredArgsConstructor
@PreAuthorize("hasRole('TEACHER')")
public class TeacherController {

    private final TeacherService teacherService;

    @GetMapping("/classes")
    public ResponseEntity<List<Classroom>> getTeacherClasses() {
        return ResponseEntity.ok(teacherService.getTeacherClasses());
    }

    @GetMapping("/classes/{classId}/students")
    public ResponseEntity<List<User>> getClassStudents(@PathVariable String classId) {
        return ResponseEntity.ok(teacherService.getClassStudents(classId));
    }

    @GetMapping("/classes/{classId}/sessions")
    public ResponseEntity<List<ClassSession>> getClassSessions(@PathVariable String classId) {
        return ResponseEntity.ok(teacherService.getClassSessions(classId));
    }

    @GetMapping("/classes/{classId}/sessions/upcoming")
    public ResponseEntity<List<ClassSession>> getUpcomingSessions(@PathVariable String classId) {
        return ResponseEntity.ok(teacherService.getUpcomingSessions(classId));
    }

    @GetMapping("/classes/{classId}/sessions/past")
    public ResponseEntity<List<ClassSession>> getPastSessions(@PathVariable String classId) {
        return ResponseEntity.ok(teacherService.getPastSessions(classId));
    }

    @PostMapping("/classes/{classId}/sessions")
    public ResponseEntity<ClassSession> createClassSession(
            @PathVariable String classId,
            @Valid @RequestBody ClassSessionRequest request) {
        return ResponseEntity.ok(teacherService.createClassSession(classId, request));
    }

    @PutMapping("/sessions/{sessionId}")
    public ResponseEntity<ClassSession> updateClassSession(
            @PathVariable String sessionId,
            @Valid @RequestBody ClassSessionRequest request) {
        return ResponseEntity.ok(teacherService.updateClassSession(sessionId, request));
    }

    @DeleteMapping("/sessions/{sessionId}")
    public ResponseEntity<Void> deleteClassSession(@PathVariable String sessionId) {
        teacherService.deleteClassSession(sessionId);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/sessions/{sessionId}/attendance")
    public ResponseEntity<List<AttendanceDTO>> getSessionAttendance(@PathVariable String sessionId) {
        return ResponseEntity.ok(teacherService.getSessionAttendance(sessionId));
    }

    @PatchMapping("/attendance/{attendanceId}")
    public ResponseEntity<AttendanceDTO> updateAttendanceStatus(
            @PathVariable String attendanceId,
            @Valid @RequestBody AttendanceUpdateRequest request) {
        return ResponseEntity.ok(teacherService.updateAttendanceStatus(attendanceId, request));
    }

    @GetMapping("/classes/{classId}/statistics")
    public ResponseEntity<ClassStatistics> getClassStatistics(@PathVariable String classId) {
        return ResponseEntity.ok(teacherService.getClassStatistics(classId));
    }
}