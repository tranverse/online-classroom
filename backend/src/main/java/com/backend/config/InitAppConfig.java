package com.backend.config;

import com.backend.Util.PasswordUtil;
import com.backend.enums.Role;
import com.backend.model.User;
import com.backend.repository.UserRepository;
import com.backend.security.jwt.JwtUtil;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class InitAppConfig implements ApplicationRunner {
    final UserRepository userRepository;
    final PasswordUtil passwordUtil;

    @Value("${app.admin.email}")
    String email;

    @Value("${app.admin.password}")
    String password;

    @Value("${app.admin.name}")
    String name;

    @Override
    public void run(ApplicationArguments args) throws Exception {
        createUserIfNotExist(email, Role.ADMIN);
        createUserIfNotExist("hnbt03@gmail.com", Role.STUDENT);
        createUserIfNotExist("tranho30122@gmail.com", Role.TEACHER);
    }

    public void createUserIfNotExist(String email, Role role) {
        if(userRepository.existsByEmailAndRole(email, role)) {
            return;
        }

        User user = new User();
        user.setEmail(email);
        user.setPassword(passwordUtil.passwordEncode(password));
        user.setName(name);
        user.setRole(role);
        userRepository.save(user);

    }
}
