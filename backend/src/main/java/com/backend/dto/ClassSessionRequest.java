package com.backend.dto;

import com.fasterxml.jackson.annotation.JsonFormat;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.time.LocalDateTime;

@Data
public class ClassSessionRequest {
    @NotNull
    private String title;
    
    private String description;
    
    @NotNull
    @JsonFormat(pattern = "yyyy-MM-dd'T'HH:mm:ss")
    private LocalDateTime startTime;
    
    @NotNull
    @JsonFormat(pattern = "yyyy-MM-dd'T'HH:mm:ss")
    private LocalDateTime endTime;
    
    private String meetingUrl;
    
    private com.backend.enums.ClassSessionType sessionType;
}