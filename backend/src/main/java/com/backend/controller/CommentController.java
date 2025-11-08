package com.backend.controller;

import java.util.List;
import java.util.stream.Collectors;

import org.springframework.http.ResponseEntity;
import org.springframework.http.HttpStatus;
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
import com.backend.dto.ApiResponse;
import lombok.AccessLevel;
import lombok.experimental.FieldDefaults;

import lombok.Data;
import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/comments")
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
@RequiredArgsConstructor
public class CommentController {
    CommentService commentService;

    @Data
    public static class CreateRequest {
        String classSessionId;
        String message;
    }

    @Data
    public static class CommentResponse {
        String id;
        String message;
        String userId;
        String userName;
        java.time.LocalDateTime createdAt;
    }

    @PostMapping
    public ResponseEntity<ApiResponse<CommentResponse>> create(@RequestHeader("X-User-Id") String userId, @RequestBody CreateRequest req) {
        try {
            Comment c = commentService.create(userId, req.getClassSessionId(), req.getMessage());
            CommentResponse r = toDto(c);
            return ResponseEntity.ok(ApiResponse.<CommentResponse>builder().message("Comment created").code("comment-create").data(r).build());
        } catch (Exception ex) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(ApiResponse.<CommentResponse>builder().success(false).message("Failed to create comment").build());
        }
    }

    @GetMapping("/session/{sessionId}")
    public ResponseEntity<ApiResponse<List<CommentResponse>>> listForSession(@PathVariable("sessionId") String sessionId) {
        try {
            List<Comment> list = commentService.listForSession(sessionId);
            List<CommentResponse> resp = list.stream().map(this::toDto).collect(Collectors.toList());
            return ResponseEntity.ok(ApiResponse.<List<CommentResponse>>builder().message("Comments fetched").code("comment-list-session").data(resp).build());
        } catch (Exception ex) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(ApiResponse.<List<CommentResponse>>builder().success(false).message("Failed to fetch comments").build());
        }
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Object>> delete(@RequestHeader("X-User-Id") String userId, @PathVariable("id") String id) {
        try {
            commentService.delete(id, userId);
            return ResponseEntity.ok(ApiResponse.builder().message("Comment deleted").code("comment-delete").build());
        } catch (Exception ex) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(ApiResponse.builder().success(false).message("Failed to delete comment").build());
        }
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
