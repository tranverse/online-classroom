package com.backend.model;

import java.time.LocalDateTime;

import com.backend.enums.AttendanceStatus;
import com.fasterxml.jackson.annotation.JsonBackReference;

import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import lombok.AccessLevel;
import lombok.AllArgsConstructor;
import lombok.NoArgsConstructor;
import lombok.experimental.FieldDefaults;

@Entity
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
@lombok.Data
public class Attendance {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    String id;

    LocalDateTime attendanceTime;

    Boolean isPassed;

    String note;

    @Enumerated(EnumType.STRING)
    @jakarta.persistence.Column(length = 32)
    AttendanceStatus status;

    @ManyToOne
    @JoinColumn(name = "student_id")
    @JsonBackReference(value = "student_attendance")
    User student;

    @ManyToOne
    @JoinColumn(name = "class_session_id")
    ClassSession classSession;

    // audit and verification fields
    LocalDateTime createdAt;
    LocalDateTime updatedAt;
    LocalDateTime verifiedAt;
    Boolean manuallyVerified;



}
