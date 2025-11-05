package com.backend.controller;

import java.util.List;
import java.util.stream.Collectors;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.backend.model.Comment;
import com.backend.service.CommentService;

import lombok.Data;
import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/comments")
@RequiredArgsConstructor
public class CommentController {
    private final CommentService commentService;

    @Data
    static class CreateRequest {
        String classSessionId;
        String message;
    }

    @Data
    static class CommentResponse {
        String id;
        String message;
        String userId;
        String userName;
        java.time.LocalDateTime createdAt;
    }

    @PostMapping
    public ResponseEntity<CommentResponse> create(@RequestHeader("X-User-Id") String userId, @RequestBody CreateRequest req) {
        Comment c = commentService.create(userId, req.getClassSessionId(), req.getMessage());
        CommentResponse r = toDto(c);
        return ResponseEntity.ok(r);
    }

    @GetMapping("/session/{sessionId}")
    public ResponseEntity<List<CommentResponse>> listForSession(@PathVariable("sessionId") String sessionId) {
        List<Comment> list = commentService.listForSession(sessionId);
        List<CommentResponse> resp = list.stream().map(this::toDto).collect(Collectors.toList());
        return ResponseEntity.ok(resp);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@RequestHeader("X-User-Id") String userId, @PathVariable("id") String id) {
        commentService.delete(id, userId);
        return ResponseEntity.ok().build();
    }

    private CommentResponse toDto(Comment c) {
        CommentResponse r = new CommentResponse();
        r.setId(c.getId());
        r.setMessage(c.getMessage());
        if (c.getUser() != null) {
            r.setUserId(c.getUser().getId());
            r.setUserName(c.getUser().getName() != null ? c.getUser().getName() : c.getUser().getEmail());
        }
        r.setCreatedAt(c.getCreatedAt());
        return r;
    }
}
