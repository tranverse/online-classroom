const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");

const app = express();
app.use(cors());

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: true,
    methods: ["GET", "POST"],
  },
});

// In-memory map to track room members reliably during this dev server run
// Key: roomId -> Value: Set of socket ids
const roomMembers = new Map();

io.on("connection", (socket) => {
  console.log("socket connected", socket.id);

  socket.on("join", ({ room, userId, userName }) => {
    if (!room) return;

    socket.join(room);
    socket.data.userId = userId;
    socket.data.userName = userName;

    console.log(`✅ User joined room:`, {
      socketId: socket.id,
      userId,
      userName,
      room,
    });

    if (!roomMembers.has(room)) roomMembers.set(room, new Set());
    roomMembers.get(room).add(socket.id);

    // Gửi thông báo cho những người khác
    socket.to(room).emit("participant:joined", {
      socketId: socket.id,
      userId,
      userName,
    });

    // Lấy danh sách participants hiện có
    (async () => {
      try {
        const sockets = await io.in(room).fetchSockets();
        const participants = sockets.map((s) => ({
          socketId: s.id,
          userId: s.data.userId,
          userName: s.data.userName,
        }));

        console.log("👥 participants in room", room, participants);
        // send targeted copy to the joiner to guarantee delivery
        io.to(socket.id).emit("participants:list", participants);
        console.log("sent participants:list to joiner", socket.id);
        // broadcast to others in the room (exclude joiner) with filtered list
        const others = participants.filter((p) => p.socketId !== socket.id);
        socket.to(room).emit("participants:list", others);
        console.log(
          "broadcasted participants:list to room (excluding joiner)",
          room,
          others
        );
      } catch (err) {
        console.error("fetchSockets failed", err);
      }
    })();
  });

  socket.on("leave", ({ room }) => {
    if (!room) return;
    socket.leave(room);
    console.log(`socket ${socket.id} left ${room}`);
    socket.to(room).emit("participant:left", { id: socket.id });
    if (roomMembers.has(room)) {
      roomMembers.get(room).delete(socket.id);
      const list = Array.from(roomMembers.get(room));
      io.in(room).emit(
        "participants:list",
        list.map((id) => ({ id }))
      );
      if (roomMembers.get(room).size === 0) roomMembers.delete(room);
    }
  });

  // whiteboard events
  socket.on("whiteboard:begin", (payload) => {
    console.log("server received whiteboard:begin", payload);
    const rooms = Array.from(socket.rooms).filter((r) => r !== socket.id);
    rooms.forEach((r) =>
      socket.to(r).emit("whiteboard:begin", { ...payload, from: socket.id })
    );
  });
  socket.on("whiteboard:draw", (payload) => {
    console.log("server received whiteboard:draw", payload);
    const rooms = Array.from(socket.rooms).filter((r) => r !== socket.id);
    rooms.forEach((r) =>
      socket.to(r).emit("whiteboard:draw", { ...payload, from: socket.id })
    );
  });
  socket.on("whiteboard:end", (payload) => {
    console.log("server received whiteboard:end", payload);
    const rooms = Array.from(socket.rooms).filter((r) => r !== socket.id);
    rooms.forEach((r) =>
      socket.to(r).emit("whiteboard:end", { ...payload, from: socket.id })
    );
  });
  // text and rectangle events
  socket.on("whiteboard:text", (payload) => {
    console.log("server received whiteboard:text", payload);
    const rooms = Array.from(socket.rooms).filter((r) => r !== socket.id);
    rooms.forEach((r) =>
      socket.to(r).emit("whiteboard:text", { ...payload, from: socket.id })
    );
    // acknowledge to sender for debugging/confirmation
    try {
      io.to(socket.id).emit("whiteboard:ack", {
        event: "text",
        from: socket.id,
        payload,
      });
    } catch (e) {}
  });
  socket.on("whiteboard:rect", (payload) => {
    console.log("server received whiteboard:rect", payload);
    const rooms = Array.from(socket.rooms).filter((r) => r !== socket.id);
    rooms.forEach((r) =>
      socket.to(r).emit("whiteboard:rect", { ...payload, from: socket.id })
    );
    // acknowledge to sender for debugging/confirmation
    try {
      io.to(socket.id).emit("whiteboard:ack", {
        event: "rect",
        from: socket.id,
        payload,
      });
    } catch (e) {}
  });

  // clear canvas event
  socket.on("whiteboard:clear", (payload) => {
    console.log("server received whiteboard:clear", payload);
    const rooms = Array.from(socket.rooms).filter((r) => r !== socket.id);
    rooms.forEach((r) =>
      socket.to(r).emit("whiteboard:clear", { ...payload, from: socket.id })
    );
    try {
      io.to(socket.id).emit("whiteboard:ack", {
        event: "clear",
        from: socket.id,
        payload,
      });
    } catch (e) {}
  });

  // add board event (teacher creates a new board)
  socket.on("whiteboard:addBoard", (payload) => {
    console.log("server received whiteboard:addBoard", payload);
    const rooms = Array.from(socket.rooms).filter((r) => r !== socket.id);
    rooms.forEach((r) =>
      socket.to(r).emit("whiteboard:addBoard", { ...payload, from: socket.id })
    );
    try {
      io.to(socket.id).emit("whiteboard:ack", {
        event: "addBoard",
        from: socket.id,
        payload,
      });
    } catch (e) {}
  });

  // temporary raw debug hook - clients can emit raw debug events to verify reachability
  socket.on("whiteboard:raw", (dbg) => {
    try {
      console.log("server received whiteboard:raw", dbg);
      io.to(socket.id).emit("whiteboard:ack", {
        event: "raw",
        from: socket.id,
        payload: dbg,
      });
    } catch (e) {
      console.warn("whiteboard:raw handler failed", e);
    }
  });

  // chat
  socket.on("chat:message", (payload) => {
    console.log("server received chat:message", payload);
    const rooms = Array.from(socket.rooms).filter((r) => r !== socket.id);
    rooms.forEach((r) => socket.to(r).emit("chat:message", payload));
  });

  // WebRTC signalling relay
  socket.on("webrtc:announce", (payload) => {
    // payload: { hasStream: true }
    const rooms = Array.from(socket.rooms).filter((r) => r !== socket.id);
    rooms.forEach((r) =>
      socket.to(r).emit("webrtc:announce", { id: socket.id, ...payload })
    );
  });

  socket.on("webrtc:offer", ({ to, sdp }) => {
    console.log("webrtc:offer from", socket.id, "to", to);
    io.to(to).emit("webrtc:offer", { from: socket.id, sdp });
  });

  socket.on("webrtc:answer", ({ to, sdp }) => {
    console.log("webrtc:answer from", socket.id, "to", to);
    io.to(to).emit("webrtc:answer", { from: socket.id, sdp });
  });

  socket.on("webrtc:ice", ({ to, candidate }) => {
    io.to(to).emit("webrtc:ice", { from: socket.id, candidate });
  });

  socket.on("participants:get", async ({ room }) => {
    try {
      const sockets = await io.in(room).fetchSockets();
      const participants = sockets.map((s) => ({
        socketId: s.id,
        userId: s.data.userId,
        userName: s.data.userName,
      }));
      socket.emit("participants:list", participants);
      console.log(
        `📋 participants:get for ${room} (reply to ${socket.id})`,
        participants
      );
    } catch (e) {
      console.warn("participants:get failed", e);
      socket.emit("participants:list", []);
    }
  });

  // Screen share request/approval/announce relays
  socket.on("screen:request", (payload) => {
    try {
      console.log("server received screen:request", payload);
      const rooms = Array.from(socket.rooms).filter((r) => r !== socket.id);
      rooms.forEach((r) =>
        socket.to(r).emit("screen:request", { ...payload, from: socket.id })
      );
    } catch (e) {
      console.warn("screen:request relay failed", e);
    }
  });

  socket.on("screen:request:approved", (payload) => {
    try {
      console.log("server received screen:request:approved", payload);
      const to = payload?.to;
      if (to)
        io.to(to).emit("screen:request:approved", {
          ...payload,
          from: socket.id,
        });
    } catch (e) {
      console.warn("screen:request:approved relay failed", e);
    }
  });

  socket.on("screen:share:announce", (payload) => {
    try {
      console.log("server received screen:share:announce", payload);
      const rooms = Array.from(socket.rooms).filter((r) => r !== socket.id);
      rooms.forEach((r) =>
        socket
          .to(r)
          .emit("screen:share:announce", { ...payload, from: socket.id })
      );
    } catch (e) {
      console.warn("screen:share:announce relay failed", e);
    }
  });

  socket.on("screen:share:stop", (payload) => {
    try {
      console.log("server received screen:share:stop", payload);
      const rooms = Array.from(socket.rooms).filter((r) => r !== socket.id);
      rooms.forEach((r) =>
        socket.to(r).emit("screen:share:stop", { ...payload, from: socket.id })
      );
    } catch (e) {
      console.warn("screen:share:stop relay failed", e);
    }
  });

  // Teacher ends the session for everyone
  socket.on("session:end", (payload) => {
    try {
      console.log("server received session:end", payload);
      const rooms = Array.from(socket.rooms).filter((r) => r !== socket.id);
      rooms.forEach((r) =>
        socket.to(r).emit("session:end", { ...payload, from: socket.id })
      );
    } catch (e) {
      console.warn("session:end relay failed", e);
    }
  });

  // Viewer -> server -> sharer ACK when viewer receives shared stream
  socket.on("screen:stream:received", (payload) => {
    try {
      const to = payload?.to;
      console.log("server received screen:stream:received", {
        from: socket.id,
        to,
      });
      if (to) {
        io.to(to).emit("screen:stream:received", { from: socket.id });
      }
    } catch (e) {
      console.warn("screen:stream:received relay failed", e);
    }
  });

  // Admin requests: teacher can request a student's camera to be turned on/off
  socket.on("admin:request-camera", ({ to, action }) => {
    try {
      console.log("admin:request-camera", { from: socket.id, to, action });
      if (to) {
        io.to(to).emit("admin:request-camera", { from: socket.id, action });
      }
    } catch (e) {
      console.warn("admin:request-camera failed", e);
    }
  });

  // Relay when a client cannot comply with admin request (e.g., permission denied)
  socket.on("admin:request-failed", ({ to, reason }) => {
    try {
      console.log("admin:request-failed", { from: socket.id, to, reason });
      if (to)
        io.to(to).emit("admin:request-failed", { from: socket.id, reason });
    } catch (e) {
      console.warn("admin:request-failed relay failed", e);
    }
  });

  socket.on("disconnect", (reason) => {
    console.log("socket disconnected", socket.id, reason);
    // remove from any room membership sets and notify peers
    for (const [room, sset] of roomMembers.entries()) {
      if (sset.has(socket.id)) {
        sset.delete(socket.id);
        io.in(room).emit("participant:left", { id: socket.id });
        const list = Array.from(sset);
        io.in(room).emit(
          "participants:list",
          list.map((id) => ({ id }))
        );
      }
      if (sset.size === 0) roomMembers.delete(room);
    }
  });
});

const PORT = process.env.PORT || 3001;

// Debug HTTP endpoints - only for local/dev troubleshooting
app.get("/__debug/rooms", async (req, res) => {
  try {
    const out = {};
    for (const [room, sset] of roomMembers.entries()) {
      out[room] = Array.from(sset);
    }
    res.json({ rooms: out });
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

app.get("/__debug/room/:roomId", async (req, res) => {
  try {
    const room = req.params.roomId;
    const sockets = await io.in(room).fetchSockets();
    const participants = sockets.map((s) => ({
      socketId: s.id,
      userId: s.data.userId,
      userName: s.data.userName,
    }));
    res.json({ room, participants });
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

server.listen(PORT, () => console.log("socket server listening on", PORT));