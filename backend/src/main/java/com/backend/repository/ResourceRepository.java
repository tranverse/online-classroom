package com.backend.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

import com.backend.model.Folder;
import com.backend.model.Resource;

public interface ResourceRepository extends JpaRepository<Resource, String> {
    List<Resource> findAllByFolder(Folder folder);
}
