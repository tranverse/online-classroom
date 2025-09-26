package com.backend.dto.classroom;

import com.backend.model.Classroom;
import com.backend.model.User;
import jakarta.validation.constraints.NotBlank;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDate;

@Getter
@Setter
public class StudentClassroomRequest {
    @NotBlank(message = "Please choose classroom")
    private Classroom classroom;

    @NotBlank(message = "Please choose student")
    private User student;

    @NotBlank(message = "Please choose enroll date")
    private LocalDate enrollDate;
}
