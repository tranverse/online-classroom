package com.backend.dto;

import com.backend.enums.AttendanceStatus;

import lombok.Data;

@Data
public class AttendanceDTO {
    private String id;
    private String sessionId;
    private String studentId;
    private String studentName;
    private AttendanceStatus status;
    private String lastVerifiedAt;
    private Boolean manuallyVerified;
}