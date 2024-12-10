import express from "express";
import http from "http";
import cors from "cors";
import { Server } from "socket.io";

const app = express();
const server = http.createServer(app);

// Enable CORS for the frontend
app.use(cors());

// Initialize Socket.io with the server
const io = new Server(server, {
  cors: {
    origin: "http://localhost:5173",  // Your frontend URL
    methods: ["GET", "POST"],
  },
});

// Store online users by room and chat history by room
const onlineUsersByRoom = {};
const chatHistoryByRoom = {};

// Handle new connections
io.on("connection", (socket) => {
  console.log(`User Connected: ${socket.id}`);

  // Handle user joining a room
  socket.on("join_room", (data) => {
    const { room, username } = data;
    
    socket.join(room);

    // Ensure room-specific data exists
    if (!onlineUsersByRoom[room]) onlineUsersByRoom[room] = {};
    if (!chatHistoryByRoom[room]) chatHistoryByRoom[room] = [];

    // Add user to the room's online list
    onlineUsersByRoom[room][socket.id] = { username, status: "online" };

    // Emit the chat history and the updated user list to the new user
    socket.emit("chat_history", chatHistoryByRoom[room]);
    io.to(room).emit("update_users", Object.values(onlineUsersByRoom[room]));

    console.log(`User ${username} (ID: ${socket.id}) joined room: ${room}`);
  });

  // Handle user disconnecting
  socket.on("disconnect", () => {
    const room = Object.keys(socket.rooms).find((r) => r !== socket.id);

    if (room && onlineUsersByRoom[room] && onlineUsersByRoom[room][socket.id]) {
      // Set user status to offline
      onlineUsersByRoom[room][socket.id].status = "offline";
      
      // Emit the updated user list to the remaining users in the room
      io.to(room).emit("update_users", Object.values(onlineUsersByRoom[room]));

      console.log(`User (ID: ${socket.id}) disconnected from room: ${room}`);
    }
  });

  // Handle sending and receiving messages
  socket.on("send_message", (data) => {
    const { room } = data;
    
    // Emit the message to everyone in the room except the sender
    socket.to(room).emit("receive_message", data);

    // Save the message to the room's chat history
    chatHistoryByRoom[room].push(data);
  });
});

// Start the server
const PORT = 3004;
server.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
