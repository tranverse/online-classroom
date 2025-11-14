package com.backend.repository;

import com.backend.enums.ClassroomStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.backend.model.Classroom;

import java.util.List;

@Repository
public interface ClassroomRepository extends JpaRepository<Classroom, String> {
	boolean existsByIdAndTeacherId(String id, String teacherId);

	List<Classroom> findAllByTeacherId(String teacherId);

	List<Classroom> findAllByIsDeletedFalse();

	List<Classroom> findByStatusIn(List<ClassroomStatus> status);
}
