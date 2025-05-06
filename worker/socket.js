// socket.js
import { fetchDir, readFile, writeFile, createFile, deleteFile } from './files.js';
import terminal from './terminal.js';
import fs from 'fs';
import path from 'path';

// Helper to ensure consistent path formatting
const normalizePath = (dirPath) => {
  // Special case for root workspace folder
  if (dirPath === 'workspace' || dirPath === '/workspace' || dirPath === 'workspace/') {
    return '/workspace';
  }
  
  // For paths within workspace
  if (dirPath.includes('workspace/')) {
    return dirPath.startsWith('/') ? dirPath : `/${dirPath}`;
  }
  
  // For any other path, prefix with /workspace/
  return `/workspace/${dirPath.replace(/^\//, '')}`;
};

// Setup file watcher for package.json
function setupPackageJsonWatcher(socket) {
  const packageJsonPath = '/workspace/package.json';
  
  console.log(`Setting up watcher for ${packageJsonPath}`);
  
  try {
    // Ensure the file exists before watching
    if (fs.existsSync(packageJsonPath)) {
      // Set up file watcher
      const watcher = fs.watch(packageJsonPath, async (eventType) => {
        if (eventType === 'change') {
          console.log(`Detected change in package.json`);
          try {
            // Read the updated file content
            const content = await readFile(packageJsonPath);
            // Send the updated content to the runner for R2 storage
            socket.emit('packageJsonChanged', { content });
            console.log('Sent package.json update to runner');
          } catch (error) {
            console.error('Error reading updated package.json:', error);
          }
        }
      });
      
      // Clean up watcher when socket disconnects
      socket.on('disconnect', () => {
        watcher.close();
        console.log('Package.json watcher closed');
      });
      
      console.log('Package.json watcher setup complete');
    } else {
      console.log('package.json does not exist, watcher not set up');
    }
  } catch (error) {
    console.error('Error setting up package.json watcher:', error);
  }
}

export default function initSocket (io) {
  io.use((socket, next) => {
    const { userId, repl_id } = socket.handshake.query;
    if (userId && repl_id) {
      socket.userId = userId;
      socket.repl_id = repl_id;
      console.log('Worker socket authenticated:', socket.userId, socket.repl_id);
      return next();
    }
    socket.disconnect();
    return next(new Error('Authentication error in worker socket'));
  });

  io.on('connection', (socket) => {
    console.log('Worker socket connected:', socket.id);
    
    // Handle runnerLoaded event - sends file tree data to the client
    socket.on("runnerLoaded", async () => {
      console.log(`Worker: runnerLoaded received from socket ${socket.id}`);
      try {
        // Get root workspace contents
        const rootContent = await fetchDir("/workspace");
        console.log(`Worker: Fetched ${rootContent.length} items from workspace`);
        
        // Send data to the client
        socket.emit("loaded", {
          rootContent: rootContent,
        });
        console.log(`Worker: Sent loaded event to client ${socket.id}`);
        
        // Set up package.json watcher after initial load
        setupPackageJsonWatcher(socket);
      } catch (error) {
        console.error(`Worker: Error fetching workspace contents:`, error);
        // Send empty array to avoid breaking the client
        socket.emit("loaded", {
          rootContent: [],
        });
      }
    });

    // Terminal session management
    const sessionId = `${socket.userId}_${socket.repl_id}`;
    let ptyProcess = null;
    // Flag to track if data handler is already registered
    let dataHandlerRegistered = false;

    socket.on('terminal:start', (dimensions) => {
      console.log(`Starting terminal session for ${sessionId}`);
      try {
        // Get or create a terminal instance
        ptyProcess = terminal.getTerminal(sessionId, dimensions || { cols: 80, rows: 24 });
        
        // Only register the data handler if it hasn't been already
        if (!dataHandlerRegistered) {
          // Listen for output from the terminal and send it to the client
          ptyProcess.onData((data) => {
            socket.emit('terminal:output', data);
          });
          dataHandlerRegistered = true;
        }
      } catch (error) {
        console.error('Error starting terminal:', error);
        socket.emit('terminal:output', 'Error starting terminal: ' + error.message + '\r\n');
      }
    });

    socket.on('terminal:input', (data) => {
      try {
        if (!ptyProcess) {
          console.log(`Terminal session ${sessionId} not found, creating it`);
          ptyProcess = terminal.getTerminal(sessionId);
          
          // Only register the data handler if it hasn't been already
          if (!dataHandlerRegistered) {
            ptyProcess.onData((data) => {
              socket.emit('terminal:output', data);
            });
            dataHandlerRegistered = true;
          }
        }
        
        terminal.writeToTerminal(sessionId, data);
      } catch (error) {
        console.error('Error handling terminal input:', error);
        socket.emit('terminal:output', 'Error handling input: ' + error.message + '\r\n');
      }
    });

    socket.on('terminal:resize', (dimensions) => {
      try {
        terminal.resizeTerminal(sessionId, dimensions);
      } catch (error) {
        console.error('Error resizing terminal:', error);
      }
    });

    socket.on('terminal:stop', () => {
      // Don't actually kill the terminal here, just note that client disconnected
      console.log(`Terminal client disconnected: ${sessionId}`);
    });

    // Set up other handlers
    initHandlers(socket, socket.userId, socket.repl_id);
    
    // Handle socket disconnection
    socket.on('disconnect', () => {
      console.log('Client disconnected from worker:', socket.id);
      // Don't kill the terminal on disconnect to allow reconnection
    });
  });
  
  // Start cleanup interval for inactive terminals (15 min)
  terminal.startCleanupInterval();
};

function initHandlers(socket, userId, repl_id) {
  // Handler for fetchDir event from runner
  socket.on("fetchDir", async (dir, callback) => {
    try {
      const normalizedPath = normalizePath(dir);
      console.log(`Fetching directory: ${normalizedPath}`);
      const contents = await fetchDir(normalizedPath);
      callback(contents);
    } catch (error) {
      console.error(`Error in fetchDir for ${dir}:`, error);
      callback([]);
    }
  });

  socket.on("fetchContent", async (filePath, callback) => {
    try {
      const normalizedPath = normalizePath(filePath);
      console.log(`Fetching file content: ${normalizedPath}`);
      const data = await readFile(normalizedPath);
      callback(data);
    } catch (error) {
      console.error(`Error in fetchContent for ${filePath}:`, error);
      callback('');
    }
  });
  
  // Handler for writeFile event from runner
  socket.on("writeFile", async ({ filePath, content }, callback) => {
    try {
      const normalizedPath = normalizePath(filePath);
      console.log(`Writing file: ${normalizedPath}`);
      await writeFile(normalizedPath, content);
      callback({ success: true });
    } catch (error) {
      console.error(`Error writing file ${filePath}:`, error);
      callback({ success: false, error: error.message });
    }
  });
  
  socket.on("createFile", async (newPath, type, callback) => {
    try {
      const normalizedPath = normalizePath(newPath);
      const isFolder = type === 'folder';
      
      console.log(`Creating ${type}: ${normalizedPath}`);
      await createFile(normalizedPath, isFolder);
      
      if (callback) callback({ success: true });
    } catch (error) {
      console.error(`Error creating ${newPath}:`, error);
      if (callback) callback({ success: false, error: error.message });
    }
  });
  
  // Handler for deleteFile event from runner
  socket.on("deleteFile", async (targetPath, callback) => {
    try {
      const normalizedPath = normalizePath(targetPath);
      
      console.log(`Deleting: ${normalizedPath}`);
      await deleteFile(normalizedPath);
      
      if (callback) callback({ success: true });
    } catch (error) {
      console.error(`Error deleting ${targetPath}:`, error);
      if (callback) callback({ success: false, error: error.message });
    }
  });
}
  