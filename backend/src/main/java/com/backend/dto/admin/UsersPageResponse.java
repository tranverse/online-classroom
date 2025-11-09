package com.backend.dto.admin;

import com.backend.dto.user.UserResponse;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.util.List;

@Getter
@Setter
@NoArgsConstructor
public class UsersPageResponse {
    private List<UserResponse> data;
    private long total;
    private int page;
    private int pageSize;

    public UsersPageResponse(List<UserResponse> data, long total, int page, int pageSize) {
        this.data = data;
        this.total = total;
        this.page = page;
        this.pageSize = pageSize;
    }
}
