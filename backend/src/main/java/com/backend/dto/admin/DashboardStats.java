package com.backend.dto.admin;

import lombok.Data;

@Data
public class DashboardStats {
    private long totalClassrooms;
    private long totalUsers;
    private com.backend.dto.admin.AttendanceStats attendanceStats;
}
 
