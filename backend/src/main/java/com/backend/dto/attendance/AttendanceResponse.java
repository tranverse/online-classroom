package com.backend.dto.attendance;

import java.time.LocalDateTime;

import com.backend.enums.AttendanceStatus;

import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class AttendanceResponse {
    String id;
    LocalDateTime attendanceTime;
    Boolean isPassed;
    String note;
    AttendanceStatus status;
}
