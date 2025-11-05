package com.backend.dto.classSession;

import java.time.LocalDateTime;

import com.backend.enums.ClassSessionStatus;
import com.backend.enums.ClassSessionType;
import com.backend.model.Classroom;

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

    Classroom classroom;

    ClassSessionType sessionType;

    ClassSessionStatus sessionStatus;
}
