import React, { useContext, useEffect, useRef } from "react";
import { SocketContext } from "./index";
import { createPeerConnection } from "./webrtc";

const ScreenShareBroadcaster: React.FC = () => {
  const socket = useContext(SocketContext as any) as any;
  const shareStreamRef = useRef<MediaStream | null>(null);
  const pcsRef = useRef<Record<string, RTCPeerConnection>>({});

  useEffect(() => {
    if (!socket) return;

    const closePc = (id: string) => {
      if (pcsRef.current[id]) {
        try {
          pcsRef.current[id].close();
        } catch (e) {}
        delete pcsRef.current[id];
      }
    };

    const ensurePc = (viewerId: string) => {
      if (!shareStreamRef.current) return null;
      if (pcsRef.current[viewerId]) return pcsRef.current[viewerId];
      const pc = createPeerConnection(
        socket,
        shareStreamRef.current,
        undefined,
        { extraIcePayload: { kind: "screen-share" } }
      );
      (pc as any)._remoteId = viewerId;
      pcsRef.current[viewerId] = pc;
      return pc;
    };

    const onOffer = async ({ from, sdp, kind }: any) => {
      try {
        if (kind !== "screen-share") return;
        if (from === socket.id) return;
        if (!shareStreamRef.current) {
          console.warn(
            "ScreenShareBroadcaster: received offer but no active share stream"
          );
          return;
        }
        const pc = ensurePc(from);
        if (!pc) return;
        try {
          if ((pc as any).safeSetRemoteDescription) {
            await (pc as any).safeSetRemoteDescription(sdp);
          } else {
            await pc.setRemoteDescription(new RTCSessionDescription(sdp));
          }
        } catch (e) {
          console.warn(
            "ScreenShareBroadcaster: setRemoteDescription failed",
            e
          );
          return;
        }
        try {
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          socket.emit("webrtc:answer", {
            to: from,
            sdp: pc.localDescription,
            kind: "screen-share",
          });
        } catch (e) {
          console.warn("ScreenShareBroadcaster: createAnswer failed", e);
        }
      } catch (e) {}
    };

    const onIce = async ({ from, candidate, kind }: any) => {
      try {
        if (kind !== "screen-share") return;
        const pc = pcsRef.current[from];
        if (!pc || !candidate) return;
        try {
          if ((pc as any).safeAddIceCandidate) {
            await (pc as any).safeAddIceCandidate(candidate);
          } else {
            await pc.addIceCandidate(new RTCIceCandidate(candidate));
          }
        } catch (err) {
          console.warn("ScreenShareBroadcaster: addIceCandidate failed", err);
        }
      } catch (e) {}
    };

    const onLocalStream = (ev: any) => {
      shareStreamRef.current = ev?.detail?.stream || null;
      if (!shareStreamRef.current) {
        Object.keys(pcsRef.current).forEach(closePc);
      }
    };

    const onStop = () => {
      shareStreamRef.current = null;
      Object.keys(pcsRef.current).forEach(closePc);
    };

    socket.on("webrtc:offer", onOffer);
    socket.on("webrtc:ice", onIce);
    socket.on("screen:share:stop", onStop);
    window.addEventListener("screen:share:local-stream", onLocalStream as any);
    window.addEventListener("screen:share:stop-local", onStop as any);

    return () => {
      socket.off("webrtc:offer", onOffer);
      socket.off("webrtc:ice", onIce);
      socket.off("screen:share:stop", onStop);
      window.removeEventListener(
        "screen:share:local-stream",
        onLocalStream as any
      );
      window.removeEventListener("screen:share:stop-local", onStop as any);
      Object.keys(pcsRef.current).forEach(closePc);
    };
  }, [socket]);

  return null;
};

export default ScreenShareBroadcaster;
