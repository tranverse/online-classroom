package com.backend.mapper;

import com.backend.dto.classroom.ClassroomRequest;
import com.backend.dto.classroom.ClassroomResponse;
import com.backend.model.Classroom;
import org.mapstruct.Mapper;

import java.util.List;

@Mapper(componentModel = "spring")
public interface ClassroomMapper {
    Classroom toClassRoom(ClassroomRequest classroomRequest);

    ClassroomResponse toClassroomResponse(Classroom classRoom);

}
