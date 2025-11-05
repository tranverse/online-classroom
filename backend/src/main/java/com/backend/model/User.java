package com.backend.model;

import java.util.Date;
import java.util.List;

import com.backend.enums.Role;
import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.annotation.JsonManagedReference;

import jakarta.persistence.CascadeType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.OneToMany;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

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

//    @Column(nullable = true)
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
//    @JsonManagedReference(value = "classroom_teacher")
    @JsonIgnore
    List<Classroom> classrooms;

    @OneToMany(mappedBy = "student")
    @JsonManagedReference(value = "student_classroom")
    List<StudentClassroom> studentClasses;

    @OneToMany(mappedBy = "student")
    @JsonManagedReference(value = "student_attendance")
    List<Attendance> attendances;

    @OneToMany(mappedBy = "user")
    @JsonManagedReference(value = "user_folder")
    List<Folder> folders;



}
