import { Server } from "socket.io";
import http from "http";
import express from "express";

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: ["http://localhost:5173"],
  },
});


const userSocketMap = {};
export function getReceiverSocketId(userId) {
  return userSocketMap[userId];
}

io.on("connection", (socket) => {
  console.log("A user connected:", socket.id);

  const userId = socket.handshake.query.userId;
  if (userId) userSocketMap[userId] = socket.id;

  io.emit("getOnlineUsers", Object.keys(userSocketMap));

  socket.on("join-call", (roomId) => {
    socket.join(roomId);
    console.log(`User ${socket.id} joined call room ${roomId}`);

    socket.to(roomId).emit("user-joined", socket.id);
  });

  // handle offer/answer/candidates
  socket.on("webrtc-signal", ({ roomId, data }) => {
    socket.to(roomId).emit("webrtc-signal", {
      from: socket.id,
      data,
    });
  });

  // user leaves room
  socket.on("leave-call", (roomId) => {
    socket.leave(roomId);
    socket.to(roomId).emit("user-left", socket.id);
    console.log(`User ${socket.id} left call room ${roomId}`);
  });

  // disconnect
  socket.on("disconnect", () => {
    console.log("A user disconnected:", socket.id);
    delete userSocketMap[userId];
    io.emit("getOnlineUsers", Object.keys(userSocketMap));
  });
});

export { io, app, server };
