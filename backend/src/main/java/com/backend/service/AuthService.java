package com.backend.service;

import com.backend.Util.PasswordUtil;
import com.backend.dto.auth.*;
import com.backend.exception.ErrorCode;
import com.backend.exception.AppException;
import com.backend.mapper.UserMapper;
import com.backend.model.InvalidatedToken;
import com.backend.model.User;
import com.backend.repository.InvalidatedTokenRepository;
import com.backend.repository.UserRepository;
import com.backend.security.jwt.JwtUtil;
import com.nimbusds.jose.JOSEException;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.text.ParseException;
import java.util.Date;

@Service
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
@Slf4j
public class AuthService {
    UserRepository userRepository;
    InvalidatedTokenRepository invalidatedTokenRepository;
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
        boolean isValid = true;

        try {
            jwtUtil.verifyToken(request.getToken(), false);
            return IntrospectResponse.builder()
                    .valid(isValid)
                    .build();
        } catch (Exception e) {
            isValid = false;
        }
        return IntrospectResponse.builder()
                .valid(isValid)
                .build();
    }

    public void logout(LogoutRequest logoutRequest) throws ParseException, JOSEException {
        try{
            var signToken = jwtUtil.verifyToken(logoutRequest.getToken(), true);
            String jwtId = signToken.getJWTClaimsSet().getJWTID();
            Date expiryDate = signToken.getJWTClaimsSet().getExpirationTime();

            InvalidatedToken invalidatedToken = new InvalidatedToken(jwtId, expiryDate);

            invalidatedTokenRepository.save(invalidatedToken);
        }catch (AppException e) {
            log.error("Token already expired", e);
        }

    }

    public AuthenticationResponse refreshToken(RefreshTokenRequest refreshTokenRequest) throws ParseException, JOSEException {
        var signToken = jwtUtil.verifyToken(refreshTokenRequest.getToken(), true);
        var jwtId = signToken.getJWTClaimsSet().getJWTID();
        var expiryDate = signToken.getJWTClaimsSet().getExpirationTime();

        InvalidatedToken invalidatedToken = new InvalidatedToken(jwtId, expiryDate);
        invalidatedTokenRepository.save(invalidatedToken);

        User user = userRepository.findByEmail(signToken.getJWTClaimsSet().getSubject()).orElseThrow(
                () -> new AppException(ErrorCode.USER_NOT_FOUND)
        );
        String token = jwtUtil.generateToken(user);
        return new AuthenticationResponse(token);
    }
}
