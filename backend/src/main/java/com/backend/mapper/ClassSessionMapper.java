package com.backend.mapper;

import com.backend.dto.classSession.ClassSessionRequest;
import com.backend.dto.classSession.ClassSessionResponse;
import com.backend.model.ClassSession;
import org.mapstruct.Mapper;

@Mapper(componentModel = "spring")
public interface ClassSessionMapper {
    ClassSession toClassSession(ClassSessionRequest classSessionRequest);

    ClassSessionResponse toClassSessionResponse(ClassSession classSession);
}
