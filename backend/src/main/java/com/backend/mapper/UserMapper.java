package com.backend.mapper;

import com.backend.dto.User.UserCreateRequest;
import com.backend.dto.User.UserResponse;
import com.backend.model.User;
import io.lettuce.core.dynamic.annotation.CommandNaming;
import org.mapstruct.Mapper;
import org.springframework.stereotype.Component;
import org.springframework.web.bind.annotation.Mapping;

@Mapper(componentModel = "spring")
public interface UserMapper {
    User toUser(UserCreateRequest userCreateRequest);

    UserResponse toUserResponse(User user);
}
