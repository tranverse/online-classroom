package com.backend.service;

import java.util.List;
import java.util.stream.Collectors;

import org.springframework.stereotype.Service;

import com.backend.dto.classSession.ClassSessionRequest;
import com.backend.dto.classSession.ClassSessionResponse;
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
        return classSessionMapper.toClassSessionResponse(classSessionRepository.save(classSession));
    }

    public ClassSessionResponse updateClassSession(ClassSessionRequest classSessionRequest, String class_Session_Id) {
        ClassSession updated = classSessionMapper.toClassSession(classSessionRequest);
        // preserve id
        updated.setId(class_Session_Id);
        if (classSessionRequest.getClassroom() != null && classSessionRequest.getClassroom().getId() != null) {
            Classroom classroom = classroomRepository.findById(classSessionRequest.getClassroom().getId()).orElse(null);
            updated.setClassroom(classroom);
        }
        return classSessionMapper.toClassSessionResponse(classSessionRepository.save(updated));
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
