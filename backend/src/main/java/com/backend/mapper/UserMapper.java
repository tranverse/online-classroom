package com.backend.mapper;

import com.backend.dto.user.UserCreateRequest;
import com.backend.dto.user.UserResponse;
import com.backend.model.User;
import org.mapstruct.Mapper;

@Mapper(componentModel = "spring")
public interface UserMapper {
    User toUser(UserCreateRequest userCreateRequest);

    UserResponse toUserResponse(User user);
}
