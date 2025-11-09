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
        const sender = pc.addTrack(t, localStream as MediaStream);
        console.debug("webrtc: added track sender", { kind: t.kind, sender });
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
    // Some browsers may not populate `e.streams`; build a MediaStream from incoming tracks
    let remoteStream = e.streams && e.streams[0];
    try {
      if (!remoteStream) {
        // create or reuse a stream object attached to the pc instance
        (pc as any)["_remoteStream"] =
          (pc as any)["_remoteStream"] || new MediaStream();
        if (e.track)
          (pc as any)["_remoteStream"].addTrack(e.track as MediaStreamTrack);
        remoteStream = (pc as any)["_remoteStream"];
      }
    } catch (err) {
      console.warn("webrtc:ontrack build stream failed", err);
    }
    console.log(
      "webrtc:ontrack",
      (pc as any)["_remoteId"],
      remoteStream ? true : false
    );
    try {
      console.debug(
        "webrtc:ontrack pc senders",
        (pc as any)["_remoteId"],
        pc
          .getSenders()
          .map((s) => ({ kind: s.track?.kind, id: (s.track as any)?.id }))
      );
      console.debug(
        "webrtc:ontrack pc transceivers",
        (pc as any)["_remoteId"],
        pc
          .getTransceivers()
          .map((t) => ({
            kind: t.receiver.track?.kind,
            direction: t.direction,
          }))
      );
    } catch (e) {}
    if (remoteStream) {
      try {
        remoteHandler((pc as any)["_remoteId"], remoteStream as MediaStream);
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
      try {
        console.debug(
          "webrtc:pc senders on ice state change",
          (pc as any)["_remoteId"],
          pc
            .getSenders()
            .map((s) => ({ kind: s.track?.kind, id: (s.track as any)?.id }))
        );
        console.debug(
          "webrtc:pc transceivers on ice state change",
          (pc as any)["_remoteId"],
          pc
            .getTransceivers()
            .map((t) => ({
              mid: t.mid,
              direction: t.direction,
              senderKind: t.sender && t.sender.track?.kind,
              receiverKind: t.receiver && t.receiver.track?.kind,
            }))
        );
      } catch (e) {}
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
