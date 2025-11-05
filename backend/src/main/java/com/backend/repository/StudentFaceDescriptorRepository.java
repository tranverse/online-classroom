package com.backend.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

import com.backend.model.StudentFaceDescriptor;
import com.backend.model.User;

public interface StudentFaceDescriptorRepository extends JpaRepository<StudentFaceDescriptor, String> {
    List<StudentFaceDescriptor> findAllByStudent(User student);
}
