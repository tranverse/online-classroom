package com.backend.dto.classroom;

import java.time.LocalDate;

import com.backend.dto.user.UserResponse;

import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class StudentClassroomResponse {
    private ClassroomResponse classroom;
    private UserResponse student;
    private LocalDate enrollDate;

}
