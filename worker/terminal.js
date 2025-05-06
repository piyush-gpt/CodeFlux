import os from 'os';
import pty from 'node-pty';

// Terminal sessions storage
const terminals = {};

// Create a new terminal session
const createTerminal = (sessionId, dimensions = { cols: 80, rows: 24 }) => {
  // Determine shell based on the platform
  const shell = os.platform() === 'win32' ? 'powershell.exe' : 'bash';
  
  // Shell arguments
  const shellArgs = os.platform() === 'win32' ? [] : ['-c', 'cd /workspace && exec bash'];
  
  console.log(`Creating terminal session ${sessionId} with ${shell}`);
  
  // Initialize the PTY process
  const ptyProcess = pty.spawn(shell, shellArgs, {
    name: 'xterm-color',
    cols: dimensions.cols,
    rows: dimensions.rows,
    cwd: '/workspace', // Start in the workspace directory
    env: process.env
  });
  
  // Store the terminal session
  terminals[sessionId] = {
    pty: ptyProcess,
    lastActivity: Date.now()
  };
  
  return ptyProcess;
};

// Get existing terminal or create new one
const getTerminal = (sessionId, dimensions) => {
  if (terminals[sessionId]) {
    terminals[sessionId].lastActivity = Date.now();
    return terminals[sessionId].pty;
  }
  
  return createTerminal(sessionId, dimensions);
};

// Resize terminal
const resizeTerminal = (sessionId, dimensions) => {
  if (terminals[sessionId] && terminals[sessionId].pty) {
    try {
      terminals[sessionId].lastActivity = Date.now();
      terminals[sessionId].pty.resize(dimensions.cols, dimensions.rows);
      return true;
    } catch (err) {
      console.error(`Error resizing terminal ${sessionId}:`, err);
      return false;
    }
  }
  return false;
};

// Write data to terminal
const writeToTerminal = (sessionId, data) => {
  if (terminals[sessionId] && terminals[sessionId].pty) {
    try {
      terminals[sessionId].lastActivity = Date.now();
      terminals[sessionId].pty.write(data);
      return true;
    } catch (err) {
      console.error(`Error writing to terminal ${sessionId}:`, err);
      return false;
    }
  }
  return false;
};

// Kill and remove a terminal session
const killTerminal = (sessionId) => {
  if (terminals[sessionId]) {
    try {
      terminals[sessionId].pty.kill();
      delete terminals[sessionId];
      console.log(`Terminal session ${sessionId} killed`);
      return true;
    } catch (err) {
      console.error(`Error killing terminal ${sessionId}:`, err);
      return false;
    }
  }
  return false;
};

// Clean up inactive terminals (optional, for handling abandoned sessions)
const cleanupInactiveTerminals = (maxInactivityMs = 30 * 60 * 1000) => { // 30 minutes default
  const now = Date.now();
  let count = 0;
  
  Object.keys(terminals).forEach(sessionId => {
    const terminal = terminals[sessionId];
    if (now - terminal.lastActivity > maxInactivityMs) {
      if (killTerminal(sessionId)) {
        count++;
      }
    }
  });
  
  if (count > 0) {
    console.log(`Cleaned up ${count} inactive terminal sessions`);
  }
  
  return count;
};

// Start periodic cleanup (optional)
const startCleanupInterval = (intervalMs = 15 * 60 * 1000) => { // 15 minutes default
  const intervalId = setInterval(() => {
    cleanupInactiveTerminals();
  }, intervalMs);
  
  return intervalId;
};

export default {
  createTerminal,
  getTerminal,
  resizeTerminal,
  writeToTerminal,
  killTerminal,
  cleanupInactiveTerminals,
  startCleanupInterval
}; 