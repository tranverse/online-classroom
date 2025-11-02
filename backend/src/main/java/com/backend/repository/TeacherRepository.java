package com.backend.repository;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.backend.model.Teacher;

@Repository
public interface TeacherRepository extends JpaRepository<Teacher, String> {
    Optional<Teacher> findByUserId(String userId);
}