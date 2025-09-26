package com.backend.service;

import com.backend.dto.user.UserCreateRequest;
import com.backend.dto.user.UserResponse;
import com.backend.exception.ErrorCode;
import com.backend.exception.AppException;
import com.backend.mapper.UserMapper;
import com.backend.model.User;
import com.backend.repository.UserRepository;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class UserService {
    final UserRepository userRepository;
    final UserMapper userMapper;

    public UserResponse getUserInformation(String email) {
        User user = userRepository.findByEmail(email).orElseThrow(() ->
                new AppException(ErrorCode.USER_NOT_FOUND));
        return userMapper.toUserResponse(user);

    }

    public UserResponse createUser(UserCreateRequest userCreateRequest) {
        if(userRepository.existsByEmailAndRole(userCreateRequest.getEmail(), userCreateRequest.getRole())) {
            throw new AppException(ErrorCode.EMAIL_EXISTED);
        }
        User user = userMapper.toUser(userCreateRequest);
        return userMapper.toUserResponse(userRepository.save(user));
    }
}
