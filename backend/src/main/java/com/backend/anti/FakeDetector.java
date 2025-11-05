package com.backend.anti;

import java.util.Map;

public interface FakeDetector {
    // returns a map with keys: livenessPassed (boolean), details (map)
    Map<String, Object> validate(Map<String, Object> challengeMetrics);
}
