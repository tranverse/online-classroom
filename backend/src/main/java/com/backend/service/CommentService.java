package com.backend.service;

import java.time.LocalDateTime;
import java.util.List;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.backend.model.ClassSession;
import com.backend.model.Comment;
import com.backend.model.User;
import com.backend.repository.ClassSessionRepository;
import com.backend.repository.CommentRepository;
import com.backend.repository.UserRepository;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class CommentService {
    private final CommentRepository commentRepository;
    private final UserRepository userRepository;
    private final ClassSessionRepository classSessionRepository;

    @Transactional
    public Comment create(String userId, String classSessionId, String message) {
        User user = userRepository.findById(userId).orElseThrow(() -> new IllegalArgumentException("User not found"));
        ClassSession session = classSessionRepository.findById(classSessionId).orElseThrow(() -> new IllegalArgumentException("ClassSession not found"));

        Comment c = new Comment();
        c.setCreatedAt(LocalDateTime.now());
        c.setMessage(message);
        c.setUser(user);
        c.setClassSession(session);

        return commentRepository.save(c);
    }

    @Transactional(readOnly = true)
    public List<Comment> listForSession(String classSessionId) {
        return commentRepository.findAllByClassSessionIdOrderByCreatedAtDesc(classSessionId);
    }

    @Transactional
    public void delete(String commentId, String requestingUserId) {
        Comment c = commentRepository.findById(commentId).orElseThrow(() -> new IllegalArgumentException("Comment not found"));

        // allow delete if owner or teacher of the session
        if (c.getUser() != null && c.getUser().getId().equals(requestingUserId)) {
            commentRepository.delete(c);
            return;
        }

        // check teacher of classroom (use classroom->teacher, ClassSession has no getTeacher())
        ClassSession session = c.getClassSession();
        if (session != null) {
        if (session.getClassroom() != null && session.getClassroom().getTeacher() != null
            && session.getClassroom().getTeacher().getId() != null
            && requestingUserId.equals(session.getClassroom().getTeacher().getId())) {
                commentRepository.delete(c);
                return;
            }
        }

        throw new SecurityException("Not authorized to delete comment");
    }
}
