package com.backend.dto.User;

import lombok.Getter;
import lombok.Setter;

@Setter
@Getter
public class UserResponse {
    private String name;
    private String phone;
    private String email;
    private String avatar;
}
