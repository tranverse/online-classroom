package com.backend.dto.classroom;

import java.time.LocalDate;

import com.backend.dto.user.UserResponse;

import com.backend.enums.ClassroomStatus;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class ClassroomResponse {
    String id;
    String name;
    LocalDate startDate;
    LocalDate endDate;
    Integer quantity;
    UserResponse teacher;
    ClassroomStatus status;
}
