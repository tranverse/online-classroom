package com.backend.dto.admin;

import lombok.Data;

@Data
public class AttendanceStats {
    private long total;
    private long present;
    private long suspicious;
}
