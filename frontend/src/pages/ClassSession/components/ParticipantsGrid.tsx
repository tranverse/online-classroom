import React, { useContext, useEffect, useRef, useState } from "react";
import { SocketContext } from "../index";
import { createPeerConnection } from "../webrtc";
import { FiCamera, FiCameraOff, FiMic, FiMicOff } from "react-icons/fi";

const ParticipantsGrid: React.FC = () => {
  const socket = useContext(SocketContext as any) as any;
  const [peers, setPeers] = useState<string[]>([]);
  const pcs = useRef<Record<string, RTCPeerConnection>>({});
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStreams, setRemoteStreams] = useState<
    Record<string, MediaStream>
  >({});
  const [names, setNames] = useState<Record<string, string>>({});

  const storedUser = React.useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem("user") || "{}") || {};
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
    setRemoteStreams((s) => ({ ...s, [id]: stream }));
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

    const renegotiateAll = async () => {
      const ids = Object.keys(pcs.current);
      for (const id of ids) {
        const pc = pcs.current[id];
        if (!pc) continue;

        try {
          // update existing senders via replaceTrack when possible
          const senders = pc.getSenders();
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
          }

          // create offer to renegotiate only if this side is the initiator
          // use lexicographic socket id ordering so exactly one side initiates
          if (myId && myId < id) {
            const offer = await pc.createOffer();
            await pc.setLocalDescription(offer);
            socket.emit("webrtc:offer", { to: id, sdp: pc.localDescription });
          } else {
            console.log("skipping renegotiate offer for", id, "not initiator");
          }
        } catch (e) {
          console.warn("renegotiate failed for", id, e);
        }
      }
    };

    renegotiateAll();
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
        if (stream) setLocalStream(stream);
      } catch (e) {}
    };

    const stopLocalShare = async () => {
      try {
        if (localStream) {
          localStream.getTracks().forEach((t) => t.stop());
        }
        const s = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true,
        });
        setLocalStream(s);
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
      }
      try {
        console.log("webrtc:offer - setRemoteDescription from", from);
        await pc.setRemoteDescription(new RTCSessionDescription(sdp));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
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
        await pc.setRemoteDescription(new RTCSessionDescription(sdp));
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
  }: {
    id: string;
    stream: MediaStream | null;
    isLocal?: boolean;
  }) => {
    const [tileStream, setTileStream] = useState<MediaStream | null>(stream);
    useEffect(() => {
      setTileStream(stream);
    }, [stream]);

    const [isCamOn, setIsCamOn] = useState(!!stream);
    const [isMicOn, setIsMicOn] = useState(true);

    const toggleCam = async () => {
      if (!isLocal) return;
      if (localStream) {
        localStream.getTracks().forEach((t) => t.stop());
        setLocalStream(null);
        setIsCamOn(false);
      } else {
        try {
          const s = await navigator.mediaDevices.getUserMedia({
            video: true,
            audio: true,
          });
          setLocalStream(s);
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

    return (
      <div className="bg-gray-900 rounded-lg overflow-hidden flex flex-col shadow mb-4 w-full relative">
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
        <div className="bg-black w-full aspect-video relative">
          <video
            autoPlay
            playsInline
            muted={true} // mute to allow autoplay without user gesture
            className="w-full h-full object-cover absolute top-0 left-0 rounded-b-lg"
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

  return (
    <div className="w-full h-full p-2 overflow-y-auto flex flex-col">
      <div className="mb-3">
        <VideoTile id={myId || "self"} stream={localStream} isLocal />
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
