package com.backend.dto.folder;

import java.time.LocalDateTime;

import com.backend.dto.user.UserResponse;

import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class FolderLiteResponse {
    String id;
    String name;
    LocalDateTime createAt;
    String link;
    String parentId;
    UserResponse user;
}
