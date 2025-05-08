// socket.js
import { saveToS3, createFileInS3, deleteFromS3 } from './s3.js';
import { io as clientIo } from 'socket.io-client';
import axios from 'axios';
export default function initSocket(io) {

  io.use((socket, next) => {
    const { ownerId,userId, repl_id, username } = socket.handshake.query;
    if (userId && repl_id) {
      socket.userId = userId;
      socket.repl_id = repl_id;
      socket.ownerId = ownerId;
      socket.username=username
      return next();
    }
    return next(new Error('Authentication error in runner socket'));
  });

  io.on('connection', (socket) => {
    console.log(`🟢 New client connected: ${socket.id}, User: ${socket.userId}, Repl: ${socket.repl_id}`);

    const room = `repl:${socket.repl_id}-${socket.ownerId}`;
    socket.join(room);
    console.log(`User ${socket.userId} joined room ${room}`);

    // Increment active users when a user connects
    axios.post('http://host.docker.internal:4001/api/increment-active-users', { replId: socket.repl_id, userId: socket.ownerId })
      .then(() => console.log(`Active users incremented for REPL: ${socket.repl_id}`))
      .catch((error) => console.error('Error incrementing active users:', error));

    // Store workerSocket reference in socket object to avoid creating multiple connections
    socket.workerSocket = clientIo("http://localhost:3002", {
      query: {
        repl_id: socket.repl_id,
        userId: socket.userId,
      },
      forceNew: true,   
    });

    // Set up the worker socket event listeners
    socket.workerSocket.emit("runnerLoaded");
    socket.workerSocket.on("loaded", (data) => {
      console.log("Received loaded data from worker, forwarding to client");
      socket.emit("loaded", data);
    });

    // Terminal event forwarding
    socket.workerSocket.on("terminal:output", (data) => {
      socket.emit("terminal:output", data);
    });

    // Handle package.json auto-sync from worker
    socket.workerSocket.on("packageJsonChanged", async ({ content }) => {
      console.log("Received package.json update from worker, saving to R2");
      try {
        const filePath = "package.json";
        // Save the updated package.json to R2
        const result = await saveToS3(socket.ownerId, socket.repl_id, filePath, content);
        if (result.success) {
          console.log("Successfully saved package.json to R2");
        } else {
          console.error("Failed to save package.json to R2:", result.error);
        }
      } catch (error) {
        console.error("Error saving package.json to R2:", error);
      }
    });

    socket.workerSocket.on("saveFile", async ({ filePath, content }) => {
      try {

        console.log("Received file save request from worker, saving to R2");
  
        // Save the updated package.json to R2
        const result = await saveToS3(socket.ownerId, socket.repl_id, filePath, content);
        if (result.success) {
          console.log("Successfully saved package.json to R2");
        } else {
          console.error("Failed to save package.json to R2:", result.error);
        }
      } catch (error) {
        console.error("Error saving package.json to R2:", error);
      }
    });
    
    
    // Handle client disconnection
    socket.on('disconnect', () => {
      console.log(`🔴 Client disconnected: ${socket.id}, User: ${socket.userId}, Repl: ${socket.repl_id}`);
      
      axios.post('http://host.docker.internal:4001/api/decrement-active-users', { replId: socket.repl_id , userId:socket.ownerId})
      .then(() => console.log(`Active users decremented for REPL: ${socket.repl_id}`))
      .catch((error) => console.error('Error decrementing active users:', error));

      // Clean up worker socket if it exists
      if (socket.workerSocket) {
        socket.workerSocket.disconnect();
        console.log(`🔴 Worker socket disconnected for client: ${socket.id}`);
      }
      socket.leave(room);
    });

    // Initialize socket handlers
    initHandlers(socket, socket.repl_id, socket.ownerId, socket.workerSocket,room);
  });
}

function initHandlers(socket, replId,ownerId, workerSocket,room) {

  // Broadcast file changes to other users in the room
  socket.on('file:edit', ({ filePath, content }) => {
    socket.to(room).emit('file:edit', { filePath, content, userId: socket.userId });
  });

  // Broadcast cursor movements to other users in the room
  socket.on('cursor:move', ({ filePath, position }) => {
    socket.to(room).emit('cursor:move', { filePath, position, username: socket.username });
  });

  // Handle runnerLoaded event from client
  socket.on("runnerLoaded", () => {
    console.log(`Client ${socket.id} requested file tree data`);
    workerSocket.emit("runnerLoaded");
  });

  // Terminal event handlers - forward events between client and worker
  socket.on("terminal:start", (dimensions) => {
    console.log(`Terminal start request from client ${socket.id}`);
    workerSocket.emit("terminal:start", dimensions);
  });

  socket.on("terminal:input", (data) => {
    workerSocket.emit("terminal:input", data);
  });

  socket.on("terminal:resize", (dimensions) => {
    workerSocket.emit("terminal:resize", dimensions);
  });

  socket.on("terminal:stop", () => {
    console.log(`Terminal stop request from client ${socket.id}`);
    workerSocket.emit("terminal:stop");
  });

  socket.on("fetchDir", async (dir, callback) => {
    workerSocket.emit("fetchDir", dir, (data) => {
      callback(data);
    });
  });

  socket.on("fetchContent", async (filePath, callback) => {
    workerSocket.emit("fetchContent", filePath, (data) => {
      callback(data);
    });
  }
  );

  socket.on("saveFile", async ({ filePath, content }, callback) => {
    try {
      // First, save to S3
      const s3Result = await saveToS3(ownerId, replId, filePath, content);


      workerSocket.emit("writeFile", { filePath, content }, (result) => {

        if (result.success && s3Result.success) {

          callback({ success: true });
        } else {
          callback({
            success: false,
            error: s3Result.success ? result.error : s3Result.error
          });
        }
      });
    }
    catch (error) {
      console.error(`Error saving file ${filePath}:`, error);
      callback({ success: false, error: error.message });
    }
  });

  socket.on("createFile", async (newPath, type, callback) => {
    try {

      const s3Result = await createFileInS3(ownerId, replId, newPath, type);


      workerSocket.emit("createFile", newPath, type, (result) => {

        if (s3Result.success && (result?.success !== false)) {
          if (callback) callback({ success: true });
        } else {
          if (callback) callback({
            success: false,
            error: s3Result.success ? result?.error : s3Result.error
          });
        }
      });
    } catch (error) {
      console.error(`Error creating ${newPath}:`, error);
      if (callback) callback({ success: false, error: error.message });
    }
  });

  socket.on("deleteFile", async (targetPath, callback) => {
    try {
      // First, delete from S3
      const s3Result = await deleteFromS3(ownerId, replId, targetPath);

      // Then delete from the worker container
      workerSocket.emit("deleteFile", targetPath, (result) => {
        // Handle the worker's response
        if (s3Result.success && (result?.success !== false)) {
          if (callback) callback({ success: true });
        } else {
          if (callback) callback({
            success: false,
            error: s3Result.success ? result?.error : s3Result.error
          });
        }
      });
    } catch (error) {
      console.error(`Error deleting ${targetPath}:`, error);
      if (callback) callback({ success: false, error: error.message });
    }
  });
}  