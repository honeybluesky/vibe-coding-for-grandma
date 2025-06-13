#!/bin/bash

# WebSSH Server Startup Script

echo "Starting WebSSH Server..."

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo "Installing dependencies..."
    npm install
fi

# Set default environment variables if not set
export PORT=${PORT:-2222}
export LOG_LEVEL=${LOG_LEVEL:-info}

echo "Server configuration:"
echo "  Port: $PORT"
echo "  Log Level: $LOG_LEVEL"
echo ""

# Start the server
echo "Starting server on port $PORT..."
node server.js 