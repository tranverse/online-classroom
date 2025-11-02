package com.backend.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import com.backend.enums.Role;
import com.backend.model.User;

import io.lettuce.core.dynamic.annotation.Param;

public interface UserRepository extends JpaRepository<User, String> {
    Boolean existsByEmailAndRole(String email, Role role);

    Optional<User> findByEmail(String email);

    @Query("SELECT u.role FROM User u WHERE u.id = :id ")
    Role findRoleById(@Param("id") String id);

    List<User> findByRole(Role role);

    @org.springframework.data.jpa.repository.Query("SELECT u FROM User u JOIN u.studentClasses sc WHERE sc.classroom.id = :classId")
    List<User> findAllStudentsByClassId(@org.springframework.data.repository.query.Param("classId") String classId);

    @org.springframework.data.jpa.repository.Query("SELECT COUNT(sc) FROM StudentClassroom sc WHERE sc.classroom.id = :classId")
    int countStudentsByClassId(@org.springframework.data.repository.query.Param("classId") String classId);
}
