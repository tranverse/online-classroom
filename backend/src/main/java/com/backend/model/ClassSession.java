package com.backend.model;

import com.backend.enums.ClassSessionStatus;
import com.backend.enums.ClassSessionType;
import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.AllArgsConstructor;
import lombok.NoArgsConstructor;
import lombok.experimental.FieldDefaults;

import java.time.LocalDateTime;
import java.util.List;

@Entity
@AllArgsConstructor
@NoArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class ClassSession {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    String id;

    String title;

    LocalDateTime startTime;

    LocalDateTime endTime;

    String link;

    String note;

    @ManyToOne
    @JoinColumn(name = "classroom_id")
    ClassRoom classRoom;

    @Enumerated(EnumType.STRING)
    ClassSessionType sessionType;

    @Enumerated(EnumType.STRING)
    ClassSessionStatus sessionStatus;

    @OneToMany(mappedBy = "classSession")
    List<Attendance> attendances;



}
