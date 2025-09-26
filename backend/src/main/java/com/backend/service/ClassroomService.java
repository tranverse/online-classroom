package com.backend.service;

import com.backend.dto.classroom.*;
import com.backend.enums.Role;
import com.backend.exception.AppException;
import com.backend.exception.ErrorCode;
import com.backend.mapper.ClassroomMapper;
import com.backend.mapper.StudentClassroomMapper;
import com.backend.model.Classroom;
import com.backend.model.StudentClassroom;
import com.backend.repository.ClassroomRepository;
import com.backend.repository.StudentClassroomRepository;
import com.backend.repository.UserRepository;
import jakarta.transaction.Transactional;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
@Slf4j
public class ClassroomService {
    ClassroomRepository classroomRepository;
    ClassroomMapper classroomMapper;
    UserRepository userRepository;
    StudentClassroomMapper studentClassroomMapper;
    StudentClassroomRepository studentClassroomRepository;

    public ClassroomResponse createClassroom(ClassroomRequest classroomRequest) {
        if(!userRepository.existsById(classroomRequest.getTeacher().getId())) {
            throw new AppException(ErrorCode.USER_NOT_FOUND);
        }
        if(userRepository.findRoleById(classroomRequest.getTeacher().getId()) != Role.TEACHER){
            throw new AppException(ErrorCode.INVALID_ROLE);
        }
        Classroom classroom = classroomMapper.toClassRoom(classroomRequest);
        classroomRepository.save(classroom);

        return classroomMapper.toClassroomResponse(classroom);
    }

    public ClassroomResponse updateClassroom(ClassroomRequest classroomRequest, String classroomId) {
        Classroom classroom = classroomRepository.findById(classroomId).orElseThrow();
        classroom.setName(classroomRequest.getName());
        classroom.setQuantity(classroomRequest.getQuantity());
        classroom.setTeacher(userRepository.findById(classroomRequest.getTeacher().getId()).orElseThrow());
        classroom.setEndDate(classroomRequest.getEndDate());
        classroom.setStartDate(classroomRequest.getStartDate());
        classroom.setName(classroomRequest.getName());
        classroomRepository.save(classroom);
        return classroomMapper.toClassroomResponse(classroom);
    }

    public StudentClassroomResponse addStudentClassroom(StudentClassroomRequest studentClassroomRequest) {
        if(studentClassroomRepository.existsByStudentIdAndClassroomId(studentClassroomRequest.getStudent().getId(), studentClassroomRequest.getClassroom().getId())) {
            throw new AppException(ErrorCode.STUDENT_EXISTED_IN_CLASS);
        }

        StudentClassroom studentClassroom = studentClassroomMapper.toStudentClassroom(studentClassroomRequest);

        studentClassroomRepository.save(studentClassroom);
        return studentClassroomMapper.toStudentClassroomResponse(studentClassroom);
    }

    public ClassroomResponse getClassroom(String classroomId) {
        Classroom classroom = classroomRepository.findById(classroomId).orElseThrow();
        return classroomMapper.toClassroomResponse(classroom);
    }


    public List<ClassroomResponse> getAllClassrooms() {
        List<Classroom> classrooms = classroomRepository.findAll();
        return classrooms.stream().map(classroomMapper::toClassroomResponse).collect(Collectors.toList());
    }


    public Void deleteClassroom(String classroomId) {
        Classroom classroom = classroomRepository.findById(classroomId).orElseThrow(() -> new AppException(ErrorCode.CLASSROOM_NOT_FOUND));
        classroom.setIsDeleted(true);
        classroomRepository.save(classroom);
        return null;
    }

    @Transactional
    public Void removeStudentClassroom(RemoveStudentRequest removeStudentRequest) {
        Classroom classroom = classroomRepository.findById(removeStudentRequest.getClassroomId()).orElseThrow();

        studentClassroomRepository.deleteByStudentIdAndClassroomId(removeStudentRequest.getStudentId(),
                removeStudentRequest.getClassroomId());

        return null;
    }



}
