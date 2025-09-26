package com.backend.exception;

import com.backend.dto.ApiResponse;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.validation.FieldError;
import org.springframework.web.HttpRequestMethodNotSupportedException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ControllerAdvice;
import org.springframework.web.bind.annotation.ExceptionHandler;

import java.util.Map;
import java.util.stream.Collectors;

@ControllerAdvice
@Slf4j
public class GlobalExceptionHandler {
    @ExceptionHandler(AppException.class)
    public ResponseEntity<ApiResponse<Void>> handleAppException(AppException e){
        ApiResponse<Void> apiResponse = ApiResponse.<Void>builder()
                .message(e.getMessage())
                .success(false)
                .code(e.getCode())
                .build();
        return ResponseEntity
                .status(e.getStatus())
                .body(apiResponse);
    }

//    @ExceptionHandler(Exception.class)
//    public ResponseEntity<ApiResponse<Void>> handleException(Exception e){
//        ApiResponse<Void> apiResponse = ApiResponse.<Void>builder()
//                .message(e.getMessage())
//                .success(false)
//                .code(ErrorCode.UNDEFINED_ERROR.getCode())
//                .build();
//        return ResponseEntity.badRequest().body(apiResponse);
//    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ApiResponse< Map<String, String>>> handleMethodArgumentNotValidException(MethodArgumentNotValidException e){
        Map<String, String> errorCodes = e.getBindingResult().getFieldErrors().stream()
                .collect(Collectors.toMap(
                        FieldError::getField,
                        err -> {
                            ErrorCode errorCode = ErrorCode.INVALID_KEY;
                            try{
                                errorCode = ErrorCode.valueOf(err.getDefaultMessage());
                            }catch (IllegalArgumentException ignored){}
                            return errorCode.getMessage();
                        }
                ));
        ApiResponse< Map<String, String>> apiResponse = ApiResponse.< Map<String, String>>builder()
                .message("Validation fail")
                .success(false)
                .code("")
                .data(errorCodes)
                .build();
        return ResponseEntity.badRequest().body(apiResponse);
    }

    @ExceptionHandler(AccessDeniedException.class)
    public ResponseEntity<ApiResponse<Void>> handleAccessDeniedException(AccessDeniedException e){
        ErrorCode errorCode = ErrorCode.UNAUTHORIZED;
        return ResponseEntity.status(errorCode.getHttpStatus()).body(
                ApiResponse.<Void>builder()
                        .success(false)
                        .message(errorCode.getMessage())
                        .code(errorCode.getCode())
                        .build()
        );
    }

    @ExceptionHandler(HttpMessageNotReadableException.class)
    public ResponseEntity<ApiResponse<Void>> handleHttpMessageNotReadableException(HttpMessageNotReadableException e){
        ErrorCode errorCode = ErrorCode.INVALID_REQUEST_FORMAT;
        return ResponseEntity.status(errorCode.getHttpStatus()).body(
                ApiResponse.<Void>builder()
                        .success(false)
                        .message(errorCode.getMessage())
                        .code(errorCode.getCode())
                        .build()
        );
    }

    @ExceptionHandler(HttpRequestMethodNotSupportedException.class)
    public ResponseEntity<ApiResponse<Void>> handleHttpRequestMethodNotSupported(HttpMessageNotReadableException e){
        ErrorCode errorCode = ErrorCode.METHOD_NOT_SUPPORT;
        return ResponseEntity.status(errorCode.getHttpStatus()).body(
                ApiResponse.<Void>builder()
                        .success(false)
                        .message(errorCode.getMessage())
                        .code(errorCode.getCode())
                        .build()
        );
    }
}
