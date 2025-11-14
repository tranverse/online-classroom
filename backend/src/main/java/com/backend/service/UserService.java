package com.backend.service;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.backend.dto.AttendanceDTO;
import com.backend.dto.AttendanceUpdateRequest;
import com.backend.dto.ClassSessionRequest;
import com.backend.dto.user.UserCreateRequest;
import com.backend.dto.user.UserResponse;
import com.backend.enums.AttendanceStatus;
import com.backend.enums.ClassSessionStatus;
import com.backend.enums.Role;
import com.backend.exception.AppException;
import com.backend.exception.ErrorCode;
import com.backend.exception.ResourceNotFoundException;
import com.backend.exception.UnauthorizedAccessException;
import com.backend.mapper.AttendanceMapper;
import com.backend.mapper.UserMapper;
import com.backend.model.Attendance;
import com.backend.model.ClassSession;
import com.backend.model.ClassStatistics;
import com.backend.model.Classroom;
import com.backend.model.User;
import com.backend.repository.AttendanceRepository;
import com.backend.repository.ClassSessionRepository;
import com.backend.repository.ClassroomRepository;
import com.backend.repository.UserRepository;

import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;

@Service
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class UserService {
    final UserRepository userRepository;
    final UserMapper userMapper;
    final ClassroomRepository classroomRepository;
    final ClassSessionRepository sessionRepository;
    final AttendanceRepository attendanceRepository;
    final AttendanceMapper attendanceMapper;
    private final PasswordEncoder passwordEncoder;

    public UserResponse getUserInformation(String email) {
        User user = userRepository.findByEmail(email).orElseThrow(() ->
                new AppException(ErrorCode.USER_NOT_FOUND));
        return userMapper.toUserResponse(user);
    }

    public UserResponse createUser(UserCreateRequest userCreateRequest) {
        if(userRepository.existsByEmailAndRole(userCreateRequest.getEmail(), userCreateRequest.getRole())) {
            throw new AppException(ErrorCode.EMAIL_EXISTED);
        }
        User user = userMapper.toUser(userCreateRequest);
        String defaultPassword = "123";
        user.setPassword(passwordEncoder.encode(defaultPassword));

        return userMapper.toUserResponse(userRepository.save(user));
    }

    public List<UserResponse> getTeacherList(Role role){
        if(role != Role.TEACHER){
            throw new AppException(ErrorCode.INVALID_ROLE);
        }
        List<User> teachers = userRepository.findByRole(role);

        List<UserResponse> userResponses = new ArrayList<>();

        for(User user : teachers){
            userResponses.add(userMapper.toUserResponse(user));
        }
        return userResponses;
    }

    // Admin helpers
    public Page<User> getAllUsers(int page, int pageSize) {
        Pageable pageable = PageRequest.of(page - 1, pageSize);
        return userRepository.findAll(pageable);
    }

    public UserResponse updateUser(String id, UserCreateRequest request) {
        User user = userRepository.findById(id).orElseThrow(() -> new AppException(ErrorCode.USER_NOT_FOUND));
        // update allowed fields
        if (request.getName() != null) user.setName(request.getName());
        if (request.getEmail() != null) user.setEmail(request.getEmail());
        if (request.getPhone() != null) user.setPhone(request.getPhone());
        if (request.getRole() != null) user.setRole(request.getRole());
        return userMapper.toUserResponse(userRepository.save(user));
    }

    public void deleteUser(String id) {
        User user = userRepository.findById(id).orElseThrow(() -> new AppException(ErrorCode.USER_NOT_FOUND));
        userRepository.delete(user);
    }

    public UserResponse assignRole(String id, Role role) {
        User user = userRepository.findById(id).orElseThrow(() -> new AppException(ErrorCode.USER_NOT_FOUND));
        user.setRole(role);
        return userMapper.toUserResponse(userRepository.save(user));
    }

    // --- Teacher logic moved from TeacherService ---
    private User getCurrentTeacher() {
        String email = SecurityContextHolder.getContext().getAuthentication().getName();
        return userRepository.findByEmail(email)
                .orElseThrow(() -> new UnauthorizedAccessException("Teacher not found"));
    }

    private void validateTeacherClassAccess(String classId) {
        User teacher = getCurrentTeacher();
        if (!classroomRepository.existsByIdAndTeacherId(classId, teacher.getId())) {
            throw new UnauthorizedAccessException("You don't have access to this class");
        }
    }

    @Transactional(readOnly = true)
    public List<Classroom> getTeacherClasses() {
        User teacher = getCurrentTeacher();
        return classroomRepository.findAllByTeacherId(teacher.getId());
    }

    @Transactional(readOnly = true)
    public List<User> getClassStudents(String classId) {
        validateTeacherClassAccess(classId);
        return userRepository.findAllStudentsByClassId(classId);
    }

    @Transactional(readOnly = true)
    public List<ClassSession> getClassSessions(String classId) {
        validateTeacherClassAccess(classId);
        return sessionRepository.findAllByClassroomIdOrderByStartTimeDesc(classId);
    }

    @Transactional(readOnly = true)
    public List<ClassSession> getUpcomingSessions(String classId) {
        validateTeacherClassAccess(classId);
        return sessionRepository.findUpcomingSessionsByClassroom(classId, LocalDateTime.now());
    }

    @Transactional(readOnly = true)
    public List<ClassSession> getPastSessions(String classId) {
        validateTeacherClassAccess(classId);
        return sessionRepository.findPastSessionsByClassroom(classId, LocalDateTime.now());
    }

    @Transactional
    public ClassSession createClassSession(String classId, ClassSessionRequest request) {
        validateTeacherClassAccess(classId);
        
        Classroom classroom = classroomRepository.findById(classId)
                .orElseThrow(() -> new ResourceNotFoundException("Classroom not found"));

        // Create new session
        ClassSession session = new ClassSession();
        session.setClassroom(classroom);
        session.setTitle(request.getTitle());
        session.setStartTime(request.getStartTime());
        session.setEndTime(request.getEndTime());
        session.setLink(request.getMeetingUrl());
        session.setNote(request.getDescription());
        session.setSessionType(request.getSessionType());
    session.setSessionStatus(ClassSessionStatus.UPCOMING);

        session = sessionRepository.save(session);

        // Create pending attendance records for all students
        List<User> students = getClassStudents(classId);
        for (User student : students) {
            Attendance attendance = new Attendance();
            attendance.setClassSession(session);
            attendance.setStudent(student);
            attendance.setStatus(AttendanceStatus.PENDING);
            attendance.setCreatedAt(LocalDateTime.now());
            attendance.setUpdatedAt(LocalDateTime.now());
            attendanceRepository.save(attendance);
        }

        return session;
    }

    @Transactional
    public ClassSession updateClassSession(String sessionId, ClassSessionRequest request) {
        ClassSession session = sessionRepository.findById(sessionId)
                .orElseThrow(() -> new ResourceNotFoundException("Session not found"));

        validateTeacherClassAccess(session.getClassroom().getId());

        session.setTitle(request.getTitle());
        session.setNote(request.getDescription());
        session.setStartTime(request.getStartTime());
        session.setEndTime(request.getEndTime());
        session.setLink(request.getMeetingUrl());
        session.setSessionType(request.getSessionType());

        return sessionRepository.save(session);
    }

    @Transactional
    public void deleteClassSession(String sessionId) {
        ClassSession session = sessionRepository.findById(sessionId)
                .orElseThrow(() -> new ResourceNotFoundException("Session not found"));

        validateTeacherClassAccess(session.getClassroom().getId());
        
        // First delete all associated attendance records
        attendanceRepository.deleteByClassSessionId(sessionId);
        
        // Then delete the session
        sessionRepository.delete(session);
    }

    @Transactional(readOnly = true)
    public List<AttendanceDTO> getSessionAttendance(String sessionId) {
        ClassSession session = sessionRepository.findById(sessionId)
                .orElseThrow(() -> new ResourceNotFoundException("Session not found"));

        validateTeacherClassAccess(session.getClassroom().getId());

        return attendanceRepository.findAllByClassSessionId(sessionId)
                .stream()
                .map(attendanceMapper::toDTO)
                .collect(Collectors.toList());
    }

    @Transactional
    public AttendanceDTO updateAttendanceStatus(String attendanceId, AttendanceUpdateRequest request) {
        Attendance attendance = attendanceRepository.findById(attendanceId)
                .orElseThrow(() -> new ResourceNotFoundException("Attendance record not found"));

        validateTeacherClassAccess(attendance.getClassSession().getClassroom().getId());

        // Update attendance status
        attendance.setStatus(request.getStatus());
        attendance.setNote(request.getVerificationNote());
        attendance.setManuallyVerified(true);
        attendance.setVerifiedAt(LocalDateTime.now());
        attendance.setUpdatedAt(LocalDateTime.now());

        return attendanceMapper.toDTO(attendanceRepository.save(attendance));
    }

    @Transactional(readOnly = true)
    public ClassStatistics getClassStatistics(String classId) {
        validateTeacherClassAccess(classId);

        Classroom classroom = classroomRepository.findById(classId)
                .orElseThrow(() -> new ResourceNotFoundException("Classroom not found"));

        List<Attendance> allAttendance = attendanceRepository.findAllByClassroomId(classId);
        
        ClassStatistics stats = new ClassStatistics();
        stats.setClassId(classId);
        stats.setClassName(classroom.getName());
        stats.setTotalSessions(sessionRepository.countByClassroomId(classId));
        stats.setTotalStudents(userRepository.countStudentsByClassId(classId));
        
        // Count attendance by status
        int presentCount = 0;
        int absentCount = 0;
        int suspiciousCount = 0;
        int lateCount = 0;
        int pendingCount = 0;
        
        for (Attendance a : allAttendance) {
            switch (a.getStatus()) {
                case PRESENT -> presentCount++;
                case ABSENT -> absentCount++;
                case FAKE_DETECTED -> suspiciousCount++;
                case LATE -> lateCount++;
                case PENDING -> pendingCount++;
                case LEFT_EARLY -> absentCount++;
                case UNVERIFIED -> pendingCount++;
            }
        }
        
        stats.setPresentCount(presentCount);
        stats.setAbsentCount(absentCount);
        stats.setSuspiciousCount(suspiciousCount);
        
        // Calculate attendance rate (present + late) / total
        double totalRecords = allAttendance.size() - pendingCount; // Exclude pending from calculation
        if (totalRecords > 0) {
            double attendanceRate = (double) (presentCount + lateCount) / totalRecords * 100;
            stats.setAverageAttendanceRate(attendanceRate);
        }
        
        return stats;
    }
}
