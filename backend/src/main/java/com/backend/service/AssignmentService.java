package com.backend.service;

import java.time.LocalDateTime;
import java.util.List;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.backend.model.Assignment;
import com.backend.model.Submission;
import com.backend.repository.AssignmentRepository;
import com.backend.repository.SubmissionRepository;
import com.backend.repository.UserRepository;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class AssignmentService {
    private final AssignmentRepository assignmentRepository;
    private final SubmissionRepository submissionRepository;
    private final UserRepository userRepository;

    @Transactional
    public Assignment create(Assignment a) {
        a.setCreatedAt(LocalDateTime.now());
        return assignmentRepository.save(a);
    }

    @Transactional(readOnly = true)
    public List<Assignment> listForClass(String classroomId) {
        return assignmentRepository.findAllByClassroomIdOrderByCreatedAtDesc(classroomId);
    }

    @Transactional
    public Submission submit(String studentId, String assignmentId, String fileUrl) {
        var student = userRepository.findById(studentId).orElseThrow(() -> new IllegalArgumentException("User not found"));
        var assignment = assignmentRepository.findById(assignmentId).orElseThrow(() -> new IllegalArgumentException("Assignment not found"));

        Submission s = new Submission();
        s.setAssignment(assignment);
        s.setStudent(student);
        s.setSubmittedAt(LocalDateTime.now());
        s.setFileUrl(fileUrl);

        return submissionRepository.save(s);
    }

    @Transactional(readOnly = true)
    public List<Submission> listSubmissions(String assignmentId) {
        return submissionRepository.findAllByAssignmentIdOrderBySubmittedAtDesc(assignmentId);
    }

    @Transactional
    public Submission grade(String submissionId, Double grade, String feedback) {
        Submission s = submissionRepository.findById(submissionId).orElseThrow(() -> new IllegalArgumentException("Submission not found"));
        s.setGrade(grade);
        s.setFeedback(feedback);
        return submissionRepository.save(s);
    }
}
