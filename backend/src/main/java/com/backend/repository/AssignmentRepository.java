package com.backend.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.backend.model.Assignment;

@Repository
public interface AssignmentRepository extends JpaRepository<Assignment, String> {
    List<Assignment> findAllByClassroomIdOrderByCreatedAtDesc(String classroomId);
}
