package com.backend.service;

import com.backend.Util.PasswordUtil;
import com.backend.dto.auth.IntrospectRequest;
import com.backend.dto.auth.IntrospectResponse;
import com.backend.dto.auth.UserLoginRequest;
import com.backend.dto.auth.AuthenticationResponse;
import com.backend.exception.ErrorCode;
import com.backend.exception.AppException;
import com.backend.mapper.UserMapper;
import com.backend.model.User;
import com.backend.repository.UserRepository;
import com.backend.security.jwt.JwtUtil;
import com.nimbusds.jose.JOSEException;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import org.springframework.stereotype.Service;

import java.text.ParseException;

@Service
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class AuthService {
    UserRepository userRepository;
    UserMapper userMapper;
    PasswordUtil passwordUtil;
    JwtUtil jwtUtil;

    public AuthenticationResponse login(UserLoginRequest loginRequest) {
        User user = userRepository.findByEmail(loginRequest.getEmail()).orElseThrow(
                () -> new AppException(ErrorCode.USER_NOT_FOUND)
        );
        if(!passwordUtil.matches(loginRequest.getPassword(), user.getPassword())) {
            throw new AppException(ErrorCode.INCORRECT_PASSWORD);
        }
        var token = jwtUtil.generateToken(user);

        return new AuthenticationResponse(token);

    }

    public IntrospectResponse introspect(IntrospectRequest request) throws ParseException, JOSEException {
        return jwtUtil.verifyToken(request.getToken());
    }
}
