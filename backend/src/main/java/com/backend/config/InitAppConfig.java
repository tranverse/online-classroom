package com.backend.config;

import com.backend.Util.PasswordUtil;
import com.backend.enums.Role;
import com.backend.model.User;
import com.backend.repository.UserRepository;
import com.backend.security.jwt.JwtUtil;
import com.infisical.sdk.InfisicalSdk;
import com.infisical.sdk.config.SdkConfig;
import com.infisical.sdk.util.InfisicalException;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
@Slf4j
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

//    @Bean
//    public String dbUsernameSecret() throws InfisicalException {
//        var sdk = new InfisicalSdk(
//                new SdkConfig.Builder()
//                        .withSiteUrl("https://app.infisical.com")
//                        .build()
//        );
//        sdk.Auth().UniversalAuthLogin(
//                "0244b853-3102-4a7b-91f0-37f25c266cdf",
//                "4bc23d0c4ff4b3a485702582bdbf28305570fa7e2c2344fc6001cf0235d3e152"
//        );
//        var secret = sdk.Secrets().GetSecret(
//                "DB_USERNAME",
//                "3399cae4-ef02-43d3-91e0-783f7d05d642",
//                "dev",
//                "/backend",
//                null, null, null
//        );
//        if (secret == null) {
//            throw new RuntimeException("Secret DB_USERNAME not found");
//        }
//        log.info("DB_USERNAME: " + secret.getSecretValue());
//        return secret.getSecretValue();
//    }

}
