package com.backend.model;

import java.time.LocalDateTime;

import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import com.fasterxml.jackson.annotation.JsonIgnore;
import lombok.AccessLevel;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import lombok.experimental.FieldDefaults;

@Entity
@AllArgsConstructor
@NoArgsConstructor
@Getter
@Setter
@FieldDefaults(level = AccessLevel.PRIVATE)
public class Resource {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    String id;

    String name;

    String storagePath; // path in blob storage or local FS

    String mimeType;

    Long size;

    LocalDateTime createdAt;

    @ManyToOne
    @JoinColumn(name = "folder_id")
    @JsonIgnore
    Folder folder;

    @ManyToOne
    @JoinColumn(name = "user_id")
    @JsonIgnore
    User uploadedBy;

    // explicit setters (in case lombok not processed in some environments)
    public void setName(String name) { this.name = name; }
    public void setStoragePath(String storagePath) { this.storagePath = storagePath; }
    public void setMimeType(String mimeType) { this.mimeType = mimeType; }
    public void setSize(Long size) { this.size = size; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
    public void setFolder(Folder folder) { this.folder = folder; }
    public void setUploadedBy(User uploadedBy) { this.uploadedBy = uploadedBy; }
}
