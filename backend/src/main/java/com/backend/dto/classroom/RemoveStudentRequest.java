package com.backend.dto.classroom;

import lombok.Getter;

@Getter
public class RemoveStudentRequest {
    private String studentId;
    private String classroomId;
}
