package com.backend.repository;

import com.backend.enums.Role;
import com.backend.model.User;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface UserRepository extends JpaRepository<User, String> {
    Boolean existsByEmailAndRole(String email, Role role);

    Optional<User> findByEmail(String email);
}
