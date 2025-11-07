package com.backend.dto.classSession;

import java.time.LocalDateTime;

import com.backend.dto.classroom.ClassroomLiteResponse;
import com.backend.enums.ClassSessionStatus;
import com.backend.enums.ClassSessionType;

import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class ClassSessionResponse {
    String id;
    String title;

    LocalDateTime startTime;

    LocalDateTime endTime;

    String link;

    String note;

    ClassroomLiteResponse classroom;

    ClassSessionType sessionType;

    ClassSessionStatus sessionStatus;
}
