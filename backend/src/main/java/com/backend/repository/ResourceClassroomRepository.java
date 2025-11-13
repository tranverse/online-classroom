package com.backend.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

import com.backend.model.Classroom;
import com.backend.model.Resource;
import com.backend.model.ResourceClassroom;

public interface ResourceClassroomRepository extends JpaRepository<ResourceClassroom, String> {
    List<ResourceClassroom> findAllByClassroom(Classroom classroom);
    List<ResourceClassroom> findAllByResource(Resource resource);
    List<ResourceClassroom> findAllByClassroom_Id(String classroomId);
}
