import React, { useContext, useEffect, useRef, useState } from "react";
import { SocketContext } from "../index";
import { createPeerConnection } from "../webrtc";
import { FiCamera, FiCameraOff, FiMic, FiMicOff } from "react-icons/fi";
import authMemory from "@services/authMemory";

const ParticipantsGrid: React.FC<{
  compact?: boolean;
  onRemoteStream?: (id: string, stream: MediaStream) => void;
}> = ({ compact, onRemoteStream }) => {
  const socket = useContext(SocketContext as any) as any;
  const [peers, setPeers] = useState<string[]>([]);
  const pcs = useRef<Record<string, RTCPeerConnection>>({});
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  // keep a dedicated camera stream so thumbnails can show camera while
  // localStream may be replaced by a screen-share stream when sharing.
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [remoteStreams, setRemoteStreams] = useState<
    Record<string, MediaStream>
  >({});
  const [names, setNames] = useState<Record<string, string>>({});
  const [showDebug, setShowDebug] = useState<boolean>(() => {
    try {
      const url = new URL(window.location.href);
      return (
        url.searchParams.get("debug") === "webrtc" ||
        (window as any).__DEBUG_WEBRTC
      );
    } catch (e) {
      return !!(window as any).__DEBUG_WEBRTC;
    }
  });

  const storedUser = React.useMemo(() => {
    try {
      return authMemory.getUser() || {};
    } catch (e) {
      return {};
    }
  }, []);

  const [localName] = useState<string>(
    storedUser.name || (window as any).__CURRENT_USER_NAME || "Me"
  );
  const localUserId = storedUser.id || null;
  const myId = socket?.id as string | undefined;

  // Nhận remote stream
  const handleRemoteStream = (id: string, stream: MediaStream) => {
    setRemoteStreams((s) => {
      const next = { ...s, [id]: stream };
      try {
        console.debug("ParticipantsGrid: dispatching remote stream", {
          id,
          streamTracks: stream?.getTracks().map((t) => t.kind),
        });
        // Notify parent about any remote stream arrival. Parent will decide
        // whether the stream represents a screen-share or a camera stream.
        try {
          if (onRemoteStream) onRemoteStream(id, stream);
        } catch (e) {}
      } catch (e) {
        console.warn("ParticipantsGrid: failed dispatching remote stream", e);
      }
      try {
        // participants grid no longer emits screen ACKs here
      } catch (e) {}
      return next;
    });
  };

  // Announce local stream
  useEffect(() => {
    if (!socket) return;
    socket.emit("webrtc:announce", {
      hasStream: !!localStream,
      userId: localUserId,
      userName: localName,
    });
  }, [localStream, localName, socket, localUserId]);

  // When localStream changes, add/remove tracks to existing peer connections and renegotiate
  useEffect(() => {
    if (!socket) return;

    const renegotiateAll = async (force = false) => {
      const ids = Object.keys(pcs.current);
      for (const id of ids) {
        const pc = pcs.current[id];
        if (!pc) continue;

        try {
          console.debug("renegotiateAll: pc", id, { hasLocal: !!localStream });
          // update existing senders via replaceTrack when possible
          const senders = pc.getSenders();
          console.debug(
            "renegotiateAll: senders before",
            id,
            senders.map((s) => ({
              kind: s.track?.kind,
              id: (s.track as any)?.id,
            }))
          );
          if (!localStream) {
            // stop sending by replacing with null
            senders.forEach((s) => {
              try {
                if (s.replaceTrack) s.replaceTrack(null as any);
              } catch (e) {}
            });
          } else {
            // for each sender, try to replace with matching kind track
            const tracksByKind: Record<string, MediaStreamTrack[]> = {};
            localStream.getTracks().forEach((t) => {
              tracksByKind[t.kind] = tracksByKind[t.kind] || [];
              tracksByKind[t.kind].push(t);
            });

            // replace existing senders
            senders.forEach((s) => {
              try {
                const kind = s.track?.kind;
                const replacement = kind
                  ? tracksByKind[kind] && tracksByKind[kind].shift()
                  : null;
                if (s.replaceTrack) {
                  s.replaceTrack(replacement || (null as any));
                }
              } catch (e) {}
            });

            // add remaining tracks that didn't match a sender
            const remaining = [] as MediaStreamTrack[];
            for (const k of Object.keys(tracksByKind)) {
              remaining.push(...(tracksByKind[k] || []));
            }
            remaining.forEach((t) => {
              try {
                pc.addTrack(t, localStream as MediaStream);
              } catch (e) {}
            });
            console.debug(
              "renegotiateAll: senders after add",
              id,
              pc
                .getSenders()
                .map((s) => ({ kind: s.track?.kind, id: (s.track as any)?.id }))
            );
          }

          // create offer to renegotiate
          // Normally we use lexicographic ordering to avoid duplicate offers,
          // but when our local stream changed (e.g., starting screen share)
          // we force the sharer to initiate renegotiation so peers receive tracks.
          if (force || (myId && myId < id)) {
            console.debug("renegotiate: creating offer to", id, { force });
            const offer = await pc.createOffer();
            await pc.setLocalDescription(offer);
            socket.emit("webrtc:offer", { to: id, sdp: pc.localDescription });
          } else {
            console.log("renegotiate: skipping offer for", id, "not initiator");
          }
        } catch (e) {
          console.warn("renegotiate failed for", id, e);
        }
      }
    };

    // force renegotiation so the side that changed localStream (sharer)
    // initiates offers and ensures tracks are delivered to peers.
    renegotiateAll(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [localStream]);
  // Mở camera & mic khi mount
  useEffect(() => {
    let mounted = true;
    const getLocal = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true,
        });
        if (!mounted) return;
        setLocalStream(stream);
        setCameraStream(stream);
      } catch (e) {
        console.warn("Cannot open local camera:", e);
      }
    };
    getLocal();
    return () => {
      mounted = false;
    };
  }, []);

  // screen share handlers: listen for local-stream event and stop-local
  useEffect(() => {
    const onLocalStream = (ev: any) => {
      try {
        const stream = ev?.detail?.stream as MediaStream | undefined;
        // When a user starts sharing, we set the active localStream to the
        // provided display stream (so it is sent to peers), but we keep the
        // cameraStream intact so the local camera thumbnail continues to show.
        if (stream) setLocalStream(stream);
      } catch (e) {}
    };

    const stopLocalShare = async () => {
      try {
        // If we have a saved camera stream, restore it as the active localStream
        // and stop tracks of the previous (likely display) stream. Otherwise
        // reacquire camera/mic and set both cameraStream and localStream.
        if (cameraStream) {
          try {
            if (localStream && localStream !== cameraStream) {
              localStream.getTracks().forEach((t) => t.stop());
            }
          } catch (e) {}
          setLocalStream(cameraStream);
        } else {
          const s = await navigator.mediaDevices.getUserMedia({
            video: true,
            audio: true,
          });
          setCameraStream(s);
          setLocalStream(s);
        }
      } catch (e) {
        console.warn("stop share failed", e);
      }
    };

    window.addEventListener("screen:share:local-stream", onLocalStream as any);
    window.addEventListener("screen:share:stop-local", stopLocalShare as any);
    return () => {
      window.removeEventListener(
        "screen:share:local-stream",
        onLocalStream as any
      );
      window.removeEventListener(
        "screen:share:stop-local",
        stopLocalShare as any
      );
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [localStream]);

  // When localStream is set (e.g., sharer started display), ensure we push tracks
  // to existing peer connections and initiate renegotiation so peers receive the stream.
  useEffect(() => {
    if (!localStream || !socket) return;
    (async () => {
      const ids = Object.keys(pcs.current);
      for (const id of ids) {
        try {
          const pc = pcs.current[id];
          if (!pc) continue;
          // add display tracks to pc (if not already present)
          const hasVideoSender = pc
            .getSenders()
            .some((s) => s.track && s.track.kind === "video");
          if (!hasVideoSender) {
            const v = localStream.getVideoTracks()[0];
            if (v) {
              try {
                pc.addTrack(v, localStream as MediaStream);
                console.debug(
                  "ParticipantsGrid: added display track to pc",
                  id
                );
              } catch (e) {
                try {
                  pc.addTransceiver("video", { direction: "sendonly" });
                } catch (e2) {}
              }
            }
          }
          // create offer to ensure send m-line is negotiated
          try {
            const offer = await pc.createOffer();
            await pc.setLocalDescription(offer);
            console.debug(
              "ParticipantsGrid: sharer created offer to",
              id,
              pc.localDescription?.sdp?.slice(0, 200)
            );
            socket.emit("webrtc:offer", { to: id, sdp: pc.localDescription });
          } catch (e) {
            console.warn("ParticipantsGrid: renegotiate offer failed", id, e);
          }
        } catch (e) {}
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [localStream]);

  // Join room
  useEffect(() => {
    if (!socket) return;
    const room = (window as any).__CURRENT_CLASSSESSION_ID || "default-room";
    socket.emit("join", { room, userId: localUserId, userName: localName });
    setTimeout(() => socket.emit("participants:get", { room }), 500);
    setTimeout(() => socket.emit("participants:get", { room }), 1500);
  }, [socket, localUserId, localName]);
  useEffect(() => {
    if (!socket || !localStream) return;

    const connectToPeer = async (peerId: string) => {
      if (peerId === myId || pcs.current[peerId]) return;

      // chỉ client có socketId nhỏ hơn tạo offer
      if (myId! > peerId) return;

      const pc = createPeerConnection(socket, localStream, handleRemoteStream);
      (pc as any)["_remoteId"] = peerId;
      pcs.current[peerId] = pc;

      try {
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        socket.emit("webrtc:offer", { to: peerId, sdp: pc.localDescription });
      } catch (err) {
        console.warn("failed to create offer", peerId, err);
      }
    };

    // kết nối với tất cả peers hiện tại
    peers.forEach(connectToPeer);

    // kết nối khi có peer mới join
    const handleJoin = (p: any) => {
      const sid = p?.socketId || p?.id;
      if (!sid) return;
      setPeers((prev) => Array.from(new Set([...prev, sid])));
      connectToPeer(sid);
    };

    socket.on("participant:joined", handleJoin);

    return () => {
      socket.off("participant:joined", handleJoin);
    };
  }, [peers, socket, localStream]);

  // Ensure connection to sharer when a share announce happens (viewer side)
  useEffect(() => {
    if (!socket) return;
    const lastOfferAt: Record<string, number> = {};

    const onShareAnnounce = async (payload: any) => {
      try {
        const sharer = payload?.by || payload?.from || payload?.id;
        if (!sharer) return;
        if (sharer === socket.id) return; // ignore our own announce

        // avoid spamming offers repeatedly
        const now = Date.now();
        if (lastOfferAt[sharer] && now - lastOfferAt[sharer] < 3000) return;
        lastOfferAt[sharer] = now;

        // ensure pc exists
        let pc = pcs.current[sharer];
        if (!pc) {
          pc = createPeerConnection(socket, localStream, handleRemoteStream);
          (pc as any)["_remoteId"] = sharer;
          pcs.current[sharer] = pc;
        }

        try {
          // add a recvonly transceiver to ensure we negotiate a recv m-line for video
          pc.addTransceiver("video", { direction: "recvonly" });
        } catch (e) {
          // ignore if transceivers unsupported
        }

        try {
          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);
          // debug: log SDP for diagnostics
          try {
            console.debug(
              "webrtc:offer SDP to",
              sharer,
              pc.localDescription?.sdp?.slice(0, 200)
            );
          } catch (e) {}
          socket.emit("webrtc:offer", { to: sharer, sdp: pc.localDescription });
          console.debug(
            "ParticipantsGrid: viewer created offer to sharer",
            sharer
          );

          // schedule a single retry if no remote stream arrives within 2s
          if (!((window as any).__offerRetryDone || {})[sharer]) {
            setTimeout(async () => {
              try {
                // if we already have a remote stream for sharer, skip retry
                if (remoteStreams[sharer]) return;
                const retryOffer = await pc.createOffer();
                await pc.setLocalDescription(retryOffer);
                console.debug(
                  "webrtc:offer retry SDP to",
                  sharer,
                  pc.localDescription?.sdp?.slice(0, 200)
                );
                socket.emit("webrtc:offer", {
                  to: sharer,
                  sdp: pc.localDescription,
                });
                console.debug(
                  "ParticipantsGrid: viewer retry offer to sharer",
                  sharer
                );
                (window as any).__offerRetryDone =
                  (window as any).__offerRetryDone || {};
                (window as any).__offerRetryDone[sharer] = true;
              } catch (e) {
                console.warn("offer retry failed", e);
              }
            }, 2000);
          }
        } catch (e) {
          console.warn("ParticipantsGrid: failed to create offer to sharer", e);
        }
      } catch (e) {}
    };

    socket.on("screen:share:announce", onShareAnnounce);
    return () => {
      socket.off("screen:share:announce", onShareAnnounce);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [socket, localStream]);

  // Listen for external force-retry events to attempt creating an offer to a sharer.
  // This is useful when a race causes viewers not to receive the shared stream.
  useEffect(() => {
    const onEnsureOffer = async (ev: any) => {
      try {
        const sharer = ev?.detail?.sharer || ev?.detail || ev;
        if (!sharer || !socket) return;
        if (sharer === socket.id) return;

        // ensure pc exists
        let pc = pcs.current[sharer];
        if (!pc) {
          pc = createPeerConnection(socket, localStream, handleRemoteStream);
          (pc as any)["_remoteId"] = sharer;
          pcs.current[sharer] = pc;
        }

        try {
          // add a recvonly transceiver to ensure recv m-line
          pc.addTransceiver &&
            pc.addTransceiver("video", { direction: "recvonly" });
        } catch (e) {}

        try {
          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);
          socket.emit("webrtc:offer", { to: sharer, sdp: pc.localDescription });
          console.debug("ParticipantsGrid: ensure-offer sent to", sharer);
        } catch (e) {
          console.warn("ParticipantsGrid: ensure-offer failed", sharer, e);
        }
      } catch (e) {}
    };

    window.addEventListener("screen:ensure-offer", onEnsureOffer as any);
    return () =>
      window.removeEventListener("screen:ensure-offer", onEnsureOffer as any);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [socket, localStream]);

  // Socket events
  useEffect(() => {
    if (!socket) return;

    const extractName = (obj: any) =>
      obj?.userName || obj?.name || obj?.displayName || null;

    const onJoin = (p: any) => {
      const sid = p?.socketId || p?.id;
      if (!sid) return;
      setPeers((s) => Array.from(new Set([...s, sid])));
      const nm = extractName(p);
      if (nm) setNames((n) => ({ ...n, [sid]: nm }));
    };

    const onLeave = (p: any) => {
      const id = p?.socketId || p?.id;
      if (!id) return;
      setPeers((s) => s.filter((x) => x !== id));
      if (pcs.current[id]) {
        try {
          pcs.current[id].close();
        } catch {}
        delete pcs.current[id];
      }
      setRemoteStreams((r) => {
        const n = { ...r };
        delete n[id];
        return n;
      });
    };

    const onList = (items: any[]) => {
      const filtered = (items || []).filter(
        (it) => (it?.socketId || it?.id) !== socket?.id
      );
      const ids = filtered.map((it) => it.socketId || it.id).filter(Boolean);
      setPeers(ids);
      const nameMap: Record<string, string> = {};
      filtered.forEach((it) => {
        const sid = it.socketId || it.id;
        const nm = extractName(it);
        if (sid && nm) nameMap[sid] = nm;
      });
      setNames((prev) => ({ ...prev, ...nameMap }));
    };

    const onAnnounce = (payload: any) => {
      const sid = payload?.socketId || payload?.id || payload?.from;
      if (!sid) return;
      setPeers((s) => Array.from(new Set([...s, sid])));
      const nm = extractName(payload) || payload?.name || null;
      if (nm) setNames((n) => ({ ...n, [sid]: nm }));
    };

    socket.on("participant:joined", onJoin);
    socket.on("participant:left", onLeave);
    socket.on("participants:list", onList);
    socket.on("webrtc:announce", onAnnounce);

    // WebRTC signaling
    socket.on("webrtc:offer", async ({ from, sdp }: any) => {
      // Handle incoming offer even if we already have a pc (renegotiation)
      let pc = pcs.current[from];
      if (!pc) {
        pc = createPeerConnection(socket, localStream, handleRemoteStream);
        (pc as any)["_remoteId"] = from;
        pcs.current[from] = pc;
        // If we already have a localStream (e.g., sharer with displayMedia),
        // attach its tracks so the answerer will include the proper send m-lines.
        try {
          if (localStream) {
            localStream.getTracks().forEach((t) => {
              try {
                pc!.addTrack(t, localStream as MediaStream);
              } catch (e) {}
            });
            console.debug(
              "webrtc:offer handler attached localStream tracks to pc",
              from,
              localStream.getTracks().map((t) => t.kind)
            );
          }
        } catch (e) {}
      }
      try {
        console.log("webrtc:offer - setRemoteDescription from", from);
        await pc.setRemoteDescription(new RTCSessionDescription(sdp));
        // Defensive: if we are answerer and have a localStream but pc has no senders
        // for video (e.g., displayMedia added after pc creation), ensure we add a send
        // transceiver or attach the video track so the answer will include a send m-line.
        try {
          const hasLocalVideoSender = pc
            .getSenders()
            .some((s) => s.track && s.track.kind === "video");
          if (localStream && !hasLocalVideoSender) {
            // try to add video tracks explicitly
            const vidTrack = localStream.getVideoTracks()[0];
            if (vidTrack) {
              try {
                pc.addTrack(vidTrack, localStream as MediaStream);
                console.debug(
                  "webrtc:offer handler added local video track before answer",
                  from
                );
              } catch (e) {
                try {
                  pc.addTransceiver("video", { direction: "sendonly" });
                  console.debug(
                    "webrtc:offer handler added sendonly transceiver before answer",
                    from
                  );
                } catch (e2) {}
              }
            } else {
              try {
                pc.addTransceiver("video", { direction: "sendonly" });
                console.debug(
                  "webrtc:offer handler added sendonly transceiver before answer (no video track)",
                  from
                );
              } catch (e) {}
            }
          }
        } catch (e) {}
        try {
          console.debug(
            "webrtc:offer pc senders before answer",
            from,
            pc
              .getSenders()
              .map((s) => ({ kind: s.track?.kind, id: (s.track as any)?.id }))
          );
          console.debug(
            "webrtc:offer pc transceivers before answer",
            from,
            pc
              .getTransceivers()
              .map((t) => ({ mid: t.mid, direction: t.direction }))
          );
        } catch (e) {}
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        try {
          console.debug(
            "webrtc:answer SDP for",
            from,
            pc.localDescription?.sdp?.slice(0, 200)
          );
        } catch (e) {}
        console.debug(
          "webrtc:answer created, pc senders after setLocal",
          from,
          pc
            .getSenders()
            .map((s) => ({ kind: s.track?.kind, id: (s.track as any)?.id }))
        );
        console.log("webrtc:answer - sending answer to", from);
        socket.emit("webrtc:answer", { to: from, sdp: pc.localDescription });
      } catch (err) {
        console.warn("webrtc:offer handling failed", err);
      }
    });

    socket.on("webrtc:answer", async ({ from, sdp }: any) => {
      const pc = pcs.current[from];
      if (!pc) return;
      try {
        console.log("webrtc:answer - setRemoteDescription from", from);
        await pc.setRemoteDescription(new RTCSessionDescription(sdp));
        try {
          console.debug(
            "webrtc:answer pc senders",
            from,
            pc
              .getSenders()
              .map((s) => ({ kind: s.track?.kind, id: (s.track as any)?.id }))
          );
          console.debug(
            "webrtc:answer pc transceivers",
            from,
            pc
              .getTransceivers()
              .map((t) => ({ mid: t.mid, direction: t.direction }))
          );
        } catch (e) {}
      } catch (err) {
        console.warn(err);
      }
    });

    socket.on("webrtc:ice", async ({ from, candidate }: any) => {
      const pc = pcs.current[from];
      if (!pc) return;
      try {
        await pc.addIceCandidate(new RTCIceCandidate(candidate));
      } catch {}
    });

    return () => {
      socket.off("participant:joined", onJoin);
      socket.off("participant:left", onLeave);
      socket.off("participants:list", onList);
      socket.off("webrtc:announce", onAnnounce);
      socket.off("webrtc:offer");
      socket.off("webrtc:answer");
      socket.off("webrtc:ice");
    };
  }, [socket, localStream]);

  // VideoTile component
  const VideoTile = ({
    id,
    stream,
    isLocal,
    small,
  }: {
    id: string;
    stream: MediaStream | null;
    isLocal?: boolean;
    small?: boolean;
  }) => {
    const [tileStream, setTileStream] = useState<MediaStream | null>(stream);
    useEffect(() => {
      setTileStream(stream);
    }, [stream]);

    const [isCamOn, setIsCamOn] = useState(!!stream);
    const [isMicOn, setIsMicOn] = useState(true);

    const toggleCam = async () => {
      if (!isLocal) return;
      // Toggle the camera thumbnail (cameraStream). The actual sent stream
      // (localStream) should remain the screen-share if one is active.
      if (cameraStream) {
        try {
          cameraStream.getTracks().forEach((t) => t.stop());
        } catch (e) {}
        setCameraStream(null);
        // if we were not sharing and localStream pointed to camera, clear it
        try {
          if (localStream === cameraStream) setLocalStream(null);
        } catch (e) {}
        setIsCamOn(false);
      } else {
        try {
          const s = await navigator.mediaDevices.getUserMedia({
            video: true,
            audio: true,
          });
          setCameraStream(s);
          // if we're not currently sharing (localStream has no display tracks)
          // make this camera the active localStream so peers receive it.
          let hasDisplay = false;
          try {
            if (localStream) {
              const vt = localStream.getVideoTracks()[0];
              if (vt && (vt as any).getSettings) {
                const sset = (vt as any).getSettings();
                if (sset && (sset.displaySurface || sset.mediaSource)) {
                  hasDisplay = true;
                }
              }
              // also inspect label as a fallback
              const lab = vt ? (vt as any).label || "" : "";
              if (/screen|display|window|monitor/i.test(lab)) hasDisplay = true;
            }
          } catch (e) {}
          if (!hasDisplay) setLocalStream(s);
          setIsCamOn(true);
          setIsMicOn(true);
        } catch (e) {
          console.warn(e);
        }
      }
    };

    const toggleMic = () => {
      if (!tileStream) return;
      tileStream.getAudioTracks().forEach((t) => (t.enabled = !isMicOn));
      setIsMicOn(!isMicOn);
    };

    const isSmall = !!small || !!compact;

    return (
      <div
        className={`bg-gray-900 rounded-lg overflow-hidden flex flex-col shadow mb-4 relative ${
          isSmall ? "w-40" : "w-full"
        }`}
        style={isSmall ? { width: 160 } : undefined}
      >
        <div className="flex items-center justify-between p-2 bg-gray-800 text-white text-sm font-medium z-10">
          <div>{isLocal ? localName : names[id] || id}</div>
          {isLocal && (
            <div className="flex items-center gap-2">
              <button
                onClick={toggleCam}
                className="text-white"
                title={isCamOn ? "Turn camera off" : "Turn camera on"}
              >
                {isCamOn ? <FiCamera /> : <FiCameraOff />}
              </button>
              <button
                onClick={toggleMic}
                className="text-white"
                title={isMicOn ? "Mute mic" : "Unmute mic"}
              >
                {isMicOn ? <FiMic /> : <FiMicOff />}
              </button>
            </div>
          )}
        </div>
        <div
          className={
            compact
              ? "bg-black relative"
              : "bg-black w-full aspect-video relative"
          }
          style={compact ? { width: 160, height: 90 } : undefined}
        >
          <video
            autoPlay
            playsInline
            muted={true} // mute to allow autoplay without user gesture
            className={
              compact
                ? "w-full h-full object-cover absolute top-0 left-0 rounded"
                : "w-full h-full object-cover absolute top-0 left-0 rounded-b-lg"
            }
            ref={(el) => {
              if (el && tileStream) {
                try {
                  el.srcObject = tileStream;
                  // attempt to play immediately (some browsers require a user gesture otherwise)
                  el.play().catch(() => {});
                } catch (e) {
                  console.warn("video attach failed", e);
                }
              }
            }}
          />
        </div>
      </div>
    );
  };

  // debug panel: per-peer sender/transceiver state
  const DebugPanel = () => {
    if (!showDebug) return null;
    const ids = Object.keys(pcs.current);
    return (
      <div className="fixed right-2 bottom-2 z-50 p-2 bg-black/80 text-white text-xs rounded max-h-96 overflow-auto w-80">
        <div className="flex items-center justify-between mb-2">
          <div className="font-semibold">WebRTC Debug</div>
          <button
            className="px-2 bg-white text-black rounded text-xs"
            onClick={() => setShowDebug(false)}
          >
            Close
          </button>
        </div>
        {ids.length === 0 && <div>No peer connections</div>}
        {ids.map((id) => {
          const pc = pcs.current[id];
          let senders: any[] = [];
          let tr: any[] = [];
          try {
            senders = pc
              ? pc.getSenders().map((s) => ({
                  kind: s.track?.kind,
                  id: (s.track as any)?.id,
                }))
              : [];
            tr = pc
              ? pc
                  .getTransceivers()
                  .map((t) => ({ mid: t.mid, direction: t.direction }))
              : [];
          } catch (e) {}
          return (
            <div key={id} className="mb-2 border-b pb-1">
              <div className="font-medium">{names[id] || id}</div>
              <div>Has remote stream: {remoteStreams[id] ? "yes" : "no"}</div>
              <div>Senders: {JSON.stringify(senders)}</div>
              <div>Transceivers: {JSON.stringify(tr)}</div>
            </div>
          );
        })}
      </div>
    );
  };

  if (compact) {
    // render a small overlay strip of thumbnails
    return (
      <div className="fixed right-4 bottom-4 z-50 flex gap-2 p-1">
        <div>
          <VideoTile id={myId || "self"} stream={cameraStream} isLocal small />
        </div>
        {peers.map((p) => (
          <div key={p}>
            <VideoTile id={p} stream={remoteStreams[p] ?? null} small />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="w-full h-full p-2 overflow-y-auto flex flex-col">
      <div className="mb-3">
        <VideoTile id={myId || "self"} stream={cameraStream} isLocal />
      </div>
      {peers.length === 0 && (
        <div className="text-center text-gray-400 p-4">No participants yet</div>
      )}
      {peers.map((p) => (
        <VideoTile key={p} id={p} stream={remoteStreams[p] ?? null} />
      ))}
    </div>
  );
};

export default ParticipantsGrid;
