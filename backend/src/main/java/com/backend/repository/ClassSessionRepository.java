package com.backend.repository;

import java.time.LocalDateTime;
import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.backend.model.ClassSession;

public interface ClassSessionRepository extends JpaRepository<ClassSession, String> {
    List<ClassSession> findAllByClassroomIdOrderByStartTimeDesc(String classroomId);

    int countByClassroomId(String classroomId);

    @Query("SELECT s FROM ClassSession s WHERE s.classroom.id = :classroomId AND (s.endTime IS NULL OR s.endTime > :now OR s.startTime > :now OR s.sessionStatus = com.backend.enums.ClassSessionStatus.IN_PROGRESS OR s.sessionStatus = com.backend.enums.ClassSessionStatus.SCHEDULED) ORDER BY s.startTime ASC")
    List<ClassSession> findUpcomingSessionsByClassroom(@Param("classroomId") String classroomId, @Param("now") LocalDateTime now);

    @Query("SELECT s FROM ClassSession s WHERE s.classroom.id = :classroomId AND s.endTime < :now ORDER BY s.startTime DESC")
    List<ClassSession> findPastSessionsByClassroom(@Param("classroomId") String classroomId, @Param("now") LocalDateTime now);
}
