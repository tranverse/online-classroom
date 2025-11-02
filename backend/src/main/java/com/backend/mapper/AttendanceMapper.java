package com.backend.mapper;

import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

import com.backend.dto.AttendanceDTO;
import com.backend.model.Attendance;

@Mapper(componentModel = "spring")
public interface AttendanceMapper {
    
    @Mapping(target = "sessionId", source = "classSession.id")
    @Mapping(target = "studentId", source = "student.id")
    @Mapping(target = "studentName", source = "student.name")
    @Mapping(target = "lastVerifiedAt", expression = "java(attendance.getVerifiedAt() != null ? attendance.getVerifiedAt().toString() : null)")
    @Mapping(target = "manuallyVerified", source = "manuallyVerified")
    AttendanceDTO toDTO(Attendance attendance);
}