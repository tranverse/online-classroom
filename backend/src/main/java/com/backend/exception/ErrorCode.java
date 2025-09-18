package com.backend.exception;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;

@Getter
@RequiredArgsConstructor
@AllArgsConstructor
public enum ErrorCode {
    UNDEFINED_ERROR("9999", "Undefined error", HttpStatus.INTERNAL_SERVER_ERROR),
    /*400*/
    INVALID_KEY("4000", "Invalid key", HttpStatus.BAD_REQUEST),
    INVALID_PHONE_NUMBER("4001", "Phone must be number and 10 digits", HttpStatus.BAD_REQUEST),
    INVALID_NAME_USER("4002", "Name must be between 3 and 50 characters", HttpStatus.BAD_REQUEST),
    /*401*/
    INCORRECT_PASSWORD("4011", "Incorrect password", HttpStatus.UNAUTHORIZED),
    UNAUTHENTICATED("4012", "Unauthenticated", HttpStatus.UNAUTHORIZED),
    /*403*/
    UNAUTHORIZED("4031", "You do not have permission", HttpStatus.FORBIDDEN),
    /*404*/
    USER_NOT_FOUND("4041","User not found", HttpStatus.NOT_FOUND),
    /*409*/
    EMAIL_EXISTED("4091","Email already existed", HttpStatus.CONFLICT),
    ;

    private String code;
    private String message;
    private HttpStatus httpStatus;
}
