package com.backend.model;

import com.backend.enums.ClassSessionStatus;
import com.backend.enums.ClassSessionType;
import com.fasterxml.jackson.annotation.JsonBackReference;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.FieldDefaults;

import java.time.LocalDateTime;
import java.util.List;

@Entity
@AllArgsConstructor
@NoArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
@Getter
@Setter
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
    @JsonBackReference(value = "classroom_classSessions")
    Classroom classroom;

    @Enumerated(EnumType.STRING)
    ClassSessionType sessionType;

    @Enumerated(EnumType.STRING)
    ClassSessionStatus sessionStatus;

    @OneToMany(mappedBy = "classSession")
    List<Attendance> attendances;



}
