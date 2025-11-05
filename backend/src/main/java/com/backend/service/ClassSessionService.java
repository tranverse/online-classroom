package com.backend.service;

import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

import org.springframework.stereotype.Service;

import com.backend.dto.classSession.ClassSessionRequest;
import com.backend.dto.classSession.ClassSessionResponse;
import com.backend.enums.ClassSessionStatus;
import com.backend.enums.ClassSessionType;
import com.backend.mapper.ClassSessionMapper;
import com.backend.model.ClassSession;
import com.backend.model.Classroom;
import com.backend.repository.ClassSessionRepository;
import com.backend.repository.ClassroomRepository;

import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;

@Service
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class ClassSessionService {
    ClassSessionRepository classSessionRepository;
    ClassSessionMapper classSessionMapper;
    ClassroomRepository classroomRepository;

    public ClassSessionResponse addClassSession(ClassSessionRequest classSessionRequest) {
        ClassSession classSession = classSessionMapper.toClassSession(classSessionRequest);
        if (classSessionRequest.getClassroom() != null && classSessionRequest.getClassroom().getId() != null) {
            Classroom classroom = classroomRepository.findById(classSessionRequest.getClassroom().getId()).orElse(null);
            classSession.setClassroom(classroom);
        }
        // ensure defaults for missing fields
        if (classSession.getSessionStatus() == null) {
            // default to IN_PROGRESS to match frontend 'inprogress' semantics
            classSession.setSessionStatus(ClassSessionStatus.IN_PROGRESS);
        }
        if (classSession.getSessionType() == null) {
            classSession.setSessionType(ClassSessionType.LARGE_CLASS);
        }
        if (classSession.getLink() == null || classSession.getLink().isBlank()) {
            // generate a deterministic link token
            String token = UUID.randomUUID().toString();
            classSession.setLink("https://classroom.local/session/" + token);
        }
        if (classSession.getNote() == null) {
            classSession.setNote("");
        }

        return classSessionMapper.toClassSessionResponse(classSessionRepository.save(classSession));
    }

    public ClassSessionResponse updateClassSession(ClassSessionRequest classSessionRequest, String class_Session_Id) {
        // defensive: ensure the existing entity is loaded and updated instead of creating a detached entity with possibly invalid id
        var existingOpt = classSessionRepository.findById(class_Session_Id);
        if (existingOpt.isEmpty()) {
            throw new IllegalArgumentException("ClassSession not found: " + class_Session_Id);
        }
        ClassSession existing = existingOpt.get();

    // copy updatable fields from request (only overwrite non-null values)
    if (classSessionRequest.getTitle() != null) existing.setTitle(classSessionRequest.getTitle());
    if (classSessionRequest.getStartTime() != null) existing.setStartTime(classSessionRequest.getStartTime());
    if (classSessionRequest.getEndTime() != null) existing.setEndTime(classSessionRequest.getEndTime());
    if (classSessionRequest.getLink() != null) existing.setLink(classSessionRequest.getLink());
    if (classSessionRequest.getNote() != null) existing.setNote(classSessionRequest.getNote());
    if (classSessionRequest.getSessionType() != null) existing.setSessionType(classSessionRequest.getSessionType());
    if (classSessionRequest.getSessionStatus() != null) existing.setSessionStatus(classSessionRequest.getSessionStatus());

        if (classSessionRequest.getClassroom() != null && classSessionRequest.getClassroom().getId() != null) {
            Classroom classroom = classroomRepository.findById(classSessionRequest.getClassroom().getId()).orElse(null);
            existing.setClassroom(classroom);
        }

        return classSessionMapper.toClassSessionResponse(classSessionRepository.save(existing));
    }

    public Void deleteClassSession(String classSessionId) {
        classSessionRepository.deleteById(classSessionId);
        return null;
    }

    public ClassSessionResponse getClassSession(String classSessionId) {
        return classSessionMapper.toClassSessionResponse(classSessionRepository.findById(classSessionId).get());
    }

    public List<ClassSessionResponse> getAllClassSessions() {
        return classSessionRepository.findAll().stream().map(classSessionMapper::toClassSessionResponse).collect(Collectors.toList());
    }
}
