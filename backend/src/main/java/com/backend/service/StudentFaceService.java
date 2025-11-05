package com.backend.service;

import com.backend.model.StudentFaceDescriptor;
import com.backend.model.User;
import com.backend.repository.StudentFaceDescriptorRepository;
import com.backend.repository.UserRepository;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Service
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class StudentFaceService {
    StudentFaceDescriptorRepository descriptorRepository;
    UserRepository userRepository;
    ObjectMapper mapper = new ObjectMapper();

    public StudentFaceDescriptor enrollDescriptor(String userId, List<Double> descriptor) {
        try {
            User u = userRepository.findById(userId).orElseThrow();
            StudentFaceDescriptor d = new StudentFaceDescriptor();
            d.setStudent(u);
            d.setDescriptorJson(mapper.writeValueAsString(descriptor));
            d.setCreatedAt(LocalDateTime.now());
            return descriptorRepository.save(d);
        } catch (Exception ex) {
            throw new RuntimeException("Failed to enroll descriptor", ex);
        }
    }

    public List<List<Double>> getDescriptorsForUser(String userId) {
        try {
            User u = userRepository.findById(userId).orElseThrow();
            List<StudentFaceDescriptor> rows = descriptorRepository.findAllByStudent(u);
            List<List<Double>> out = new ArrayList<>();
            for (StudentFaceDescriptor r : rows) {
                List<Double> arr = mapper.readValue(r.getDescriptorJson(), new TypeReference<List<Double>>() {});
                out.add(arr);
            }
            return out;
        } catch (Exception ex) {
            throw new RuntimeException("Failed to read descriptors", ex);
        }
    }

    // compute euclidean distance
    public static double euclidean(List<Double> a, List<Double> b) {
        double sum = 0.0;
        for (int i = 0; i < a.size() && i < b.size(); i++) {
            double d = a.get(i) - b.get(i);
            sum += d * d;
        }
        return Math.sqrt(sum);
    }
}
