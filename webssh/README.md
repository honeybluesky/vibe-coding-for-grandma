# WebSSH Server

A bare minimum SSH2 server implementation that provides WebSocket-based SSH connections for xterm.js integration.

## Features

- WebSocket-based SSH connections using Socket.IO
- Support for password and private key authentication
- Terminal resizing support
- Session management and cleanup
- Health check endpoint
- Graceful shutdown handling

## Installation

```bash
cd webssh
npm install
```

## Usage

### Start the server

```bash
npm start
```

Or for development with auto-restart:

```bash
npm run dev
```

The server will start on port 2222 by default.

## Client Integration

Your client needs to connect to the WebSocket server and use these events:

### Client Events (emit to server)

- `ssh-connect` - Initiate SSH connection
- `ssh-input` - Send terminal input
- `ssh-resize` - Resize terminal
- `disconnect` - Close connection

### Server Events (listen from server)

- `ssh-ready` - SSH connection established
- `ssh-data` - Terminal output data
- `ssh-error` - Connection or command errors
- `ssh-close` - SSH session closed

## Connection Example

```javascript
const socket = io('http://localhost:2222');

// Connect to SSH server
socket.emit('ssh-connect', {
  host: '192.168.1.100',
  port: 22,
  username: 'user',
  password: 'password'
  // OR use privateKey: 'your-private-key-content'
});

// Handle server responses
socket.on('ssh-ready', (data) => {
  console.log('SSH connected:', data.sessionId);
});

socket.on('ssh-data', (data) => {
  // Send data to xterm.js terminal
  terminal.write(data);
});

socket.on('ssh-error', (error) => {
  console.error('SSH error:', error);
});

// Send terminal input
terminal.onData((data) => {
  socket.emit('ssh-input', data);
});

// Handle terminal resize
terminal.onResize((dimensions) => {
  socket.emit('ssh-resize', {
    cols: dimensions.cols,
    rows: dimensions.rows
  });
});
```

## Configuration

The server can be configured via environment variables:

- `PORT` - Server port (default: 2222)
- `SSH_READY_TIMEOUT` - SSH connection timeout in ms (default: 20000)
- `SSH_KEEPALIVE_INTERVAL` - SSH keepalive interval in ms (default: 30000)
- `SSH_KEEPALIVE_COUNT_MAX` - Max keepalive count (default: 3)

## API Endpoints

### Health Check
```
GET /health
```

Returns server status and active session count.

## Security Considerations

- This is a bare minimum implementation for development/testing
- For production use, consider adding:
  - Authentication/authorization
  - Rate limiting
  - Input validation
  - Connection limits
  - Logging and monitoring
  - HTTPS/WSS support

## Dependencies

- `express` - Web server framework
- `socket.io` - WebSocket library
- `ssh2` - SSH2 client library
- `uuid` - Unique ID generation
- `cors` - Cross-origin resource sharing

## License

MIT 