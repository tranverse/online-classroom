package com.backend.model;

import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.experimental.FieldDefaults;

import java.time.LocalDateTime;

@Entity
@Data
@AllArgsConstructor
@NoArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class Assignment {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    String id;

    String title;

    @Lob
    String description;

    LocalDateTime dueAt;

    @ManyToOne
    Classroom classroom;

    @ManyToOne
    Teacher creator;

    LocalDateTime createdAt;
}

