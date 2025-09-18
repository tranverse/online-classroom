package com.backend.model;

import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.AllArgsConstructor;
import lombok.NoArgsConstructor;
import lombok.experimental.FieldDefaults;

import java.time.LocalDate;
import java.util.List;

@Entity
@AllArgsConstructor
@NoArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class ClassRoom {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    String id;

    String name;

    LocalDate startDate;

    LocalDate endDate;

    Integer quantity;

    @ManyToOne
    User teacher;

    @OneToMany(mappedBy = "classRoom", cascade = CascadeType.ALL)
    List<ClassSession> classSessions;

    @OneToMany(mappedBy = "classRoom")
    List<StudentClass> studentClasses;
}
