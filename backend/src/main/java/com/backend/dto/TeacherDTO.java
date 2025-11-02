package com.backend.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class TeacherDTO {
    private String id;
    private String userId;
    private String username;
    private String email;
    private String specialization;
    private String bio;
    private String contactInfo;
}