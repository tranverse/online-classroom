package com.backend.exception;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.RequiredArgsConstructor;

@Getter
@RequiredArgsConstructor
@AllArgsConstructor
public enum ErrorCode {
    UNDEFINED_ERROR("9999", "Undefined error"),
    INVALID_KEY("4000", "Invalid key"),
    INVALID_PHONE_NUMBER("4001", "Phone must be number and 10 digits"),
    INVALID_NAME_USER("4002", "Name must be between 3 and 50 characters"),
    USER_NOT_FOUND("4041","User not found"),
    EMAIL_EXISTED("4091","Email already existed"),
    INCORRECT_PASSWORD("4011", "Incorrect password");

    private String code;
    private String message;

}
