package com.backend.dto.attendance;

import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class AttendanceRequest {
    // base64 encoded image captured from student's webcam
    String imageBase64;

    // optional: extra metadata for liveness detection
    Double livenessScore;
}
