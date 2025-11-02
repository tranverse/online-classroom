package com.backend.controller;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

import org.springframework.data.domain.Page;
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
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.backend.dto.ApiResponse;
import com.backend.dto.AttendanceUpdateRequest;
import com.backend.dto.attendance.AttendanceResponse;
import com.backend.dto.classSession.ClassSessionRequest;
import com.backend.dto.classSession.ClassSessionResponse;
import com.backend.dto.classroom.ClassroomRequest;
import com.backend.dto.classroom.StudentClassroomRequest;
import com.backend.dto.classroom.StudentClassroomResponse;
import com.backend.model.Classroom;
// java.time.LocalDate removed; not needed here
import java.util.ArrayList;
import com.backend.dto.classroom.ClassroomResponse;
// unused import removed
import com.backend.dto.user.UserResponse;
import com.backend.dto.user.UserCreateRequest;
import java.time.LocalDate;
import com.backend.model.User;
import com.backend.service.AttendanceService;
import com.backend.service.ClassSessionService;
import com.backend.service.ClassroomService;
import com.backend.service.UserService;

import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;

@RestController
@RequestMapping("/api/admin")
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
@PreAuthorize("hasRole('ADMIN')")
public class AdminController {
    UserService userService;
    ClassroomService classroomService;
    ClassSessionService classSessionService;
    AttendanceService attendanceService;

    // Users
    @GetMapping("/users")
    public ResponseEntity<ApiResponse<Map<String, Object>>> listUsers(@RequestParam(defaultValue = "1") int page,
                                                                        @RequestParam(defaultValue = "10") int pageSize) {
        Page<User> users = userService.getAllUsers(page, pageSize);
        Map<String, Object> body = new HashMap<>();
        body.put("data", users.getContent());
        body.put("total", users.getTotalElements());
        body.put("page", page);
        body.put("pageSize", pageSize);
        return ResponseEntity.ok(ApiResponse.<Map<String, Object>>builder()
                .code("admin-users-list")
                .message("List users")
                .data(body)
                .build());
    }

    @PostMapping("/users")
    public ResponseEntity<ApiResponse<UserResponse>> createUser(@RequestBody UserCreateRequest request) {
        return ResponseEntity.ok(ApiResponse.<UserResponse>builder()
                .code("admin-user-create")
                .message("Create user")
                .data(userService.createUser(request))
                .build());
    }

    @PutMapping("/users/{id}")
    public ResponseEntity<ApiResponse<UserResponse>> updateUser(@PathVariable String id, @RequestBody UserCreateRequest request) {
        return ResponseEntity.ok(ApiResponse.<UserResponse>builder()
                .code("admin-user-update")
                .message("Update user")
                .data(userService.updateUser(id, request))
                .build());
    }

    @DeleteMapping("/users/{id}")
    public ResponseEntity<ApiResponse<Void>> deleteUser(@PathVariable String id) {
        userService.deleteUser(id);
        return ResponseEntity.ok(ApiResponse.<Void>builder().code("admin-user-delete").message("Deleted").data(null).build());
    }

    @PatchMapping("/users/{id}/role")
    public ResponseEntity<ApiResponse<UserResponse>> assignRole(@PathVariable String id, @RequestParam("role") String role) {
        var resp = userService.assignRole(id, com.backend.enums.Role.valueOf(role));
        return ResponseEntity.ok(ApiResponse.<UserResponse>builder().code("admin-user-assign-role").message("Role assigned").data(resp).build());
    }

    // Classrooms
    @GetMapping("/classes")
    public ResponseEntity<ApiResponse<List<ClassroomResponse>>> listClasses() {
        return ResponseEntity.ok(ApiResponse.<List<ClassroomResponse>>builder()
                .code("admin-classes-list")
                .message("List classes")
                .data(classroomService.getAllClassrooms())
                .build());
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

    @PostMapping("/classes")
    public ResponseEntity<ApiResponse<ClassroomResponse>> createClass(@RequestBody ClassroomRequest request) {
        return ResponseEntity.ok(ApiResponse.<ClassroomResponse>builder()
                .code("admin-class-create")
                .message("Create class")
                .data(classroomService.createClassroom(request))
                .build());
    }

    @PutMapping("/classes/{id}")
    public ResponseEntity<ApiResponse<ClassroomResponse>> updateClass(@PathVariable String id, @RequestBody ClassroomRequest request) {
        return ResponseEntity.ok(ApiResponse.<ClassroomResponse>builder()
                .code("admin-class-update")
                .message("Update class")
                .data(classroomService.updateClassroom(request, id))
                .build());
    }

    @DeleteMapping("/classes/{id}")
    public ResponseEntity<ApiResponse<Void>> deleteClass(@PathVariable String id) {
        classroomService.deleteClassroom(id);
        return ResponseEntity.ok(ApiResponse.<Void>builder().code("admin-class-delete").message("Deleted").data(null).build());
    }

    @PostMapping("/classes/{id}/invite")
    public ResponseEntity<ApiResponse<?>> inviteToClass(@PathVariable String id, @RequestBody List<String> userIds) {
        // Accept list of existing user IDs and enroll them into the classroom
        var results = new ArrayList<StudentClassroomResponse>();
        for (String userId : userIds) {
            StudentClassroomRequest req = new StudentClassroomRequest();
            Classroom c = new Classroom();
            c.setId(id);
            User u = new User();
            u.setId(userId);
            req.setClassroom(c);
            req.setStudent(u);
            req.setEnrollDate(LocalDate.now());
            try {
                var resp = classroomService.addStudentClassroom(req);
                results.add(resp);
            } catch (Exception ex) {
                // swallow individual errors and continue; collect nothing for failed ones
            }
        }
        return ResponseEntity.ok(ApiResponse.builder().code("admin-class-invite").message("Invites processed").data(results).build());
    }

    // Sessions
    @GetMapping("/classes/{id}/sessions")
    public ResponseEntity<ApiResponse<List<ClassSessionResponse>>> getClassSessions(@PathVariable String id) {
        var all = classSessionService.getAllClassSessions();
        // filter by classroom id
        var filtered = all.stream().filter(s -> s.getClassroom() != null && id.equals(s.getClassroom().getId())).toList();
        return ResponseEntity.ok(ApiResponse.<List<ClassSessionResponse>>builder().code("admin-sessions-list").message("List sessions").data(filtered).build());
    }

    @PostMapping("/sessions")
    public ResponseEntity<ApiResponse<ClassSessionResponse>> createSession(@RequestBody ClassSessionRequest request) {
        return ResponseEntity.ok(ApiResponse.<ClassSessionResponse>builder().code("admin-session-create").message("Create session").data(classSessionService.addClassSession(request)).build());
    }

    @PutMapping("/sessions/{id}")
    public ResponseEntity<ApiResponse<ClassSessionResponse>> updateSession(@PathVariable String id, @RequestBody ClassSessionRequest request) {
        return ResponseEntity.ok(ApiResponse.<ClassSessionResponse>builder().code("admin-session-update").message("Update session").data(classSessionService.updateClassSession(request, id)).build());
    }

    @DeleteMapping("/sessions/{id}")
    public ResponseEntity<ApiResponse<Void>> deleteSession(@PathVariable String id) {
        classSessionService.deleteClassSession(id);
        return ResponseEntity.ok(ApiResponse.<Void>builder().code("admin-session-delete").message("Deleted").data(null).build());
    }

    // Attendance
    @GetMapping("/attendance/{sessionId}")
    public ResponseEntity<ApiResponse<List<AttendanceResponse>>> getAttendanceForSession(@PathVariable String sessionId) {
        return ResponseEntity.ok(ApiResponse.<List<AttendanceResponse>>builder().code("admin-attendance-list").message("List attendance").data(attendanceService.getAttendancesForSession(sessionId)).build());
    }

    @PatchMapping("/attendance/{id}")
    public ResponseEntity<ApiResponse<AttendanceResponse>> overrideAttendance(@PathVariable String id, @RequestBody AttendanceUpdateRequest request) {
        return ResponseEntity.ok(ApiResponse.<AttendanceResponse>builder().code("admin-attendance-override").message("Override").data(attendanceService.overrideAttendance(id, request)).build());
    }

    // Dashboard
    @GetMapping("/dashboard/stats")
    public ResponseEntity<ApiResponse<com.backend.dto.admin.DashboardStats>> getDashboardStats() {
        // total users
        var usersPage = userService.getAllUsers(1, 1);
        long totalUsers = usersPage.getTotalElements();

        // total classes
        long totalClasses = classroomService.getAllClassrooms().size();

    // attendance stats
    com.backend.dto.admin.AttendanceStats attendanceStats = attendanceService.getAttendanceStats();

        com.backend.dto.admin.DashboardStats stats = new com.backend.dto.admin.DashboardStats();
        stats.setTotalClassrooms(totalClasses);
        stats.setTotalUsers(totalUsers);
        stats.setAttendanceStats(attendanceStats);

        return ResponseEntity.ok(ApiResponse.<com.backend.dto.admin.DashboardStats>builder().code("admin-dashboard-stats").message("Dashboard stats").data(stats).build());
    }
}
