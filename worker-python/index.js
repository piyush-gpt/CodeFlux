// index.js
import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import initSocket from './socket.js';

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*', // Allow frontend to connect
    methods: ['GET', 'POST']
  }
});

app.get('/', (req, res) => {
  res.send('Worker Socket.IO Server is running!');
});


initSocket(io);

const PORT = process.env.PORT || 3002;
server.listen(PORT, () => {
  console.log(`🚀 worker is running on http://localhost:${PORT}`);
});
