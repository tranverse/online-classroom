package com.backend.service;

import java.time.LocalDate;
import java.util.List;
import java.util.stream.Collectors;

import com.backend.enums.ClassroomStatus;
import com.backend.model.User;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import com.backend.dto.classroom.ClassroomRequest;
import com.backend.dto.classroom.ClassroomResponse;
import com.backend.dto.classroom.RemoveStudentRequest;
import com.backend.dto.classroom.StudentClassroomRequest;
import com.backend.dto.classroom.StudentClassroomResponse;
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
import java.time.LocalDate;

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
        // Kiểm tra teacher tồn tại
        if (!userRepository.existsById(classroomRequest.getTeacher().getId())) {
            throw new AppException(ErrorCode.USER_NOT_FOUND);
        }

        // Kiểm tra role
        if (userRepository.findRoleById(classroomRequest.getTeacher().getId()) != Role.TEACHER) {
            throw new AppException(ErrorCode.INVALID_ROLE);
        }

        // Map request -> entity
        Classroom classroom = classroomMapper.toClassRoom(classroomRequest);

        // Set trạng thái dựa trên startDate
        LocalDate today = LocalDate.now();
        LocalDate startDate = classroomRequest.getStartDate(); // giả sử startDate là LocalDate
        if (startDate.isEqual(today) || startDate.isBefore(today)) {
            classroom.setStatus(ClassroomStatus.ACTIVE);
        } else {
            classroom.setStatus(ClassroomStatus.DRAFT);
        }

        // Lưu
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
    public void removeStudentClassroom(String studentId, String classroomId) {
        System.out.println("Removing StudentClassroom mapping:");
        System.out.println("studentId = " + studentId);
        System.out.println("classroomId = " + classroomId);

        // Tìm student & classroom
        User student = userRepository.findById(studentId).orElseThrow(() ->
                new AppException(ErrorCode.USER_NOT_FOUND)
        );
        Classroom classroom = classroomRepository.findById(classroomId).orElseThrow(() ->
                new AppException(ErrorCode.CLASSROOM_NOT_FOUND)
        );

        // Tìm mapping
        StudentClassroom studentClassroom = studentClassroomRepository
                .findByStudentAndClassroom(student, classroom);

        System.out.println("Found mapping: " + studentClassroom);

        if (studentClassroom != null) {
            studentClassroomRepository.delete(studentClassroom);
            System.out.println("Deleted successfully");
        } else {
            System.out.println("No mapping found to delete");
        }
    }


    public ClassroomResponse getClassroom(String classroomId) {
        Classroom classroom = classroomRepository.findById(classroomId).orElseThrow();
        return classroomMapper.toClassroomResponse(classroom);
    }

    public List<StudentClassroomResponse> getStudentsForClassroom(String classroomId) {
        var links = studentClassroomRepository.findByClassroomId(classroomId);
        return links.stream().map(studentClassroomMapper::toStudentClassroomResponse).collect(Collectors.toList());
    }


    public List<ClassroomResponse> getAllClassrooms() {
        List<Classroom> classrooms = classroomRepository.findAllByIsDeletedFalse();
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
        // verify classroom exists (throws if not)
        classroomRepository.findById(removeStudentRequest.getClassroomId()).orElseThrow();

        studentClassroomRepository.deleteByStudentIdAndClassroomId(removeStudentRequest.getStudentId(), removeStudentRequest.getClassroomId());

        return null;
    }

    @Scheduled(fixedRate = 60_000) // chạy mỗi 60 giây
    @Transactional
    public void updateClassroomStatus() {
        LocalDate today = LocalDate.now();

        // Chỉ load các lớp chưa COMPLETED hoặc CANCELLED
        List<Classroom> classrooms = classroomRepository.findByStatusIn(List.of(ClassroomStatus.DRAFT, ClassroomStatus.ACTIVE));

        for (Classroom c : classrooms) {
            ClassroomStatus oldStatus = c.getStatus();
            if (today.isBefore(c.getStartDate())) {
                c.setStatus(ClassroomStatus.DRAFT);
            } else if (!today.isAfter(c.getEndDate())) {
                c.setStatus(ClassroomStatus.ACTIVE);
            } else {
                c.setStatus(ClassroomStatus.COMPLETED);
            }
            if (oldStatus != c.getStatus()) {
                System.out.println("Updated classroom " + c.getName() + " from " + oldStatus + " -> " + c.getStatus());
            }
        }

        classroomRepository.saveAll(classrooms);
    }

}
