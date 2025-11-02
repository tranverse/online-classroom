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

	void deleteByClassSessionId(String classSessionId);
}
