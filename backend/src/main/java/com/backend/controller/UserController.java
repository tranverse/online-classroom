package com.backend.controller;

import com.backend.dto.ApiResponse;
import com.backend.dto.user.UserCreateRequest;
import com.backend.dto.user.UserResponse;
import com.backend.service.UserService;
import jakarta.validation.Valid;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/user")
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
@RequiredArgsConstructor
@Slf4j
public class UserController {
    UserService userService;

    @GetMapping("/{email}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<UserResponse>> getUser(@PathVariable String email) {
        var context = SecurityContextHolder.getContext();
        log.info(context.getAuthentication().getName());
        log.info(context.getAuthentication().getAuthorities().toString());

        return ResponseEntity.ok(
                ApiResponse.<UserResponse>builder()
                        .code("user-s-get")
                        .data(userService.getUserInformation(email))
                        .message("Get user information successfully")
                        .build()
        );
    }

    @PostMapping
    public ResponseEntity<ApiResponse<UserResponse>> createUser(@RequestBody @Valid UserCreateRequest userCreateRequest) {
        return ResponseEntity.ok(
                ApiResponse.<UserResponse>builder()
                        .code("user-s-create")
                        .data(userService.createUser(userCreateRequest))
                        .message("Add user successfully")
                        .build()
        );
    }

}
