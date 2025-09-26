package com.backend.dto.classroom;

import com.backend.model.Classroom;
import com.backend.model.User;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDate;

@Getter
@Setter
public class StudentClassroomResponse {
    private Classroom classroom;
    private User student;
    private LocalDate enrollDate;

}
