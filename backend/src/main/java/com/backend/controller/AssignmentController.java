package com.backend.controller;

import java.util.List;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.backend.model.Assignment;
import com.backend.model.Submission;
import com.backend.service.AssignmentService;

import lombok.Data;
import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/assignments")
@RequiredArgsConstructor
public class AssignmentController {
    private final AssignmentService assignmentService;

    @PostMapping
    public ResponseEntity<Assignment> create(@RequestHeader("X-User-Id") String userId, @RequestBody Assignment request) {
        // TODO: validate teacher role / classroom ownership in future
        Assignment created = assignmentService.create(request);
        return ResponseEntity.ok(created);
    }

    @GetMapping("/classroom/{classroomId}")
    public ResponseEntity<List<Assignment>> listForClass(@PathVariable String classroomId) {
        return ResponseEntity.ok(assignmentService.listForClass(classroomId));
    }

    @Data
    static class SubmitRequest { String assignmentId; String fileUrl; }

    @PostMapping("/submit")
    public ResponseEntity<Submission> submit(@RequestHeader("X-User-Id") String userId, @RequestBody SubmitRequest req) {
        Submission s = assignmentService.submit(userId, req.getAssignmentId(), req.getFileUrl());
        return ResponseEntity.ok(s);
    }

    @GetMapping("/{assignmentId}/submissions")
    public ResponseEntity<List<Submission>> listSubmissions(@PathVariable String assignmentId) {
        return ResponseEntity.ok(assignmentService.listSubmissions(assignmentId));
    }

    @Data
    static class GradeRequest { Double grade; String feedback; }

    @PatchMapping("/submission/{submissionId}/grade")
    public ResponseEntity<Submission> grade(@RequestHeader("X-User-Id") String userId, @PathVariable String submissionId, @RequestBody GradeRequest req) {
        Submission s = assignmentService.grade(submissionId, req.getGrade(), req.getFeedback());
        return ResponseEntity.ok(s);
    }
}
