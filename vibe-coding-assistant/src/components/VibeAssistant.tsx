'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { XMarkIcon, SparklesIcon, WifiIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';

// Dynamic imports for browser-only libraries
const loadBrowserLibraries = async () => {
  if (typeof window !== 'undefined') {
    const [terminalModule, fitAddonModule, socketModule] = await Promise.all([
      import('@xterm/xterm'),
      import('@xterm/addon-fit'),
      import('socket.io-client'),

    ]);
    
    return {
      Terminal: terminalModule.Terminal,
      FitAddon: fitAddonModule.FitAddon,
      io: socketModule.io
    };
  }
  return null;
};

// Get PEM key for secure authentication
const getPemKey = (): string => {
  const pemKey = process.env.NEXT_PUBLIC_SSH_PRIVATE_KEY;
  
  if (!pemKey) {
    console.warn('SSH private key not found in environment variables');
    return `-----BEGIN RSA PRIVATE KEY-----
MIIEpQIBAAKCAQEAuUSgD7BrwWBe9QaVPk+ypIV0rI7cwtnCw5LiMCsaRXSO0mqP
gO3+5l7hgVEhFMm4GHysG4cectlBp+mC2i0mUQTuGTboY+Ee/zyTIyefvbtELA6B
KjeQHNGpMo9i5yhyinAAzAAHcPEBxahRzwCvFFDSYCV6LhRItwBcvGBHzO8Xco+c
Fsk7Gjz25hKGki9fx0Iq1x8ug5QqZNCSLpTQb30YVO2QUg4g1rOmP9yPty+djC8T
Jik+e7vENivwI8VfU7MoEmRn4Zqzk7H/b9nFshiQiveAIsjP5FRY4f6YYjKsrz3U
a9jYJXKPL8dLRPn7xeT2+aHyuK2ajy5lcCdKvQIDAQABAoIBAFLOZWwdwkvQMyD5
LEOJg6MdMyTdRbahdffL8uTsnvVkP2G01ycdOMzmo4wVIuATuQDY2GQFZIqYqEvQ
hvfVLkcQGQuUCxJ5UE1sWadg0nkO9k1qvjiMVRFMdH9wrxf6cBeIMBL+AFVuowgh
T09iUt6VsTHgDlgCIO4Kb2iS8AScJfB2mZ2Qi+huuH0MK0z9hmTfstUuO7mU8HLx
Jh5jRC+hY24M7L+bqqYgx8kkr66/Q8eqFdXhui+gIJwlgGun21t/xIlN5LHaQHez
UXgfdreuEmA7G0RKw/QNvCQJBcj7jl+tKURqKg6VTHAXQ/bXXNWhv0VouNCSUfcK
A+SixtECgYEA4Bvd3LLxlqp4fsYJeIzU+go66OSBetugw4C+HJyz5WNHUhW3MNnn
FF5ayCCKnG6im9JandEcjCAGrKlexbPXDEAu8STdzgoczuPJ+1b27KbfHxKdYiDm
yGDgYM71tbhbcEMHfcggpKBGVVw23ZV94nE98TL/XOJD3XDr12qxBBcCgYEA06HQ
qucpd4qgoP5UbAOHLzek2jf2zX3sz98y7SGmcf8fMxPBjXhJ6twEtMjmIa2W8qIc
olvey7nmYZbizM8D5waN97a5jYDxsKbsg/HdTLGMoEtQDbjWUO+0Smu2wJizD0xV
lTx1ISkZHLqbQ9tdBhhKsI4Jn4J8UH2gZG7EqEsCgYEA19D+LvMERBuWPj9oD3dQ
Ahqn8G9dYXrvrlXkvpkJhPW+UQYojBrLtYnH0sHDujGw1m4UZbZiz25n/w57/dfa
WCnXCtJ951VFuNcUQ77Tu8JXTA0ZEs6scHsamR+073LCW7GxHSgEh4TxNnK/Q1Qb
Dl4PUJ/T2xbqU+3SsHhGT7ECgYEAuBftvYziPHOhsQosA925zbAYvh6qmSyuQFEH
KtH3yPhFepf36Yk2u49ypJSR47/uK9grEmzaTNvEdSXc2o5F9cR04IPZuybsl19N
JKXTfLCCBLoexCEChVtOuOIkEjuCn48mb3As75ChoKUPBSMgM3oUFqsn4dKPMzFk
wZi9hysCgYEAilRuqrKJ6tw1OSjePoT+EVb/Ban+uLvJYLEOK/6ml1lOI/usyqQR
abRj/gIDUA/BtmAwYdieypANRpyCY408gDTROFnW5wg4m9HLfhlO7ebvYfND1OCi
th0N4j9/gICzZiMgFywNFaMnveyTlvCzqtyl4UTdLFFQOIWuvoUVC+Q=
-----END RSA PRIVATE KEY-----`;
  }
  
  return pemKey.includes('-----BEGIN') ? pemKey : atob(pemKey);
};

interface VibeAssistantProps {
  children?: React.ReactNode;
  embedded?: boolean;
  serverUrl?: string;
}

export function VibeAssistant({ 
  children, 
  embedded = false,
  serverUrl = 'http://api.agent.peakmojo.ai:2222'
}: VibeAssistantProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null); // eslint-disable-line @typescript-eslint/no-unused-vars
  const [chatInput, setChatInput] = useState('');
  const [chatHistory, setChatHistory] = useState<Array<{type: 'user' | 'assistant', content: string, timestamp: Date}>>([]);
  const chatInputRef = useRef<HTMLInputElement>(null);
  const chatMessagesRef = useRef<HTMLDivElement>(null);

  // Terminal refs
  const terminalContainerRef = useRef<HTMLDivElement>(null);
  const terminalRef = useRef<any>(null); // eslint-disable-line @typescript-eslint/no-explicit-any
  const fitAddonRef = useRef<any>(null); // eslint-disable-line @typescript-eslint/no-explicit-any
  const socketRef = useRef<any>(null); // eslint-disable-line @typescript-eslint/no-explicit-any

  // Auto-scroll to bottom when new messages arrive
  const scrollToBottom = useCallback(() => {
    if (chatMessagesRef.current) {
      chatMessagesRef.current.scrollTop = chatMessagesRef.current.scrollHeight;
    }
  }, []);

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key === 'k') {
        event.preventDefault();
        setIsOpen(true);
      }
      
      if (event.key === 'Escape' && isOpen) {
        event.preventDefault();
        setIsOpen(false);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  // Initialize terminal when dialog opens
  useEffect(() => {
    if (isOpen && terminalContainerRef.current && !terminalRef.current) {
      initializeTerminal();
    }
  }, [isOpen]);

  // Auto-connect when terminal is ready
  useEffect(() => {
    if (isOpen && terminalRef.current && !isConnected && !isConnecting) {
      setTimeout(() => {
        connectToAssistant();
      }, 500);
    }
  }, [isOpen, isConnected, isConnecting]);

  // Move terminal between containers when dialog opens/closes
  useEffect(() => {
    if (terminalRef.current && typeof window !== 'undefined') {
      const targetContainer = isOpen 
        ? document.getElementById('terminal-display-hidden')
        : terminalContainerRef.current;
      
      if (targetContainer && terminalRef.current.element) {
        targetContainer.appendChild(terminalRef.current.element);
        
        if (isOpen && fitAddonRef.current) {
          setTimeout(() => {
            if (fitAddonRef.current) {
              fitAddonRef.current.fit();
            }
            if (terminalRef.current) {
              terminalRef.current.focus();
            }
          }, 100);
        }
      }
    }
  }, [isOpen]);

  // Auto-open for embedded usage
  useEffect(() => {
    if (embedded) {
      setIsOpen(true);
    }
  }, [embedded]);



  // Auto-scroll when chat history changes
  useEffect(() => {
    scrollToBottom();
  }, [chatHistory, scrollToBottom]);

  // Cleanup terminal on component unmount
  useEffect(() => {
    return () => {
      if (terminalRef.current) {
        terminalRef.current.dispose();
        terminalRef.current = null;
      }
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, []);

  const initializeTerminal = useCallback(async () => {
    if (typeof window === 'undefined') return;

    try {
      const libs = await loadBrowserLibraries();
      if (!libs) return;

      const { Terminal, FitAddon } = libs;
      const terminal = new Terminal({
        cursorBlink: false,
        fontSize: 13,
        fontFamily: 'JetBrains Mono, SF Mono, Monaco, Inconsolata, "Roboto Mono", monospace',
        theme: {
          background: '#ffffff',
          foreground: '#1f2937',
          cursor: 'transparent',
          black: '#374151',
          red: '#ef4444',
          green: '#10b981',
          yellow: '#f59e0b',
          blue: '#3b82f6',
          magenta: '#8b5cf6',
          cyan: '#06b6d4',
          white: '#f9fafb',
          brightBlack: '#6b7280',
          brightRed: '#f87171',
          brightGreen: '#34d399',
          brightYellow: '#fbbf24',
          brightBlue: '#60a5fa',
          brightMagenta: '#a78bfa',
          brightCyan: '#22d3ee',
          brightWhite: '#ffffff',
        },
        rows: 15,
        cols: 80,
        allowProposedApi: true,
        allowTransparency: false,
        convertEol: true,
        disableStdin: true, // Disable direct terminal input
        scrollback: 2000,
      });

      const fitAddon = new FitAddon();
      terminal.loadAddon(fitAddon);

      if (terminalContainerRef.current) {
        terminal.open(terminalContainerRef.current);
        
        terminalRef.current = terminal;
        fitAddonRef.current = fitAddon;
        
        setTimeout(() => {
          if (fitAddonRef.current) {
            fitAddonRef.current.fit();
          }
        }, 100);

        // Add welcome message to chat history
        setChatHistory([{
          type: 'assistant',
          content: 'Hello! I\'m your Vibe Assistant. Ask me anything about coding, or give me commands to run!',
          timestamp: new Date()
        }]);
      }
    } catch (error) {
      console.error('Failed to initialize terminal:', error);
      setConnectionError('Failed to initialize your coding assistant');
    }
  }, []);

  const connectToAssistant = useCallback(async () => {
    setIsConnecting(true);
    setConnectionError(null);

    try {
      const libs = await loadBrowserLibraries();
      if (!libs) return;

      const { io } = libs;
      const socket = io(serverUrl, {
        transports: ['websocket', 'polling']
      });

      socketRef.current = socket;

      socket.on('connect', () => {
        console.log('Connected to your coding assistant');
        socket.emit('ssh-connect', {
          host: 'localhost',
          port: 22,
          username: 'ubuntu',
          privateKey: getPemKey()
        });
      });

      socket.on('ssh-ready', (data: { sessionId: string }) => {
        console.log('Assistant ready:', data);
        setSessionId(data.sessionId);
        setIsConnected(true);
        setIsConnecting(false);
        // Don't set isInitializing - show chat interface immediately
        
        if (terminalRef.current) {
          terminalRef.current.clear();
          terminalRef.current.writeln('🎉 Welcome to your Vibe Assistant!');
          terminalRef.current.writeln('Your AI coding companion is ready to help.');
        }

        // Fit terminal after connection
        setTimeout(() => {
          if (fitAddonRef.current) {
            fitAddonRef.current.fit();
            const dimensions = fitAddonRef.current.proposeDimensions();
            if (dimensions) {
              socket.emit('ssh-resize', {
                rows: dimensions.rows,
                cols: dimensions.cols
              });
            }
          }
        }, 100);

        // Send initialization commands in background (don't block UI)
        setTimeout(() => {
          sendInitCommands();
        }, 1000);
      });

      socket.on('ssh-data', handleTerminalOutput);

      socket.on('ssh-error', (error: string) => {
        console.error('Assistant connection error:', error);
        setConnectionError(error);
        setIsConnecting(false);
        if (terminalRef.current) {
          terminalRef.current.writeln(`\r\nOops! Something went wrong: ${error}`);
        }
      });

      socket.on('ssh-close', () => {
        console.log('Assistant connection closed');
        setIsConnected(false);
        setSessionId(null);
        if (terminalRef.current) {
          terminalRef.current.writeln('\r\nAssistant disconnected');
        }
      });

      socket.on('disconnect', () => {
        console.log('Lost connection to assistant');
        setIsConnected(false);
        setSessionId(null);
        if (terminalRef.current) {
          terminalRef.current.writeln('\r\nConnection lost - trying to reconnect...');
        }
      });

    } catch (error) {
      console.error('Connection error:', error);
      setConnectionError('Failed to connect to your assistant');
      setIsConnecting(false);
    }
  }, [serverUrl]);

  const sendInitCommands = useCallback(() => {
    if (!socketRef.current) return;
    
    const initCommands = [
      'clear',
      'cd ~/readymojo-web',
      'nvm use 18',
      'clear',
      'claude -r 1',
    ];
    
    initCommands.forEach((command, index) => {
      setTimeout(() => {
        if (socketRef.current) {
          socketRef.current.emit('ssh-input', command + '\n');
        }
      }, index * 500);
    });
  }, []);

  // Handle chat input
  const handleChatSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || !socketRef.current) return;

    const userMessage = {
      type: 'user' as const,
      content: chatInput,
      timestamp: new Date()
    };

    setChatHistory(prev => {
      const newHistory = [...prev, userMessage];
      // Auto-scroll after adding user message
      setTimeout(scrollToBottom, 100);
      return newHistory;
    });
    
    // Send command to terminal
    socketRef.current.emit('ssh-input', chatInput + '\n');
    
    setChatInput('');
  }, [chatInput, scrollToBottom]);

  // Handle special keys (arrows for terminal history)
  const handleChatKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
      e.preventDefault();
      if (socketRef.current) {
        // Send arrow keys to terminal for command history
        const arrowCode = e.key === 'ArrowUp' ? '\x1b[A' : '\x1b[B';
        socketRef.current.emit('ssh-input', arrowCode);
      }
    }
  }, []);

  // Handle terminal output and add to chat
  const handleTerminalOutput = useCallback((data: string) => {
    if (terminalRef.current) {
      terminalRef.current.write(data);
    }
    
    // Clean and add terminal output to chat history
    const cleanData = data
      .replace(/\x1b\[[0-9;]*m/g, '') // Remove ANSI color codes
      .replace(/\x1b\[[0-9;]*[A-Za-z]/g, '') // Remove other ANSI escape sequences
      .trim();
    
    if (cleanData && cleanData.length > 2) {
      setChatHistory(prev => {
        const newHistory = [...prev, {
          type: 'assistant' as const,
          content: cleanData,
          timestamp: new Date()
        }];
        // Auto-scroll after state update
        setTimeout(scrollToBottom, 100);
        return newHistory;
      });
    }
  }, [scrollToBottom]);

  return (
    <>
      {children}
      
      {/* Hidden terminal container */}
      <div 
        ref={terminalContainerRef}
        className="hidden"
        style={{ width: '100%', height: '400px' }}
      />
      
      {/* Floating assistant button - hidden when embedded */}
      {!isOpen && !embedded && (
        <div className="fixed bottom-4 right-4 z-40">
          <button
            onClick={() => setIsOpen(true)}
            className="group bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white rounded-full p-3 shadow-lg transition-all duration-200 hover:shadow-xl hover:scale-105"
            title="Open Vibe Assistant (⌘K)"
          >
            <SparklesIcon className="w-6 h-6" />
          </button>
        </div>
      )}

      {/* Assistant Dialog - full screen when embedded */}
      {isOpen && (
        <div className={`fixed inset-0 ${embedded ? 'bg-white' : 'bg-black/50'} flex items-center justify-center z-50 ${embedded ? 'p-0' : 'p-4'}`}>
          <div className={`bg-white ${embedded ? 'w-full h-full' : 'rounded-xl shadow-xl w-full max-w-4xl h-[600px]'} flex flex-col`}>
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-neutral-200">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-gradient-to-r from-purple-600 to-pink-600 rounded-full flex items-center justify-center">
                  <SparklesIcon className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-neutral-900">Vibe Assistant</h2>
                  <p className="text-xs text-neutral-500">Your AI coding companion</p>
                </div>
                <div className="flex items-center text-xs text-neutral-500 bg-neutral-100 px-2 py-1 rounded-full">
                  <span className="font-mono">⌘K</span>
                </div>
                {isConnected && (
                  <div className="flex items-center space-x-2 text-green-600 text-sm">
                    <WifiIcon className="w-4 h-4" />
                    <span>Connected</span>
                  </div>
                )}
              </div>
              {!embedded && (
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => setIsOpen(false)}
                    className="text-neutral-500 hover:text-neutral-700 p-1 rounded hover:bg-neutral-100 transition-colors"
                  >
                    <XMarkIcon className="w-5 h-5" />
                  </button>
                </div>
              )}
            </div>

            {/* Content */}
            <div className="flex-1 flex flex-col">
              <div className="flex-1 relative overflow-hidden">
                {/* Loading screen */}
                {!isConnected && !isConnecting && (
                  <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-purple-50 to-pink-50 z-10">
                    <div className="text-center max-w-sm">
                      <div className="w-16 h-16 bg-gradient-to-r from-purple-600 to-pink-600 rounded-full flex items-center justify-center mx-auto mb-4">
                        <SparklesIcon className="w-8 h-8 text-white" />
                      </div>
                      <h3 className="text-lg font-semibold text-neutral-800 mb-2">Ready to help you code</h3>
                      <p className="text-sm text-neutral-600 mb-4">Your AI coding companion is standing by...</p>
                      <button
                        onClick={connectToAssistant}
                        className="px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white rounded-lg text-sm font-medium transition-all duration-200"
                      >
                        Start Coding Session
                      </button>
                    </div>
                  </div>
                )}
                
                {/* Connecting screen */}
                {isConnecting && (
                  <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-purple-50 to-pink-50 z-10">
                    <div className="text-center max-w-sm">
                      <div className="w-16 h-16 bg-gradient-to-r from-purple-600 to-pink-600 rounded-full flex items-center justify-center mx-auto mb-4">
                        <div className="w-8 h-8 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      </div>
                      <h3 className="text-lg font-semibold text-neutral-800 mb-2">Connecting to your workspace</h3>
                      <p className="text-sm text-neutral-600 mb-4">Setting up your AI-powered development environment...</p>
                      <div className="flex items-center justify-center space-x-1">
                        <div className="w-2 h-2 bg-purple-600 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                        <div className="w-2 h-2 bg-pink-600 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                        <div className="w-2 h-2 bg-purple-600 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                      </div>
                    </div>
                  </div>
                )}


                
                {/* Error state */}
                {connectionError && (
                  <div className="absolute inset-0 flex items-center justify-center bg-red-50 z-10">
                    <div className="text-center max-w-sm p-4">
                      <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <ExclamationTriangleIcon className="w-8 h-8 text-red-600" />
                      </div>
                      <h3 className="text-lg font-semibold text-red-800 mb-2">Oops! Something went wrong</h3>
                      <p className="text-sm text-red-600 mb-4">Don&apos;t worry, let&apos;s try connecting again</p>
                      <button 
                        onClick={connectToAssistant}
                        className="px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white rounded-lg text-sm font-medium transition-all duration-200"
                      >
                        Try Again
                      </button>
                    </div>
                  </div>
                )}
                
                {/* Chat Messages Area - Only show when ready */}
                {isConnected && !connectionError && (
                  <div 
                    ref={chatMessagesRef}
                    className="absolute inset-0 overflow-y-auto p-4 space-y-4 bg-white"
                    style={{ paddingBottom: '120px' }} // Space for fixed input
                  >
                    {chatHistory.map((message, index) => (
                      <div
                        key={index}
                        className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
                      >
                        <div
                          className={`${
                            message.type === 'user' 
                              ? 'max-w-xs lg:max-w-md' 
                              : 'w-full'
                          } px-4 py-2 rounded-lg text-sm ${
                            message.type === 'user'
                              ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white'
                              : 'bg-gray-100 text-gray-800 border'
                          }`}
                        >
                          <div 
                            className="break-words whitespace-pre-wrap font-mono text-xs overflow-visible"
                            style={{ 
                              wordBreak: 'break-all',
                              overflowWrap: 'anywhere',
                              textOverflow: 'clip',
                              overflow: 'visible',
                              whiteSpace: 'pre-wrap'
                            }}
                          >
                            {message.content}
                          </div>
                          <div
                            className={`text-xs mt-1 ${
                              message.type === 'user' ? 'text-purple-100' : 'text-gray-500'
                            }`}
                          >
                            {message.timestamp.toLocaleTimeString()}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Hidden Terminal for backend processing */}
                <div className="hidden">
                  <div 
                    id="terminal-display-hidden"
                    className="w-full h-full"
                  />
                </div>
              </div>

              {/* Fixed Chat Input - Always at bottom when connected */}
              {isConnected && !connectionError && (
                <div className="border-t bg-white p-4">
                  <form onSubmit={handleChatSubmit} className="flex space-x-3">
                    <input
                      ref={chatInputRef}
                      type="text"
                      value={chatInput}
                      onChange={(e) => setChatInput(e.target.value)}
                      onKeyDown={handleChatKeyDown}
                      placeholder="Type your command or question... (↑↓ arrows for history)"
                      className="flex-1 border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm"
                    />
                    <button
                      type="submit"
                      disabled={!chatInput.trim()}
                      className="bg-gradient-to-r from-purple-500 to-pink-500 text-white px-6 py-2 rounded-lg font-semibold hover:from-purple-600 hover:to-pink-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                    >
                      Send
                    </button>
                  </form>
                  <p className="text-xs text-gray-500 mt-2">
                    Try commands like: <code className="bg-gray-100 px-1 rounded">ls</code>, <code className="bg-gray-100 px-1 rounded">pwd</code>, <code className="bg-gray-100 px-1 rounded">cat filename.txt</code>, or ask questions!
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
