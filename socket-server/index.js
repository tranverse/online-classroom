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

io.on("connection", (socket) => {
  console.log("socket connected", socket.id);

  socket.on("join", ({ room }) => {
    if (!room) return;
    socket.join(room);
    console.log(`socket ${socket.id} joined ${room}`);
  });

  socket.on("leave", ({ room }) => {
    if (!room) return;
    socket.leave(room);
    console.log(`socket ${socket.id} left ${room}`);
  });

  // whiteboard events
  socket.on("whiteboard:begin", (payload) => {
    console.log("server received whiteboard:begin", payload);
    const rooms = Array.from(socket.rooms).filter((r) => r !== socket.id);
    rooms.forEach((r) => socket.to(r).emit("whiteboard:begin", payload));
  });
  socket.on("whiteboard:draw", (payload) => {
    console.log("server received whiteboard:draw", payload);
    const rooms = Array.from(socket.rooms).filter((r) => r !== socket.id);
    rooms.forEach((r) => socket.to(r).emit("whiteboard:draw", payload));
  });
  socket.on("whiteboard:end", (payload) => {
    console.log("server received whiteboard:end", payload);
    const rooms = Array.from(socket.rooms).filter((r) => r !== socket.id);
    rooms.forEach((r) => socket.to(r).emit("whiteboard:end", payload));
  });

  // chat
  socket.on("chat:message", (payload) => {
    console.log("server received chat:message", payload);
    const rooms = Array.from(socket.rooms).filter((r) => r !== socket.id);
    rooms.forEach((r) => socket.to(r).emit("chat:message", payload));
  });

  socket.on("disconnect", (reason) => {
    console.log("socket disconnected", socket.id, reason);
  });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => console.log("socket server listening on", PORT));
