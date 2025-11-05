package com.backend.service;

import static org.junit.jupiter.api.Assertions.assertTrue;

import java.util.Arrays;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

@SpringBootTest
public class FaceRecognitionServiceTest {
    @Autowired
    FaceRecognitionService service;

    @Test
    public void enrollAndVerify() throws Exception {
        double[] emb = new double[3];
        emb[0] = 0.1; emb[1] = 0.2; emb[2] = 0.3;
        service.saveEmbedding("student-test","class-test", emb);
        java.util.List<double[]> gallery = service.loadEmbeddingsForClassroom("class-test");
        assertTrue(service.verify(emb, gallery));
    }
}
