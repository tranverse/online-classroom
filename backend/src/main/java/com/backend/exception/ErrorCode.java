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
    INVALID_ROLE("4003", "Only teacher can be assigned to a classroom.", HttpStatus.BAD_REQUEST),
    INVALID_DATE("4004", "Date must be now or larger.", HttpStatus.BAD_REQUEST),
    INVALID_REQUEST_FORMAT("4005", "Invalid request format.", HttpStatus.BAD_REQUEST),
    /*401*/
    INCORRECT_PASSWORD("4011", "Incorrect password", HttpStatus.UNAUTHORIZED),
    UNAUTHENTICATED("4012", "Unauthenticated", HttpStatus.UNAUTHORIZED),
    /*403*/
    UNAUTHORIZED("4031", "You do not have permission", HttpStatus.FORBIDDEN),
    /*404*/
    USER_NOT_FOUND("4041","User not found", HttpStatus.NOT_FOUND),
    CLASSROOM_NOT_FOUND("4042","Classroom not found", HttpStatus.NOT_FOUND),
    /*405*/
    METHOD_NOT_SUPPORT("4051","Method not support", HttpStatus.HTTP_VERSION_NOT_SUPPORTED),
    /*409*/
    EMAIL_EXISTED("4091","Email already existed", HttpStatus.CONFLICT),
    STUDENT_EXISTED_IN_CLASS("4092","Student already existed", HttpStatus.CONFLICT),
    ;

    private String code;
    private String message;
    private HttpStatus httpStatus;
}
