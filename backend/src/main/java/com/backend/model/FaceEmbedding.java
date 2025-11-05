package com.backend.model;

import java.time.LocalDateTime;

import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Lob;
import lombok.AccessLevel;
import lombok.NoArgsConstructor;
import lombok.experimental.FieldDefaults;

@Entity
@NoArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
@lombok.Data
public class FaceEmbedding {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    String id;

    String studentId;

    String classroomId;

    // encrypted JSON array (base64) stored as LOB
    @Lob
    String encryptedEmbedding;

    LocalDateTime createdAt;
}
