package com.backend.service;

import com.backend.dto.classSession.ClassSessionRequest;
import com.backend.dto.classSession.ClassSessionResponse;
import com.backend.mapper.ClassSessionMapper;
import com.backend.model.ClassSession;
import com.backend.repository.ClassSessionRepository;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class ClassSessionService {
    ClassSessionRepository classSessionRepository;
    ClassSessionMapper classSessionMapper;

    public ClassSessionResponse addClassSession(ClassSessionRequest classSessionRequest) {
        ClassSession classSession = classSessionMapper.toClassSession(classSessionRequest);
        return classSessionMapper.toClassSessionResponse(classSessionRepository.save(classSession));
    }

    public ClassSessionResponse updateClassSession(ClassSessionRequest classSessionRequest, String class_Session_Id) {
        ClassSession classSession = classSessionRepository.findById(class_Session_Id).orElse(null);
        classSession = classSessionMapper.toClassSession(classSessionRequest);
        return classSessionMapper.toClassSessionResponse(classSessionRepository.save(classSession));
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
