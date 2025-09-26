package com.backend.dto.classroom;

import com.backend.model.User;
import jakarta.persistence.ManyToOne;
import jakarta.validation.constraints.FutureOrPresent;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.Setter;
import lombok.experimental.FieldDefaults;

import java.time.LocalDate;

@Getter
@Setter
@FieldDefaults(level = AccessLevel.PRIVATE)
public class ClassroomRequest {
    String name;

    @FutureOrPresent(message = "INVALID_DATE")
    LocalDate startDate;

    LocalDate endDate;

    Integer quantity;

    User teacher;
}
