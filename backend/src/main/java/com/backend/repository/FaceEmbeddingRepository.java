package com.backend.repository;

import org.springframework.data.jpa.repository.JpaRepository;

import com.backend.model.FaceEmbedding;

public interface FaceEmbeddingRepository extends JpaRepository<FaceEmbedding, String> {
    java.util.List<FaceEmbedding> findAllByClassroomId(String classroomId);
    java.util.List<FaceEmbedding> findAllByStudentId(String studentId);
}
