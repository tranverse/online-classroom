package com.backend.dto;

import com.backend.enums.AttendanceStatus;
import jakarta.validation.constraints.NotNull;
import lombok.Data;


@Data
public class AttendanceUpdateRequest {
    @NotNull
    private AttendanceStatus status;
    
    private String verificationNote;
}