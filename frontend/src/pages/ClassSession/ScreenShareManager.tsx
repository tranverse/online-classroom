import React, { useContext, useEffect, useRef } from "react";
import { SocketContext } from "./index";
import { createPeerConnection } from "./webrtc";

const ScreenShareManager: React.FC = () => {
  const socket = useContext(SocketContext as any) as any;
  const pcRef = useRef<RTCPeerConnection | null>(null);

  useEffect(() => {
    if (!socket) return;

    const ensurePcForSharer = (sharerId: string) => {
      try {
        if (!sharerId) return;
        if (pcRef.current) {
          try {
            const cur = pcRef.current as RTCPeerConnection;
            if ((cur as any)._remoteId === sharerId) return cur;
          } catch (e) {}
          try {
            pcRef.current.close();
          } catch (e) {}
          pcRef.current = null;
        }

        const pc = createPeerConnection(
          socket,
          null,
          (id: string, stream: MediaStream) => {
            try {
              // Heuristic: if stream looks like display, ACK the sharer
              const vtracks = stream.getVideoTracks() || [];
              let looksDisplay = false;
              for (const t of vtracks) {
                try {
                  const sset = (t as any).getSettings?.();
                  if (sset && (sset.displaySurface || sset.mediaSource)) {
                    looksDisplay = true;
                    break;
                  }
                  const lab = (t as any).label || "";
                  if (/screen|display|monitor|window/i.test(lab)) {
                    looksDisplay = true;
                    break;
                  }
                } catch (e) {}
              }
              if (looksDisplay) {
                socket.emit("screen:stream:received", { to: id });
              }
            } catch (e) {}
          },
          { extraIcePayload: { kind: "screen-share" } }
        );

        (pc as any)._remoteId = sharerId;
        console.debug("ScreenShareManager: created pc for sharer", sharerId);
        try {
          pc.addTransceiver &&
            pc.addTransceiver("video", { direction: "recvonly" });
        } catch (e) {}
        pcRef.current = pc;
        return pc;
      } catch (e) {
        console.warn("ScreenShareManager ensurePcForSharer failed", e);
      }
      return null;
    };

    const sendOfferToSharer = async (
      sharerId: string,
      reason: string
    ): Promise<RTCPeerConnection | null> => {
      const pc = ensurePcForSharer(sharerId);
      if (!pc) return null;
      try {
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        socket.emit("webrtc:offer", {
          to: sharerId,
          sdp: pc.localDescription,
          kind: "screen-share",
        });
        try {
          window.dispatchEvent(
            new CustomEvent("webrtc:debug", {
              detail: `ScreenShareManager: ${reason}-offer->${sharerId}`,
            } as any)
          );
        } catch (e) {}
        return pc;
      } catch (e) {
        console.warn("ScreenShareManager: failed to create offer", e);
        return null;
      }
    };

    const onAnnounce = async (payload: any) => {
      try {
        const sharer = payload?.by || payload?.from || payload?.id;
        if (!sharer) return;
        if (sharer === socket.id) return; // ignore our own announce

        if (!(await sendOfferToSharer(sharer, "announce"))) return;

        // retry loop: resend offer a few times if no answer/stream arrives
        (window as any).__ssm_offer_retry =
          (window as any).__ssm_offer_retry || {};
        if (!(window as any).__ssm_offer_retry[sharer]) {
          (window as any).__ssm_offer_retry[sharer] = 0;
        }
        const maxRetries = 4;
        const retryInterval = 1200;
        const tid = setInterval(async () => {
          try {
            (window as any).__ssm_offer_retry[sharer] += 1;
            const attempts = (window as any).__ssm_offer_retry[sharer];
            if (attempts > maxRetries) {
              clearInterval(tid);
              return;
            }
            // if viewer already acked, stop retry
            const ackSeen =
              Object.keys((window as any).__screenShareAcked || {}).length > 0;
            if (ackSeen) {
              clearInterval(tid);
              return;
            }
            await sendOfferToSharer(sharer, `retry-offer(${attempts})`);
          } catch (e) {}
        }, retryInterval);
      } catch (e) {}
    };

    const onEnsureOffer = (ev: any) => {
      try {
        const sharer = ev?.detail?.sharer;
        if (!sharer || sharer === socket.id) return;
        sendOfferToSharer(sharer, "ensure");
      } catch (e) {}
    };

    const onForceReconnect = (ev: any) => {
      try {
        const sharer = ev?.detail?.sharer;
        if (!sharer || sharer === socket.id) return;
        if (pcRef.current && (pcRef.current as any)._remoteId === sharer) {
          try {
            pcRef.current.close();
          } catch (e) {}
          pcRef.current = null;
        }
        sendOfferToSharer(sharer, "force-reconnect");
      } catch (e) {}
    };

    // --- inside useEffect in ScreenShareManager ---

    const onAnswer = async ({ from, sdp, kind }: any) => {
      try {
        if (kind !== "screen-share") return;
        const pc = pcRef.current;
        if (!pc) return;
        if ((pc as any)._remoteId !== from) return;

        try {
          // prefer safe method if present
          if ((pc as any).safeSetRemoteDescription) {
            await (pc as any).safeSetRemoteDescription(sdp);
          } else {
            await pc.setRemoteDescription(new RTCSessionDescription(sdp));
          }
          console.debug("ScreenShareManager: setRemoteDescription from", from);
        } catch (e) {
          console.warn("ScreenShareManager: failed to setRemoteDescription", e);
        }
      } catch (e) {}
    };

    const onIce = async ({ from, candidate, kind }: any) => {
      try {
        if (kind !== "screen-share") return;
        const pc = pcRef.current;
        if (!pc) return;
        if ((pc as any)._remoteId !== from) return;

        try {
          if ((pc as any).safeAddIceCandidate) {
            await (pc as any).safeAddIceCandidate(candidate);
          } else {
            await pc.addIceCandidate(new RTCIceCandidate(candidate));
          }
          console.debug("ScreenShareManager: added ICE candidate from", from);
        } catch (err) {
          console.warn("ScreenShareManager: addIceCandidate failed", err);
        }
      } catch (e) {}
    };

    const onStop = (payload: any) => {
      try {
        const by = payload?.by || payload?.from || payload?.id;
        if (pcRef.current && (pcRef.current as any)._remoteId === by) {
          try {
            pcRef.current.close();
          } catch (e) {}
          pcRef.current = null;
        }
      } catch (e) {}
    };

    socket.on("screen:share:announce", onAnnounce);
    socket.on("screen:share:stop", onStop);
    socket.on("webrtc:answer", onAnswer);
    socket.on("webrtc:ice", onIce);
    window.addEventListener("screen:ensure-offer", onEnsureOffer as any);
    window.addEventListener("screen:force-reconnect", onForceReconnect as any);

    return () => {
      try {
        socket.off("screen:share:announce", onAnnounce);
        socket.off("screen:share:stop", onStop);
        socket.off("webrtc:answer", onAnswer);
        socket.off("webrtc:ice", onIce);
        window.removeEventListener("screen:ensure-offer", onEnsureOffer as any);
        window.removeEventListener(
          "screen:force-reconnect",
          onForceReconnect as any
        );
      } catch (e) {}
      try {
        if (pcRef.current) pcRef.current.close();
      } catch (e) {}
      pcRef.current = null;
    };
  }, [socket]);

  return null;
};

export default ScreenShareManager;
