package com.backend.controller;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

import com.backend.service.ClassroomService;
import org.springframework.security.core.context.SecurityContextHolder;

import com.backend.repository.UserRepository;
import com.backend.model.User;

import org.springframework.http.HttpStatus;
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

import com.backend.dto.ApiResponse;
import com.backend.dto.AttendanceDTO;
import com.backend.dto.AttendanceUpdateRequest;
import com.backend.dto.ClassSessionRequest;
import com.backend.dto.classroom.ClassroomResponse;
import com.backend.dto.classSession.ClassSessionResponse;
import com.backend.dto.user.UserResponse;
import com.backend.mapper.ClassroomMapper;
import com.backend.mapper.ClassSessionMapper;
import com.backend.mapper.UserMapper;
import com.backend.model.ClassSession;
import com.backend.model.ClassStatistics;
import com.backend.model.Classroom;
import com.backend.model.User;
import com.backend.service.TeacherService;

import jakarta.validation.Valid;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;

@RestController
@RequestMapping("/api/teacher")
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
@RequiredArgsConstructor
@PreAuthorize("hasRole('TEACHER')")
public class TeacherController {

    TeacherService teacherService;
    ClassroomMapper classroomMapper;
    ClassSessionMapper classSessionMapper;
    UserMapper userMapper;
    UserRepository userRepository;
    ClassroomService classroomService;

    @GetMapping("/classes")
    public ResponseEntity<ApiResponse<List<ClassroomResponse>>> getTeacherClasses(@org.springframework.web.bind.annotation.RequestParam(value = "userId", required = false) String userId) {
        try {
            // validate optional userId equals authenticated teacher id
            String email = SecurityContextHolder.getContext().getAuthentication().getName();
            User authUser = userRepository.findByEmail(email).orElse(null);
            if (authUser == null) return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(ApiResponse.<List<ClassroomResponse>>builder().success(false).message("User not found").build());
            if (userId != null && !userId.isBlank() && !userId.equals(authUser.getId())) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN).body(ApiResponse.<List<ClassroomResponse>>builder().success(false).message("Forbidden").build());
            }

            List<Classroom> classes = teacherService.getTeacherClasses();
            List<ClassroomResponse> resp = classes == null ? List.of() : classes.stream().map(classroomMapper::toClassroomResponse).collect(Collectors.toList());
            return ResponseEntity.ok(ApiResponse.<List<ClassroomResponse>>builder().message("Get teacher classes successfully").code("teacher-classes-get").data(resp).build());
        } catch (Exception ex) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(ApiResponse.<List<ClassroomResponse>>builder().success(false).message("Failed to fetch teacher classes").build());
        }
    }

    @GetMapping("/classes/{classId}/students")
    public ResponseEntity<ApiResponse<List<UserResponse>>> getClassStudents(@PathVariable String classId) {
        try {
            List<User> users = teacherService.getClassStudents(classId);
            List<UserResponse> resp = users == null ? List.of() : users.stream().map(userMapper::toUserResponse).collect(Collectors.toList());
            return ResponseEntity.ok(ApiResponse.<List<UserResponse>>builder().message("Get class students successfully").code("teacher-class-students-get").data(resp).build());
        } catch (Exception ex) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(ApiResponse.<List<UserResponse>>builder().success(false).message("Failed to fetch class students").build());
        }
    }

    @GetMapping("/classes/{classId}/sessions")
    public ResponseEntity<ApiResponse<List<ClassSessionResponse>>> getClassSessions(@PathVariable String classId) {
        try {
            List<ClassSession> sessions = teacherService.getClassSessions(classId);
            List<ClassSessionResponse> resp = sessions == null ? List.of() : sessions.stream().map(classSessionMapper::toClassSessionResponse).collect(Collectors.toList());
            return ResponseEntity.ok(ApiResponse.<List<ClassSessionResponse>>builder().message("Get class sessions successfully").code("teacher-class-sessions-get").data(resp).build());
        } catch (Exception ex) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(ApiResponse.<List<ClassSessionResponse>>builder().success(false).message("Failed to fetch class sessions").build());
        }
    }

    @GetMapping("/classes/{classId}/sessions/upcoming")
    public ResponseEntity<ApiResponse<List<ClassSessionResponse>>> getUpcomingSessions(@PathVariable String classId) {
        try {
            List<ClassSession> sessions = teacherService.getUpcomingSessions(classId);
            List<ClassSessionResponse> resp = sessions == null ? List.of() : sessions.stream().map(classSessionMapper::toClassSessionResponse).collect(Collectors.toList());
            return ResponseEntity.ok(ApiResponse.<List<ClassSessionResponse>>builder().message("Get upcoming sessions successfully").code("teacher-class-sessions-upcoming").data(resp).build());
        } catch (Exception ex) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(ApiResponse.<List<ClassSessionResponse>>builder().success(false).message("Failed to fetch upcoming sessions").build());
        }
    }

    @GetMapping("/classes/{classId}/sessions/past")
    public ResponseEntity<ApiResponse<List<ClassSessionResponse>>> getPastSessions(@PathVariable String classId) {
        try {
            List<ClassSession> sessions = teacherService.getPastSessions(classId);
            List<ClassSessionResponse> resp = sessions == null ? List.of() : sessions.stream().map(classSessionMapper::toClassSessionResponse).collect(Collectors.toList());
            return ResponseEntity.ok(ApiResponse.<List<ClassSessionResponse>>builder().message("Get past sessions successfully").code("teacher-class-sessions-past").data(resp).build());
        } catch (Exception ex) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(ApiResponse.<List<ClassSessionResponse>>builder().success(false).message("Failed to fetch past sessions").build());
        }
    }

    @PostMapping("/classes/{classId}/sessions")
    public ResponseEntity<ApiResponse<ClassSessionResponse>> createClassSession(@PathVariable String classId, @Valid @RequestBody ClassSessionRequest request) {
        try {
            ClassSession session = teacherService.createClassSession(classId, request);
            ClassSessionResponse resp = classSessionMapper.toClassSessionResponse(session);
            return ResponseEntity.ok(ApiResponse.<ClassSessionResponse>builder().message("Create session successfully").code("teacher-session-create").data(resp).build());
        } catch (Exception ex) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(ApiResponse.<ClassSessionResponse>builder().success(false).message("Failed to create session").build());
        }
    }

    @PutMapping("/sessions/{sessionId}")
    public ResponseEntity<ApiResponse<ClassSessionResponse>> updateClassSession(@PathVariable String sessionId, @Valid @RequestBody ClassSessionRequest request) {
        try {
            ClassSession session = teacherService.updateClassSession(sessionId, request);
            ClassSessionResponse resp = classSessionMapper.toClassSessionResponse(session);
            return ResponseEntity.ok(ApiResponse.<ClassSessionResponse>builder().message("Update session successfully").code("teacher-session-update").data(resp).build());
        } catch (Exception ex) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(ApiResponse.<ClassSessionResponse>builder().success(false).message("Failed to update session").build());
        }
    }

    @DeleteMapping("/sessions/{sessionId}")
    public ResponseEntity<ApiResponse<?>> deleteClassSession(@PathVariable String sessionId) {
        try {
            teacherService.deleteClassSession(sessionId);
            return ResponseEntity.ok(ApiResponse.builder().message("Delete session successfully").code("teacher-session-delete").build());
        } catch (Exception ex) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(ApiResponse.builder().success(false).message("Failed to delete session").build());
        }
    }

    @GetMapping("/sessions/{sessionId}/attendance")
    public ResponseEntity<ApiResponse<List<AttendanceDTO>>> getSessionAttendance(@PathVariable String sessionId) {
        try {
            List<AttendanceDTO> out = teacherService.getSessionAttendance(sessionId);
            return ResponseEntity.ok(ApiResponse.<List<AttendanceDTO>>builder().message("Get attendance successfully").code("teacher-session-attendance-get").data(out).build());
        } catch (Exception ex) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(ApiResponse.<List<AttendanceDTO>>builder().success(false).message("Failed to fetch attendance").build());
        }
    }

    @PatchMapping("/attendance/{attendanceId}")
    public ResponseEntity<ApiResponse<AttendanceDTO>> updateAttendanceStatus(@PathVariable String attendanceId, @Valid @RequestBody AttendanceUpdateRequest request) {
        try {
            AttendanceDTO out = teacherService.updateAttendanceStatus(attendanceId, request);
            return ResponseEntity.ok(ApiResponse.<AttendanceDTO>builder().message("Update attendance successfully").code("teacher-attendance-update").data(out).build());
        } catch (Exception ex) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(ApiResponse.<AttendanceDTO>builder().success(false).message("Failed to update attendance").build());
        }
    }

    @GetMapping("/classes/{classId}/statistics")
    public ResponseEntity<ApiResponse<ClassStatistics>> getClassStatistics(@PathVariable String classId) {
        try {
            ClassStatistics out = teacherService.getClassStatistics(classId);
            return ResponseEntity.ok(ApiResponse.<ClassStatistics>builder().message("Get statistics successfully").code("teacher-class-statistics-get").data(out).build());
        } catch (Exception ex) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(ApiResponse.<ClassStatistics>builder().success(false).message("Failed to fetch statistics").build());
        }
    }

    // GET /api/teacher/classes/user/{userId} - return classes for specified teacher id
    @GetMapping("/classes/user/{userId}")
    public ResponseEntity<ApiResponse<List<ClassroomResponse>>> getTeacherClassesByUser(@PathVariable String userId) {
        try {
            List<Classroom> classes = teacherService.getTeacherClassesByTeacherId(userId);
            List<ClassroomResponse> resp = classes == null ? List.of() : classes.stream().map(classroomMapper::toClassroomResponse).collect(Collectors.toList());
            return ResponseEntity.ok(ApiResponse.<List<ClassroomResponse>>builder().message("Get teacher classes successfully").code("teacher-classes-get-by-user").data(resp).build());
        } catch (Exception ex) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(ApiResponse.<List<ClassroomResponse>>builder().success(false).message("Failed to fetch teacher classes").build());
        }
    }

    @GetMapping("/classes/{id}/details")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getClassDetails(@PathVariable String id) {
        var classResp = classroomService.getClassroom(id);
        var students = classroomService.getStudentsForClassroom(id);
        Map<String, Object> body = new HashMap<>();
        body.put("classroom", classResp);
        body.put("students", students);
        return ResponseEntity.ok(ApiResponse.<Map<String, Object>>builder().code("admin-class-details").message("Class details").data(body).build());
    }

}