package com.backend.model;

import com.backend.enums.Role;
import jakarta.annotation.Nullable;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.Date;
import java.util.List;

@Entity
@AllArgsConstructor
@NoArgsConstructor
@Data
public class User {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private String id;

    @Column(nullable = false)
    private String name;

    @Column(unique = true, nullable = false)
    private String email;

    @Column(nullable = false)
    private String password;

//    @Column(nullable = false)
    private String phone;

    @Column(nullable = true)
    private String avatar;

    @Column(nullable = true)
    private String faceData;

//    @Column(nullable = false)
    private Date dob;

    @Column(nullable = false)
    @Enumerated(EnumType.STRING)
    private Role role;

    @OneToMany(mappedBy = "teacher", cascade = CascadeType.MERGE)
    List<ClassRoom> classRooms;

    @OneToMany(mappedBy = "student")
    List<StudentClass> studentClasses;

    @OneToMany(mappedBy = "student")
    List<Attendance> attendances;



}
