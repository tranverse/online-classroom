package com.backend.model;

import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;

import java.time.LocalDateTime;

public class Resource {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    String id;

    String blob;

    LocalDateTime createdAt;
}
