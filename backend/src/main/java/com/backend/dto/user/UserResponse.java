package com.backend.dto.user;

import com.backend.enums.Role;
import lombok.Getter;
import lombok.Setter;

@Setter
@Getter
public class UserResponse {
    private String name;
    private String phone;
    private String email;
    private String avatar;
    private String id;
    private Role role;
}
