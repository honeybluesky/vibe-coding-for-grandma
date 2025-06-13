const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const { Client } = require('ssh2');
const { v4: uuidv4 } = require('uuid');
const cors = require('cors');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// Configuration with environment variable support
const config = {
  port: process.env.PORT || 2222,
  terminal: {
    cols: parseInt(process.env.TERMINAL_COLS) || 80,
    rows: parseInt(process.env.TERMINAL_ROWS) || 24,
    fontSize: parseInt(process.env.TERMINAL_FONT_SIZE) || 14,
    fontFamily: 'Monaco, Menlo, "Ubuntu Mono", monospace'
  },
  ssh: {
    readyTimeout: parseInt(process.env.SSH_READY_TIMEOUT) || 20000,
    keepaliveInterval: parseInt(process.env.SSH_KEEPALIVE_INTERVAL) || 30000,
    keepaliveCountMax: parseInt(process.env.SSH_KEEPALIVE_COUNT_MAX) || 3
  },
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    sshCommands: process.env.LOG_SSH_COMMANDS === 'true'
  }
};

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Store active SSH connections
const sshSessions = new Map();

// Helper function for logging
function log(level, message, data = null) {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] ${level.toUpperCase()}: ${message}`;
  
  if (config.logging.level === 'debug' || level === 'error' || level === 'info') {
    if (data) {
      console.log(logMessage, data);
    } else {
      console.log(logMessage);
    }
  }
}

// Socket.io connection handling
io.on('connection', (socket) => {
  log('info', `New client connected: ${socket.id}`);
  
  // Handle SSH connection request
  socket.on('ssh-connect', (connectionData) => {
    try {
      const { host, port = 22, username, password, privateKey } = connectionData;
      
      // Validation
      if (!host || !username) {
        socket.emit('ssh-error', 'Host and username are required');
        return;
      }
      
      if (!password && !privateKey) {
        socket.emit('ssh-error', 'Password or private key is required');
        return;
      }
      
      const sessionId = uuidv4();
      const sshClient = new Client();
      
      log('info', `Attempting SSH connection`, { sessionId, host, username, port });
      
      // SSH connection configuration
      const sshConfig = {
        host,
        port: parseInt(port),
        username,
        readyTimeout: config.ssh.readyTimeout,
        keepaliveInterval: config.ssh.keepaliveInterval,
        keepaliveCountMax: config.ssh.keepaliveCountMax
      };
      
      if (password) {
        sshConfig.password = password;
      } else if (privateKey) {
        sshConfig.privateKey = privateKey;
      }
      
      // SSH client event handlers
      sshClient.on('ready', () => {
        log('info', `SSH connection ready`, { sessionId, host, username });
        socket.emit('ssh-ready', { sessionId });
        
        // Start shell session
        sshClient.shell({
          cols: config.terminal.cols,
          rows: config.terminal.rows,
          term: 'xterm-256color'
        }, (err, stream) => {
          if (err) {
            log('error', 'Shell creation error', { sessionId, error: err.message });
            socket.emit('ssh-error', 'Failed to create shell');
            return;
          }
          
          // Store session info
          sshSessions.set(socket.id, {
            sessionId,
            client: sshClient,
            stream,
            host,
            username,
            connected: Date.now()
          });
          
          log('info', `Shell session started`, { sessionId, host, username });
          
          // Handle shell data
          stream.on('data', (data) => {
            const output = data.toString();
            socket.emit('ssh-data', output);
            
            if (config.logging.sshCommands) {
              log('debug', `SSH output`, { sessionId, output: output.trim() });
            }
          });
          
          stream.on('close', () => {
            log('info', `Shell closed`, { sessionId });
            socket.emit('ssh-close');
            sshSessions.delete(socket.id);
          });
          
          stream.stderr.on('data', (data) => {
            const errorOutput = data.toString();
            socket.emit('ssh-data', errorOutput);
            log('debug', `SSH stderr`, { sessionId, error: errorOutput.trim() });
          });
        });
      });
      
      sshClient.on('error', (err) => {
        log('error', 'SSH connection error', { sessionId, host, username, error: err.message });
        socket.emit('ssh-error', `Connection failed: ${err.message}`);
        sshSessions.delete(socket.id);
      });
      
      sshClient.on('close', () => {
        log('info', `SSH connection closed`, { sessionId, host, username });
        socket.emit('ssh-close');
        sshSessions.delete(socket.id);
      });
      
      // Attempt connection
      sshClient.connect(sshConfig);
      
    } catch (error) {
      log('error', 'SSH connect error', { error: error.message });
      socket.emit('ssh-error', `Connection error: ${error.message}`);
    }
  });
  
  // Handle terminal input
  socket.on('ssh-input', (data) => {
    const session = sshSessions.get(socket.id);
    if (session && session.stream) {
      session.stream.write(data);
      
      if (config.logging.sshCommands && data.trim()) {
        log('debug', `SSH input`, { sessionId: session.sessionId, input: data.trim() });
      }
    } else {
      log('debug', `SSH input received but no active session`, { socketId: socket.id });
    }
  });
  
  // Handle terminal resize
  socket.on('ssh-resize', (dimensions) => {
    const session = sshSessions.get(socket.id);
    if (session && session.stream) {
      const { rows, cols } = dimensions;
      if (rows && cols) {
        session.stream.setWindow(rows, cols);
        log('debug', `Terminal resized`, { sessionId: session.sessionId, rows, cols });
      }
    }
  });
  
  // Handle disconnect
  socket.on('disconnect', () => {
    log('info', `Client disconnected: ${socket.id}`);
    const session = sshSessions.get(socket.id);
    if (session) {
      if (session.stream) {
        session.stream.end();
      }
      if (session.client) {
        session.client.end();
      }
      sshSessions.delete(socket.id);
      log('info', `Session cleaned up`, { sessionId: session.sessionId });
    }
  });
});

// Health check endpoint
app.get('/health', (req, res) => {
  const sessions = Array.from(sshSessions.values()).map(session => ({
    sessionId: session.sessionId,
    host: session.host,
    username: session.username,
    connected: session.connected,
    uptime: Date.now() - session.connected
  }));
  
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    activeSessions: sshSessions.size,
    sessions: sessions,
    config: {
      port: config.port,
      terminal: config.terminal,
      ssh: {
        readyTimeout: config.ssh.readyTimeout,
        keepaliveInterval: config.ssh.keepaliveInterval,
        keepaliveCountMax: config.ssh.keepaliveCountMax
      }
    }
  });
});

// Sessions endpoint
app.get('/sessions', (req, res) => {
  const sessions = Array.from(sshSessions.values()).map(session => ({
    sessionId: session.sessionId,
    host: session.host,
    username: session.username,
    connected: session.connected,
    uptime: Date.now() - session.connected
  }));
  
  res.json({ sessions });
});

// Start server
server.listen(config.port, () => {
  log('info', `WebSSH server running on port ${config.port}`);
  log('info', `Health check available at http://localhost:${config.port}/health`);
  log('info', `Configuration:`, config);
});

// Graceful shutdown
function gracefulShutdown(signal) {
  log('info', `Received ${signal}. Shutting down gracefully...`);
  
  // Close all SSH sessions
  sshSessions.forEach((session, socketId) => {
    log('info', `Closing session`, { sessionId: session.sessionId });
    if (session.stream) {
      session.stream.end();
    }
    if (session.client) {
      session.client.end();
    }
  });
  
  server.close(() => {
    log('info', 'Server closed');
    process.exit(0);
  });
  
  // Force exit after 10 seconds
  setTimeout(() => {
    log('error', 'Force exit after timeout');
    process.exit(1);
  }, 10000);
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT')); 