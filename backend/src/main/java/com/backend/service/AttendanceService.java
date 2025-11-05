package com.backend.service;

import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

import org.springframework.stereotype.Service;

import com.backend.dto.attendance.AttendanceRequest;
import com.backend.dto.attendance.AttendanceResponse;
import com.backend.enums.AttendanceStatus;
import com.backend.model.Attendance;
import com.backend.repository.AttendanceRepository;
import com.backend.repository.ClassSessionRepository;
import com.backend.repository.UserRepository;

import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;

@Service
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class AttendanceService {
    AttendanceRepository attendanceRepository;
    ClassSessionRepository classSessionRepository;
    UserRepository userRepository;
    FaceRecognitionService faceRecognitionService;
    com.backend.service.StudentFaceService studentFaceService;

    public AttendanceResponse submitAttendance(String classSessionId, String userId, AttendanceRequest request) {
        Attendance attendance = new Attendance();
        attendance.setAttendanceTime(LocalDateTime.now());

        // Run face recognition: extract descriptor from image
        java.util.List<Double> descriptor = faceRecognitionService.extractDescriptor(request.getImageBase64());

        boolean matched = false;
        double minDist = Double.MAX_VALUE;
        try {
            if (descriptor != null && !descriptor.isEmpty() && userId != null) {
                java.util.List<java.util.List<Double>> stored = studentFaceService.getDescriptorsForUser(userId);
                for (java.util.List<Double> s : stored) {
                    double d = StudentFaceService.euclidean(s, descriptor);
                    if (d < minDist) minDist = d;
                    if (d <= 0.58) matched = true; // threshold
                }
            }
        } catch (Exception ex) {
            // ignore
        }

        attendance.setIsPassed(matched);
        attendance.setNote("minDistance=" + (minDist == Double.MAX_VALUE ? "-" : minDist));
        attendance.setStatus(matched ? AttendanceStatus.PRESENT : AttendanceStatus.ABSENT);

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

    public AttendanceResponse overrideAttendance(String attendanceId, com.backend.dto.AttendanceUpdateRequest request) {
        Attendance attendance = attendanceRepository.findById(attendanceId).orElseThrow();
        attendance.setStatus(request.getStatus());
        attendance.setNote(request.getVerificationNote());
        // persist update
        Attendance saved = attendanceRepository.save(attendance);
        return toResponse(saved);
    }

    public long countAllAttendances() {
        return attendanceRepository.count();
    }

    public com.backend.dto.admin.AttendanceStats getAttendanceStats() {
        List<Attendance> all = attendanceRepository.findAll();
        long total = all.size();
        long present = all.stream().filter(a -> a.getStatus() == AttendanceStatus.PRESENT).count();
        long suspicious = all.stream().filter(a -> a.getStatus() == com.backend.enums.AttendanceStatus.FAKE_DETECTED).count();
        com.backend.dto.admin.AttendanceStats s = new com.backend.dto.admin.AttendanceStats();
        s.setTotal(total);
        s.setPresent(present);
        s.setSuspicious(suspicious);
        return s;
    }
}
