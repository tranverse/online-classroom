package com.backend.controller;

import com.backend.dto.ApiResponse;
import com.backend.dto.classroom.*;
import com.backend.service.ClassroomService;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import javax.swing.text.html.parser.Entity;
import java.util.List;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/classroom")
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class ClassroomController {
    ClassroomService classroomService;

    @PostMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<ClassroomResponse>> createClassroom(@RequestBody ClassroomRequest classroomRequest) {
        return ResponseEntity.ok(
                ApiResponse.<ClassroomResponse>builder()
                        .message("Create classroom successfully")
                        .code("classroom-s-add")
                        .data(classroomService.createClassroom(classroomRequest))
                        .build()
        );
    }

    @PostMapping("/add-student")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<StudentClassroomResponse>> addStudent(@RequestBody StudentClassroomRequest studentClassroomRequest) {
        return ResponseEntity.ok(
                ApiResponse.<StudentClassroomResponse>builder()
                        .message("Create classroom successfully")
                        .code("classroom-s-add")
                        .data(classroomService.addStudentClassroom(studentClassroomRequest))
                        .build()
        );
    }

    @PutMapping("/{classroom_id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<ClassroomResponse>> updateClassroom(@RequestBody ClassroomRequest classroomRequest,
                                                                          @PathVariable String classroom_id) {
        return ResponseEntity.ok(
                ApiResponse.<ClassroomResponse>builder()
                        .message("Update classroom successfully")
                        .code("classroom-s-update")
                        .data(classroomService.updateClassroom(classroomRequest, classroom_id))
                        .build()
        );
    }

    @GetMapping("/{classroom_id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<ClassroomResponse>> getClassroom(@PathVariable String classroom_id) {
        return ResponseEntity.ok(
                ApiResponse.<ClassroomResponse>builder()
                        .message("Get classroom successfully")
                        .code("classroom-s-get")
                        .data(classroomService.getClassroom(classroom_id))
                        .build()
        );
    }

    @GetMapping("/get-all")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<List<ClassroomResponse>>> getClassroom() {
        return ResponseEntity.ok(
                ApiResponse.<List<ClassroomResponse>>builder()
                        .message("Get all classroom successfully")
                        .code("classroom-s-get-all")
                        .data(classroomService.getAllClassrooms())
                        .build()
        );
    }

    @DeleteMapping("/{classroom_id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<?>> deleteClassroom(@PathVariable String classroom_id) {
        return ResponseEntity.ok(
                ApiResponse.<Void>builder()
                        .message("Delete classroom successfully")
                        .code("classroom-s-delete")
                        .data(classroomService.deleteClassroom(classroom_id))
                        .build()
        );
    }

    @DeleteMapping("/remove-student")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<?>> removeStudent(@RequestBody RemoveStudentRequest removeStudentRequest) {
        return ResponseEntity.ok(
                ApiResponse.<Void>builder()
                        .message("Remove student successfully")
                        .code("classroom-s-remove-student")
                        .data(classroomService.removeStudentClassroom(removeStudentRequest))
                        .build()
        );
    }

}
