package com.backend.repository;

import com.backend.model.InvalidatedToken;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.repository.CrudRepository;

public interface InvalidatedTokenRepository extends JpaRepository<InvalidatedToken, String> {
}
