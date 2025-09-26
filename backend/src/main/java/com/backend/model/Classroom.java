package com.backend.model;

import com.fasterxml.jackson.annotation.JsonBackReference;
import com.fasterxml.jackson.annotation.JsonManagedReference;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.FieldDefaults;

import java.time.LocalDate;
import java.util.List;

@Entity
@AllArgsConstructor
@NoArgsConstructor
@Getter
@Setter
@FieldDefaults(level = AccessLevel.PRIVATE)
public class Classroom {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    String id;

    String name;

    LocalDate startDate;

    LocalDate endDate;

    Integer quantity;

    Boolean isDeleted;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "teacher_id")
    @JsonBackReference(value = "classroom_teacher")
    User teacher;

    @OneToMany(mappedBy = "classroom", cascade = CascadeType.ALL)
    @JsonManagedReference(value = "classroom_classSessions")
    List<ClassSession> classSessions;

    @OneToMany(mappedBy = "classroom")
    @JsonManagedReference(value = "classroom_studentClasses")
    List<StudentClassroom> studentClasses;
}
