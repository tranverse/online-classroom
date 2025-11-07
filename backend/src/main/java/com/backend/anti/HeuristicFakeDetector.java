package com.backend.anti;

import java.util.HashMap;
import java.util.Map;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

/**
 * Heuristic-based fake detector that combines several signals from the AI analyze endpoint.
 * This implementation is intentionally conservative and exposes details for debugging.
 */
@Component
public class HeuristicFakeDetector implements FakeDetector {

    @Value("${app.liveness.motionThreshold:0.02}")
    private double motionThreshold;

    @Value("${app.liveness.combinedThreshold:0.45}")
    private double combinedThreshold;

    @Value("${app.liveness.blinkThreshold:0.6}")
    private double blinkThreshold;

    @Value("${app.liveness.yawThreshold:8.0}")
    private double yawThreshold;

    @Value("${app.liveness.motionCap:2.0}")
    private double motionCap;

    @Override
    public Map<String, Object> validate(Map<String, Object> challengeMetrics) {
        boolean passed = false;
        double blinkProb = toDouble(challengeMetrics.get("blinkProb"), -1.0);
        double yawDelta = toDouble(challengeMetrics.get("yawDelta"), 0.0);
        double livenessScore = toDouble(challengeMetrics.get("livenessScore"), -1.0);
        double motionScore = toDouble(challengeMetrics.get("motionScore"), 0.0);
        double quality = toDouble(challengeMetrics.get("quality"), toDouble(challengeMetrics.get("blur"), 0.0));
        double brightness = toDouble(challengeMetrics.get("brightness"), -1.0);

        // direct challenge signals (blink / yaw) are strong indicators
        if (blinkProb >= blinkThreshold) passed = true;
        if (Math.abs(yawDelta) >= yawThreshold) passed = true;

        // normalized motion
        double motionNorm = Math.min(Math.max(motionScore / motionCap, 0.0), 1.0);

        // build combined score from available signals; prefer livenessScore when provided
        double combined = 0.0;
        int components = 0;
        if (livenessScore >= 0.0) { combined += 0.5 * livenessScore; components += 1; }
        combined += 0.25 * motionNorm; components += 1;
        combined += 0.15 * quality; components += 1;
        if (brightness >= 0.0) { combined += 0.10 * brightness; components += 1; }
        // normalize combined by number of components to keep threshold stable
        double normalizedCombined = components > 0 ? (combined / components) : 0.0;

        if (normalizedCombined >= combinedThreshold) passed = true;

        Map<String, Object> out = new HashMap<>();
        out.put("livenessPassed", passed);
        Map<String, Object> details = new HashMap<>();
        details.put("blinkProb", blinkProb);
        details.put("yawDelta", yawDelta);
        details.put("livenessScore", livenessScore);
        details.put("motionScore", motionScore);
        details.put("motionNorm", motionNorm);
        details.put("quality", quality);
        details.put("brightness", brightness);
        details.put("combined", normalizedCombined);
        details.put("thresholds", Map.of(
                "combinedThreshold", combinedThreshold,
                "blinkThreshold", blinkThreshold,
                "yawThreshold", yawThreshold,
                "motionThreshold", motionThreshold
        ));
        out.put("details", details);
        return out;
    }

    private double toDouble(Object o, double def) {
        if (o == null) return def;
        if (o instanceof Number) return ((Number) o).doubleValue();
        try {
            return Double.parseDouble(String.valueOf(o));
        } catch (Exception e) {
            return def;
        }
    }
}
