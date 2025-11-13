package com.backend.dto.classroom;

import com.backend.model.User;
import com.fasterxml.jackson.annotation.JsonFormat;
import jakarta.persistence.ManyToOne;
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

    @JsonFormat(pattern = "yyyy-MM-dd")
    LocalDate startDate;

    @JsonFormat(pattern = "yyyy-MM-dd")
    LocalDate endDate;

    @NotNull(message = "INVALID_QUANTITY")
    Integer quantity;

    User teacher;
}
