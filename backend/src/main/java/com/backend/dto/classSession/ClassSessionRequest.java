package com.backend.dto.classSession;

import com.backend.enums.ClassSessionStatus;
import com.backend.enums.ClassSessionType;
import com.backend.model.Classroom;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;

@Getter
@Setter
public class ClassSessionRequest {

    String title;

    LocalDateTime startTime;

    LocalDateTime endTime;

    String link;

    String note;

    Classroom classroom;

    ClassSessionType sessionType;

    ClassSessionStatus sessionStatus;
}
