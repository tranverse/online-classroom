package com.backend.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

import com.backend.model.StudentClassroom;

public interface StudentClassroomRepository extends JpaRepository<StudentClassroom, String> {

    Boolean existsByStudentIdAndClassroomId(String studentId, String classroomId);

    void deleteByStudentIdAndClassroomId(String studentId, String classroomId);

    // find all student-classroom links for a given classroom
    List<StudentClassroom> findByClassroomId(String classroomId);

    // find all links for a given student
    List<StudentClassroom> findByStudentId(String studentId);
}
