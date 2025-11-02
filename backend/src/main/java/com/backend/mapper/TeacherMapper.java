package com.backend.mapper;

import com.backend.dto.TeacherDTO;
import com.backend.model.Teacher;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.factory.Mappers;

@Mapper(componentModel = "spring")
public interface TeacherMapper {
    TeacherMapper INSTANCE = Mappers.getMapper(TeacherMapper.class);

    @Mapping(target = "userId", source = "user.id")
    @Mapping(target = "email", source = "user.email")
    TeacherDTO toDTO(Teacher teacher);

    @Mapping(target = "user", ignore = true)
    Teacher toEntity(TeacherDTO teacherDTO);
}