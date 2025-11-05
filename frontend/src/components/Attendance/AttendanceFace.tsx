import React, { useEffect, useRef, useState } from "react";
import StudentService from "../../services/student.service";

// dynamic import of face-api (optional)
let faceapi: any = null;
try {
  // @ts-ignore
  faceapi = (window as any).faceapi;
} catch (e) {
  faceapi = null;
}

type Props = {
  classroomId: string;
  sessionId: string;
  studentId?: string;
  onResult?: (r: any) => void;
};

const AttendanceFace: React.FC<Props> = ({
  classroomId,
  sessionId,
  studentId,
  onResult,
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [consent, setConsent] = useState(false);
  const [streaming, setStreaming] = useState(false);
  const [challenge, setChallenge] = useState<string | null>(null);

  useEffect(() => {
    // load models from public/models
    const loadModels = async () => {
      if (faceapi && faceapi.nets) return;
      try {
        // try to import face-api dynamically
        const mod = await import("face-api.js");
        faceapi = mod;
        await faceapi.nets.ssdMobilenetv1.loadFromUri("/models");
        await faceapi.nets.faceLandmark68Net.loadFromUri("/models");
        await faceapi.nets.faceRecognitionNet.loadFromUri("/models");
      } catch (e) {
        console.warn(
          "face-api not available, falling back to mocked embeddings",
          e
        );
        faceapi = null;
      }
    };
    loadModels();
    // fetch challenge
    StudentService.getFaceChallenge = async () => {
      const { data } = await fetch("/api/face/challenge").then((r) => r.json());
      return data;
    };
  }, []);

  const start = async () => {
    if (!consent) return;
    try {
      const s = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: false,
      });
      if (videoRef.current) {
        videoRef.current.srcObject = s;
        await videoRef.current.play();
      }
      setStreaming(true);
      const ch = await StudentService.getFaceChallenge();
      setChallenge(ch?.challenge || ch?.data?.challenge || null);
    } catch (ex) {
      console.error(ex);
    }
  };

  const stop = () => {
    const tracks =
      (videoRef.current?.srcObject as MediaStream)?.getTracks() || [];
    tracks.forEach((t) => t.stop());
    setStreaming(false);
  };

  const doCheck = async () => {
    // gather frames for a few seconds and compute metrics/embeddings
    const embeddings: number[][] = [];
    const yawValues: number[] = [];
    const eyeEARs: number[] = [];
    const frames = 25;
    for (let i = 0; i < frames; i++) {
      if (!videoRef.current) break;
      if (faceapi) {
        const det = await faceapi
          .detectSingleFace(videoRef.current)
          .withFaceLandmarks()
          .withFaceDescriptor();
        if (det) {
          if (det.descriptor) embeddings.push(Array.from(det.descriptor));
          // compute basic yaw estimate from landmarks: use nose tip and left/right eye x positions
          try {
            const lm = det.landmarks;
            const leftEye = lm.getLeftEye();
            const rightEye = lm.getRightEye();
            const nose = lm.getNose();
            const eyeMidX = (leftEye[0].x + rightEye[3].x) / 2.0;
            const noseX = nose[3].x;
            yawValues.push(noseX - eyeMidX);
            // compute simple EAR for blink detection
            const ear = computeEAR(leftEye) + computeEAR(rightEye);
            eyeEARs.push(ear / 2);
          } catch (e) {
            // ignore landmark errors
          }
        }
      } else {
        // fallback: push a deterministic mock embedding
        embeddings.push(new Array(128).fill(0.01 * (i + 1)));
        yawValues.push(0);
        eyeEARs.push(0.3);
      }
      await new Promise((r) => setTimeout(r, 120));
    }

    // compute average embedding
    let embedding: number[] = [];
    if (embeddings.length > 0) {
      const dim = embeddings[0].length;
      embedding = new Array(dim).fill(0);
      embeddings.forEach((e) => {
        for (let i = 0; i < dim; i++) embedding[i] += e[i];
      });
      for (let i = 0; i < dim; i++) embedding[i] /= embeddings.length;
    }

    // metrics
    const avgYaw = yawValues.length
      ? yawValues.reduce((a, b) => a + b, 0) / yawValues.length
      : 0;
    const avgEAR = eyeEARs.length
      ? eyeEARs.reduce((a, b) => a + b, 0) / eyeEARs.length
      : 0;
    const blinkProb = avgEAR < 0.25 ? 0.9 : 0.1; // heuristic

    const challengeMetrics = { blinkProb, yawDelta: avgYaw, avgEAR };

    const payload = { studentId, embedding, challengeMetrics };
    const res = await fetch(`/api/face/check/${classroomId}/${sessionId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }).then((r) => r.json());
    onResult?.(res);
  };

  const computeEAR = (eye: { x: number; y: number }[]) => {
    // eye: 6 points
    const dist = (a: { x: number; y: number }, b: { x: number; y: number }) =>
      Math.hypot(a.x - b.x, a.y - b.y);
    const A = dist(eye[1], eye[5]);
    const B = dist(eye[2], eye[4]);
    const C = dist(eye[0], eye[3]);
    return (A + B) / (2.0 * C);
  };

  return (
    <div>
      {!consent && (
        <div>
          <p>
            We need to access your camera for face attendance. Do you consent?
          </p>
          <button onClick={() => setConsent(true)}>I consent</button>
        </div>
      )}
      {consent && (
        <div>
          <video ref={videoRef} style={{ width: 320, height: 240 }} />
          {!streaming ? (
            <button onClick={start}>Start Camera & Get Challenge</button>
          ) : (
            <div>
              <div>Challenge: {challenge}</div>
              <button onClick={doCheck}>Verify & Check-in</button>
              <button onClick={stop}>Stop</button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default AttendanceFace;
