package com.backend.exception;

import lombok.Getter;

@Getter
public class AppException extends RuntimeException {
    private final String code;

    public AppException(ErrorCode errorCode) {
        super(errorCode.getMessage());
        this.code = errorCode.getCode();
    }
}
