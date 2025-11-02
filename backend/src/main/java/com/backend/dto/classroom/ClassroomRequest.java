package com.backend.dto.classroom;

import com.backend.model.User;
import jakarta.persistence.ManyToOne;
import jakarta.validation.constraints.FutureOrPresent;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.Setter;
import lombok.experimental.FieldDefaults;
import org.springframework.format.annotation.NumberFormat;

import java.time.LocalDate;

@Getter
@Setter
@FieldDefaults(level = AccessLevel.PRIVATE)
public class ClassroomRequest {

    @NotBlank(message = "INVALID_NAME")
    String name;

    @FutureOrPresent(message = "INVALID_DATE")
    LocalDate startDate;

    @FutureOrPresent(message = "INVALID_DATE")
    LocalDate endDate;

    @NotNull(message = "INVALID_QUANTITY")
    Integer quantity;

    User teacher;
}
