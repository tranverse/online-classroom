package com.backend.model;

import java.time.LocalDateTime;
import java.util.List;

import com.backend.enums.ClassSessionStatus;
import com.backend.enums.ClassSessionType;
import com.fasterxml.jackson.annotation.JsonBackReference;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.OneToMany;
import lombok.AccessLevel;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import lombok.experimental.FieldDefaults;

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
    @Column(length = 32)
    ClassSessionType sessionType;

    @Enumerated(EnumType.STRING)
    @Column(length = 32)
    ClassSessionStatus sessionStatus;

    @OneToMany(mappedBy = "classSession")
    @com.fasterxml.jackson.annotation.JsonManagedReference(value = "classsession_attendance")
    List<Attendance> attendances;



}
