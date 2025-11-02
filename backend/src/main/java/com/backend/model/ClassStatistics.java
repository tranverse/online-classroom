package com.backend.model;

import lombok.Data;

@Data
public class ClassStatistics {
    private String classId;
    private String className;
    private int totalSessions;
    private int totalStudents;
    private double averageAttendanceRate;
    private int presentCount;
    private int absentCount;
    private int suspiciousCount;
}