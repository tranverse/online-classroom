package com.backend.mapper;

import com.backend.dto.classroom.StudentClassroomRequest;
import com.backend.dto.classroom.StudentClassroomResponse;
import com.backend.model.StudentClassroom;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

@Mapper(componentModel = "spring", uses = {UserMapper.class, ClassroomMapper.class})
public interface StudentClassroomMapper {

    StudentClassroom toStudentClassroom(StudentClassroomRequest studentClassroomRequest);

    @Mapping(source = "student", target = "student")
    @Mapping(source = "classroom", target = "classroom")
    StudentClassroomResponse toStudentClassroomResponse(StudentClassroom studentClassroom);

}

