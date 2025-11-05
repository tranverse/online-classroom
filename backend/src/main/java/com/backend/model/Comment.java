package com.backend.model;

import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.experimental.FieldDefaults;

import java.time.LocalDateTime;

@Entity
@AllArgsConstructor
@NoArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
@Data
public class Comment {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    String id;

    LocalDateTime createdAt;

    String message;

    @ManyToOne
    ClassSession classSession;

    @ManyToOne
    User user;


}
