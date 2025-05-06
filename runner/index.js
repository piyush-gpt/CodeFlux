// index.js
import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import initSocketFn from './socket.js';

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: ["http://localhost:5173", "http://localhost", "*"],
    methods: ["GET", "POST"],
    allowedHeaders: ["*"],
    credentials: true
  },
  path: '/runner/socket.io'
});

app.get('/', (req, res) => {
  res.send('Socket.IO Server is running!');
});

initSocketFn(io);

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`🚀 runner is running on http://localhost:${PORT}`);
});
