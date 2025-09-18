package com.backend.dto.auth;

import lombok.Getter;

@Getter
public class IntrospectRequest {
    private String token;
}
