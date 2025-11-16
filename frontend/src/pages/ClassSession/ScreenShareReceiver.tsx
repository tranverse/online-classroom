import { useContext, useEffect, useRef } from "react";
import { SocketContext } from "./index";
import { createPeerConnection } from "./webrtc";

const ScreenShareReceiver = () => {
  const socket = useContext(SocketContext as any);
  const pcs = useRef<Record<string, any>>({});

  useEffect(() => {
    if (!socket) return;

    const ensurePc = (from: string) => {
      if (!pcs.current[from]) {
        const pc = createPeerConnection(socket, null, (id, stream) => {
          window.dispatchEvent(
            new CustomEvent("screen:participant-remote-stream", {
              detail: { id, stream },
            } as any)
          );
        });
        (pc as any)._remoteId = from;
        pcs.current[from] = pc;
      }
      return pcs.current[from];
    };

    const onOffer = async (payload: any) => {
      try {
        const from = payload?.from || payload?.id || payload?.socketId;
        const sdp = payload?.sdp || payload?.description || null;
        console.debug("[receiver] onOffer", { from, hasSdp: !!sdp, payload });
        if (!from || !sdp) return;
        const pc = ensurePc(from);

        if (pc.safeSetRemoteDescription) {
          await pc.safeSetRemoteDescription(sdp);
        } else {
          await pc.setRemoteDescription(new RTCSessionDescription(sdp));
        }

        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);

        socket.emit("webrtc:answer", { to: from, sdp: pc.localDescription });
        console.debug("[receiver] sent answer to", from);
      } catch (e) {
        console.error("[receiver] onOffer error", e);
      }
    };

    const onIce = async (payload: any) => {
      try {
        const from = payload?.from || payload?.id || payload?.socketId;
        const candidate = payload?.candidate || payload?.c;
        console.debug("[receiver] onIce", { from, hasCandidate: !!candidate });
        if (!from || !candidate) return;
        const pc = ensurePc(from);
        if (pc.safeAddIceCandidate) {
          await pc.safeAddIceCandidate(candidate);
        } else {
          await pc.addIceCandidate(new RTCIceCandidate(candidate));
        }
        console.debug("[receiver] addIceCandidate ok", from);
      } catch (e) {
        console.warn("[receiver] addIceCandidate failed", e);
      }
    };

    socket.on("webrtc:offer", onOffer);
    socket.on("webrtc:ice", onIce);

    return () => {
      socket.off("webrtc:offer", onOffer);
      socket.off("webrtc:ice", onIce);
      Object.values(pcs.current).forEach((p: any) => {
        try {
          p.close();
        } catch (e) {}
      });
      pcs.current = {};
    };
  }, [socket]);

  return null;
};

export default ScreenShareReceiver;
