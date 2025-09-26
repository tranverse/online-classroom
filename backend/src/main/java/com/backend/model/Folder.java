package com.backend.model;

import com.fasterxml.jackson.annotation.JsonBackReference;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.FieldDefaults;

import java.time.LocalDateTime;

@Entity
@AllArgsConstructor
@NoArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
@Getter
@Setter
public class Folder {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    String id;

    String name;

    LocalDateTime createAt;

    String link;

    @ManyToOne
    @JoinColumn(name = "parent_id")
    Folder parent;

    @ManyToOne
    @JsonBackReference(value = "user_folder")
    @JoinColumn(name = "user_id")
    User user;
}
