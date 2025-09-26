package com.backend.mapper;

import com.backend.dto.classroom.StudentClassroomRequest;
import com.backend.dto.classroom.StudentClassroomResponse;
import com.backend.model.StudentClassroom;
import org.mapstruct.Mapper;

@Mapper(componentModel = "spring")
public interface StudentClassroomMapper {

    StudentClassroom toStudentClassroom(StudentClassroomRequest studentClassroomRequest);

    StudentClassroomResponse toStudentClassroomResponse(StudentClassroom studentClassroom);




}
