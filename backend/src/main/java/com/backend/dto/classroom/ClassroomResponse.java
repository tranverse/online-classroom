package com.backend.dto.classroom;

import com.backend.model.User;
import jakarta.persistence.ManyToOne;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDate;

@Getter
@Setter
public class ClassroomResponse {
    String name;
    LocalDate startDate;
    LocalDate endDate;
    Integer quantity;
    User teacher;
}
