package com.backend.dto.auth;

import lombok.Getter;

@Getter
public class UserLoginRequest {
    private String email;
    private String password;
}
