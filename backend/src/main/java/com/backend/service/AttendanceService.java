package com.backend.service;

import com.backend.dto.attendance.AttendanceRequest;
import com.backend.dto.attendance.AttendanceResponse;
import com.backend.enums.AttendanceStatus;
import com.backend.model.Attendance;
import com.backend.model.ClassSession;
import com.backend.model.User;
import com.backend.repository.AttendanceRepository;
import com.backend.repository.ClassSessionRepository;
import com.backend.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import lombok.AccessLevel;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class AttendanceService {
    AttendanceRepository attendanceRepository;
    ClassSessionRepository classSessionRepository;
    UserRepository userRepository;
    FaceRecognitionService faceRecognitionService;

    public AttendanceResponse submitAttendance(String classSessionId, String userId, AttendanceRequest request) {
        Attendance attendance = new Attendance();
        attendance.setAttendanceTime(LocalDateTime.now());

        // Run face recognition/liveness
        FaceRecognitionService.MatchResult result = faceRecognitionService.analyze(request.getImageBase64());

        attendance.setIsPassed(result.matched);
        attendance.setNote("similarity=" + result.similarity + ", liveness=" + result.livenessScore);
        attendance.setStatus(result.matched ? AttendanceStatus.PRESENT : AttendanceStatus.ABSENT);

        // Link student and class session if available
        if (userId != null) userRepository.findById(userId).ifPresent(attendance::setStudent);
        classSessionRepository.findById(classSessionId).ifPresent(attendance::setClassSession);

        Attendance saved = attendanceRepository.save(attendance);
        return toResponse(saved);
    }

    public List<AttendanceResponse> getAttendancesForSession(String classSessionId) {
        return attendanceRepository.findAll().stream()
                .filter(a -> a.getClassSession() != null && classSessionId.equals(a.getClassSession().getId()))
                .map(this::toResponse)
                .collect(Collectors.toList());
    }

    private AttendanceResponse toResponse(Attendance a) {
        AttendanceResponse r = new AttendanceResponse();
        r.setId(a.getId());
        r.setAttendanceTime(a.getAttendanceTime());
        r.setIsPassed(a.getIsPassed());
        r.setNote(a.getNote());
        r.setStatus(a.getStatus());
        return r;
    }
}
