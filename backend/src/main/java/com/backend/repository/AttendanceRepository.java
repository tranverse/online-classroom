package com.backend.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.backend.model.Attendance;

public interface AttendanceRepository extends JpaRepository<Attendance, String> {
	java.util.List<Attendance> findAllByClassSessionId(String classSessionId);

	java.util.List<Attendance> findAllByClassSession_Classroom_Id(String classroomId);

	@Query("SELECT a FROM Attendance a WHERE a.classSession.classroom.id = :classroomId")
	java.util.List<Attendance> findAllByClassroomId(@Param("classroomId") String classroomId);

	// Fetch attendances for a specific class session and join-fetch the student to avoid lazy-loading / N+1
	@Query("SELECT a FROM Attendance a LEFT JOIN FETCH a.student s WHERE a.classSession.id = :classSessionId")
	java.util.List<Attendance> findAllByClassSessionIdWithStudent(@Param("classSessionId") String classSessionId);

	void deleteByClassSessionId(String classSessionId);
}
