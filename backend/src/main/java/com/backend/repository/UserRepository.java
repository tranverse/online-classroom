package com.backend.repository;

import com.backend.enums.Role;
import com.backend.model.User;
import io.lettuce.core.dynamic.annotation.Param;
import jakarta.validation.constraints.Pattern;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.web.bind.annotation.RequestParam;

import java.util.Optional;

public interface UserRepository extends JpaRepository<User, String> {
    Boolean existsByEmailAndRole(String email, Role role);

    Optional<User> findByEmail(String email);

    @Query("SELECT u.role FROM User u WHERE u.id = :id ")
    Role findRoleById(@Param("id") String id);
}
