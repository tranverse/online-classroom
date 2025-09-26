package com.backend.dto.folder;


import com.backend.model.Folder;
import com.backend.model.User;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.Setter;
import lombok.experimental.FieldDefaults;

import java.time.LocalDateTime;

@Getter
@Setter
@FieldDefaults(level = AccessLevel.PRIVATE)
public class FolderResponse {
    String name;

    LocalDateTime createAt;

    String link;

    Folder parent;

    User user;
}
