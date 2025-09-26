package com.backend.validator;

import jakarta.validation.ConstraintValidator;
import jakarta.validation.ConstraintValidatorContext;

import java.time.LocalDate;
import java.util.Objects;

public class EndDateAfterStartDateValidator implements ConstraintValidator<EndDateAfterStartDate, LocalDate> {
    private String startDate;
    @Override
    public void initialize(EndDateAfterStartDate constraintAnnotation) {
        this.startDate = constraintAnnotation.startDate();
    }

    @Override
    public boolean isValid(LocalDate endDate, ConstraintValidatorContext constraintValidatorContext) {
        if(endDate == null) {
            return false;
        }


        return false;
    }
}
