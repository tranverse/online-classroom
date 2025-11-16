import { Socket } from "socket.io-client";

export type PeerMap = Record<string, RTCPeerConnection>;

type CreatePeerOptions = {
  extraIcePayload?: Record<string, any>;
};

export function createPeerConnection(
  socket: Socket | any,
  localStream: MediaStream | null,
  onRemoteStream?: (id: string, stream: MediaStream) => void,
  options?: CreatePeerOptions
) {
  const pc = new RTCPeerConnection({
    iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
  });

  // bookkeeping
  (pc as any)._remoteId = null;
  let remoteSet = false;
  const queuedCandidates: RTCIceCandidateInit[] = [];
  const remoteStream = new MediaStream();

  pc.oniceconnectionstatechange = () => {
    try {
      console.debug("[webrtc] iceConnectionState", {
        id: (pc as any)._remoteId,
        state: pc.iceConnectionState,
      });
    } catch (e) {}
  };

  pc.onicecandidate = (ev) => {
    try {
      console.debug("[webrtc] onicecandidate", {
        id: (pc as any)._remoteId,
        candidate: ev.candidate,
      });
      if (ev.candidate) {
        const to = (pc as any)._remoteId;
        if (socket && to)
          socket.emit("webrtc:ice", {
            to,
            candidate: ev.candidate,
            ...(options?.extraIcePayload || {}),
          });
      }
    } catch (e) {}
  };

  pc.ontrack = (ev) => {
    try {
      console.debug("[webrtc] ontrack event", {
        id: (pc as any)._remoteId,
        ev,
      });
      ev.streams?.forEach((s: MediaStream) => {
        s.getTracks().forEach((t) => {
          try {
            remoteStream.addTrack(t);
          } catch (e) {}
        });
      });
      if (ev.track && !ev.streams?.length) {
        try {
          remoteStream.addTrack(ev.track);
        } catch (e) {}
      }
      const rid = (pc as any)._remoteId;
      if (onRemoteStream && rid) onRemoteStream(rid, remoteStream);
      try {
        if (rid) {
          window.dispatchEvent(
            new CustomEvent("screen:participant-remote-stream", {
              detail: { id: rid, stream: remoteStream },
            } as any)
          );
          console.debug(
            "[webrtc] dispatched screen:participant-remote-stream",
            { rid, tracks: remoteStream.getTracks().map((t) => t.kind) }
          );
        }
      } catch (e) {}
    } catch (e) {
      console.error("[webrtc] ontrack err", e);
    }
  };

  // safe setRemoteDescription + flush candidates
  (pc as any).safeSetRemoteDescription = async (
    desc: RTCSessionDescriptionInit
  ) => {
    try {
      console.debug("[webrtc] safeSetRemoteDescription start", {
        id: (pc as any)._remoteId,
        descType: desc?.type,
      });
      await pc.setRemoteDescription(desc);
      remoteSet = true;
      // flush queued
      for (const c of queuedCandidates) {
        try {
          await pc.addIceCandidate(new RTCIceCandidate(c));
        } catch (e) {
          console.warn("[webrtc] queued addIceCandidate failed", e);
        }
      }
      queuedCandidates.length = 0;
      console.debug(
        "[webrtc] safeSetRemoteDescription done & flushed candidates",
        { id: (pc as any)._remoteId }
      );
    } catch (e) {
      console.error("[webrtc] safeSetRemoteDescription error", e);
      throw e;
    }
  };

  (pc as any).safeAddIceCandidate = async (cand: RTCIceCandidateInit) => {
    try {
      if (!cand) return;
      if (!remoteSet) {
        queuedCandidates.push(cand);
        console.debug("[webrtc] queued ICE candidate", {
          id: (pc as any)._remoteId,
        });
        return;
      }
      await pc.addIceCandidate(new RTCIceCandidate(cand));
      console.debug("[webrtc] added ICE candidate", {
        id: (pc as any)._remoteId,
      });
    } catch (e) {
      console.warn("[webrtc] safeAddIceCandidate failed", e);
    }
  };

  // add local tracks if present
  if (localStream) {
    try {
      localStream.getTracks().forEach((t) => pc.addTrack(t, localStream));
      console.debug("[webrtc] added local tracks", {
        count: localStream.getTracks().length,
      });
    } catch (e) {}
  }

  return pc as RTCPeerConnection & {
    _remoteId?: string | null;
    safeSetRemoteDescription?: (d: RTCSessionDescriptionInit) => Promise<void>;
    safeAddIceCandidate?: (c: RTCIceCandidateInit) => Promise<void>;
  };
}
