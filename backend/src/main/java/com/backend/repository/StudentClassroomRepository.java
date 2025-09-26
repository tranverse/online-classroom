package com.backend.repository;

import com.backend.model.StudentClassroom;
import org.springframework.data.jpa.repository.JpaRepository;

public interface StudentClassroomRepository extends JpaRepository<StudentClassroom, String> {

    Boolean existsByStudentIdAndClassroomId(String studentId, String classroomId);

    void deleteByStudentIdAndClassroomId(String studentId, String classroomId);
}
