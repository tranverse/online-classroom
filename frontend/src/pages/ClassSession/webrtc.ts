import { Socket } from "socket.io-client";

export type PeerMap = Record<string, RTCPeerConnection>;

export function createPeerConnection(
  socket: Socket,
  localStream: MediaStream | null | undefined,
  remoteHandler: (id: string, stream: MediaStream) => void
) {
  const pc = new RTCPeerConnection({
    iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
  });

  // add local tracks
  if (localStream) {
    const tracks = localStream.getTracks();
    console.log(
      "webrtc: adding local tracks",
      tracks.map((t) => t.kind)
    );
    tracks.forEach((t) => {
      try {
        pc.addTrack(t, localStream as MediaStream);
      } catch (e) {
        console.warn("webrtc: addTrack failed", e);
      }
    });
  }

  pc.onicecandidate = (e) => {
    if (e.candidate) {
      console.log(
        "webrtc:onicecandidate -> emit",
        (pc as any)["_remoteId"],
        e.candidate
      );
      (socket as any).emit("webrtc:ice", {
        to: (pc as any)["_remoteId"],
        candidate: e.candidate,
      });
    }
  };

  pc.ontrack = (e) => {
    const remoteStream = e.streams && e.streams[0];
    console.log("webrtc:ontrack", (pc as any)["_remoteId"], e.streams);
    if (remoteStream) {
      try {
        remoteHandler((pc as any)["_remoteId"], remoteStream);
      } catch (err) {
        console.warn("webrtc:remoteHandler failed", err);
      }
    }
  };

  pc.oniceconnectionstatechange = () => {
    try {
      console.log(
        "webrtc:iceConnectionState",
        (pc as any)["_remoteId"],
        pc.iceConnectionState
      );
    } catch (e) {}
  };

  pc.onconnectionstatechange = () => {
    try {
      console.log(
        "webrtc:connectionState",
        (pc as any)["_remoteId"],
        pc.connectionState
      );
    } catch (e) {}
  };

  pc.onnegotiationneeded = () => {
    try {
      console.log("webrtc:onnegotiationneeded", (pc as any)["_remoteId"]);
    } catch (e) {}
  };

  return pc;
}
