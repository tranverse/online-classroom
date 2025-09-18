package com.backend.dto.User;

import com.backend.enums.Role;
import jakarta.validation.constraints.*;
import lombok.Getter;

@Getter
public class UserCreateRequest {
    @Size(max = 50, min = 3, message = "INVALID_NAME_USER")
    private String name;

    @Email
    private String email;

    @Pattern(regexp = "(^0[0-9]{9})$", message = "INVALID_PHONE_NUMBER")
    private String phone;

    private Role role;
}
