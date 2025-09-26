package com.backend.model;

import com.backend.enums.AttendanceStatus;
import com.fasterxml.jackson.annotation.JsonBackReference;
import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.AllArgsConstructor;
import lombok.NoArgsConstructor;
import lombok.experimental.FieldDefaults;

import java.time.LocalDateTime;

@Entity
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class Attendance {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    String id;

    LocalDateTime attendanceTime;

    Boolean isPassed;

    String note;

    @Enumerated(EnumType.STRING)
    AttendanceStatus status;

    @ManyToOne
    @JoinColumn(name = "student_id")
    @JsonBackReference(value = "student_attendance")
    User student;

    @ManyToOne
    @JoinColumn(name = "class_session_id")
    ClassSession classSession;



}
