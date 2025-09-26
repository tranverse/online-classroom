package com.backend.validator;

import jakarta.validation.Constraint;
import jakarta.validation.Payload;

import java.lang.annotation.*;
import java.time.LocalDate;

@Target({ ElementType.FIELD})
@Retention(RetentionPolicy.RUNTIME)
@Documented
@Constraint(
        validatedBy = {EndDateAfterStartDateValidator.class}
)
public @interface EndDateAfterStartDate {
    String message() default "End date after start date";

    Class<?>[] groups() default {};

    Class<? extends Payload>[] payload() default {};

    String startDate();
}
