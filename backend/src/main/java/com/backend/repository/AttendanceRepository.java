package com.backend.repository;

import org.springframework.data.jpa.repository.JpaRepository;

import com.backend.model.Attendance;

public interface AttendanceRepository extends JpaRepository<Attendance, String> {
}
