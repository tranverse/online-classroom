package com.backend.util;

import static org.junit.jupiter.api.Assertions.assertEquals;

import org.junit.jupiter.api.Test;

public class FaceUtilsTest {
    @Test
    public void testCosineSimilarity_identical() {
        double[] a = {1.0, 0.0, 0.0};
        double[] b = {1.0, 0.0, 0.0};
        double s = FaceUtils.cosineSimilarity(a, b);
        assertEquals(1.0, s, 1e-9);
    }

    @Test
    public void testCosineSimilarity_orthogonal() {
        double[] a = {1.0, 0.0};
        double[] b = {0.0, 1.0};
        double s = FaceUtils.cosineSimilarity(a, b);
        assertEquals(0.0, s, 1e-9);
    }
}
