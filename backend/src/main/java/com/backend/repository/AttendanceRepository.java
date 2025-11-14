package com.backend.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.backend.model.Attendance;
import org.w3c.dom.stylesheets.LinkStyle;

import java.util.List;

public interface AttendanceRepository extends JpaRepository<Attendance, String> {
	java.util.List<Attendance> findAllByClassSessionId(String classSessionId);

	java.util.List<Attendance> findAllByClassSession_Classroom_Id(String classroomId);

	@Query("SELECT a FROM Attendance a WHERE a.classSession.classroom.id = :classroomId")
	java.util.List<Attendance> findAllByClassroomId(@Param("classroomId") String classroomId);

	// Fetch attendances for a specific class session and join-fetch the student to avoid lazy-loading / N+1
	@Query("SELECT a FROM Attendance a LEFT JOIN FETCH a.student s WHERE a.classSession.id = :classSessionId")
	java.util.List<Attendance> findAllByClassSessionIdWithStudent(@Param("classSessionId") String classSessionId);

	void deleteByClassSessionId(String classSessionId);

	Attendance findByClassSessionIdAndStudentId(String classSessionId, String studentId);

	@Query("SELECT a FROM Attendance a " +
			"JOIN a.classSession cs " +
			"WHERE a.student.id = :studentId AND cs.classroom.id = :classroomId")
	List<Attendance> findByStudentAndClassroom(
			@Param("studentId") String studentId,
			@Param("classroomId") String classroomId
	);
}
