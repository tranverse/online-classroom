package com.backend.controller;

import com.backend.dto.ApiResponse;
import com.backend.dto.auth.*;
import com.backend.service.AuthService;
import com.nimbusds.jose.JOSEException;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.text.ParseException;

@RestController
@RequestMapping("/auth")
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class AuthController {
    AuthService authService;
    @PostMapping("/login")
    public ResponseEntity<ApiResponse<AuthenticationResponse>> login(@RequestBody UserLoginRequest userRequest) {
        return ResponseEntity.ok(
                ApiResponse.<AuthenticationResponse>builder()
                        .data(authService.login(userRequest))
                        .message("Login successfully")
                        .code("auth-s-login")
                        .build()
        );
    }

    @PostMapping("/introspect")
    public ResponseEntity<ApiResponse<IntrospectResponse>> introspect(@RequestBody IntrospectRequest introspectRequest) throws ParseException, JOSEException {
        return ResponseEntity.ok(
                ApiResponse.<IntrospectResponse>builder()
                        .data(authService.introspect(introspectRequest))
                        .build()
        );
    }

    @PostMapping("/logout")
    public ResponseEntity<ApiResponse<Void>> introspect(@RequestBody LogoutRequest logoutRequest) throws ParseException, JOSEException {
        authService.logout(logoutRequest);
        return ResponseEntity.ok(
                ApiResponse.<Void>builder()
                        .build()
        );
    }

    @PostMapping("/refresh")
    public ResponseEntity<ApiResponse<AuthenticationResponse>> refreshToken(@RequestBody RefreshTokenRequest refreshTokenRequest) throws ParseException, JOSEException {
        return ResponseEntity.ok(
                ApiResponse.<AuthenticationResponse>builder()
                        .data(authService.refreshToken(refreshTokenRequest))
                        .build()
        );
    }
}
