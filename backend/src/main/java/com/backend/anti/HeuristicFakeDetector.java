package com.backend.anti;

import java.util.HashMap;
import java.util.Map;

import org.springframework.stereotype.Component;

@Component
public class HeuristicFakeDetector implements FakeDetector {
    @Override
    public Map<String, Object> validate(Map<String, Object> challengeMetrics) {
        boolean blinkProb = false;
        double yawDelta = 0.0;
        if (challengeMetrics.containsKey("blinkProb")) {
            Object v = challengeMetrics.get("blinkProb");
            if (v instanceof Number) blinkProb = ((Number) v).doubleValue() > 0.5;
        }
        if (challengeMetrics.containsKey("yawDelta")) {
            Object v = challengeMetrics.get("yawDelta");
            if (v instanceof Number) yawDelta = ((Number) v).doubleValue();
        }

        boolean passed = blinkProb || Math.abs(yawDelta) > 10.0;
        Map<String, Object> out = new HashMap<>();
        out.put("livenessPassed", passed);
        out.put("blinkProb", blinkProb);
        out.put("yawDelta", yawDelta);
        return out;
    }
}
