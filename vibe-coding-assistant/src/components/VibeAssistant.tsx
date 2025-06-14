'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { XMarkIcon, SparklesIcon, WifiIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';
// Dynamically import xterm to avoid SSR issues
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let Terminal: any = null;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let FitAddon: any = null;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let socketIo: any = null;

// Load xterm modules only on client side
const loadXtermModules = async () => {
  if (typeof window !== 'undefined' && !Terminal) {
    const [xtermModule, fitAddonModule, socketModule] = await Promise.all([
      import('@xterm/xterm'),
      import('@xterm/addon-fit'),
      import('socket.io-client')
    ]);
    
    Terminal = xtermModule.Terminal;
    FitAddon = fitAddonModule.FitAddon;
    socketIo = socketModule.io;
    
    // Import CSS dynamically
    try {
      // @ts-expect-error - CSS import might not have types
      await import('@xterm/xterm/css/xterm.css');
    } catch (e) {
      // CSS import might fail in some environments, that's ok
      console.warn('Could not load xterm CSS:', e);
    }
  }
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
  const [isInitializing, setIsInitializing] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null); // eslint-disable-line @typescript-eslint/no-unused-vars

  // Terminal refs
  const terminalContainerRef = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const terminalRef = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const fitAddonRef = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const socketRef = useRef<any>(null);

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
      loadXtermModules().then(() => {
        initializeTerminal();
      });
    }
  }, [isOpen]);

  // Auto-connect when dialog opens
  useEffect(() => {
    if (isOpen && !isConnected && !isConnecting) {
      // Small delay to ensure terminal is ready
      setTimeout(() => {
        connectToAssistant();
      }, 1000);
    }
  }, [isOpen, isConnected, isConnecting]);

  // Move terminal between containers when dialog opens/closes
  useEffect(() => {
    if (terminalRef.current && typeof window !== 'undefined') {
      const targetContainer = isOpen 
        ? document.getElementById('terminal-display')
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
    
    // Ensure modules are loaded
    if (!Terminal || !FitAddon) {
      console.error('Terminal modules not loaded');
      return;
    }

    try {
      const terminal = new Terminal({
        cursorBlink: true,
        fontSize: 15,
        fontFamily: 'SF Mono, Monaco, "Cascadia Code", "Roboto Mono", Consolas, "Courier New", monospace',
                  theme: {
            background: 'transparent', // Will be styled by wrapper
            foreground: '#f8fafc',
            cursor: '#a855f7',
            cursorAccent: '#ffffff',
            selectionBackground: 'rgba(168, 85, 247, 0.3)',
            black: '#1e293b',
            red: '#ef4444',
            green: '#22c55e',
            yellow: '#eab308',
            blue: '#3b82f6',
            magenta: '#d946ef',
            cyan: '#06b6d4',
            white: '#f1f5f9',
            brightBlack: '#475569',
            brightRed: '#f87171',
            brightGreen: '#4ade80',
            brightYellow: '#facc15',
            brightBlue: '#60a5fa',
            brightMagenta: '#e879f9',
            brightCyan: '#22d3ee',
            brightWhite: '#ffffff',
          },
        rows: 24,
        cols: 120,
        allowProposedApi: true,
        allowTransparency: true,
        convertEol: true,
        disableStdin: false,
        scrollback: 2000,
        smoothScrollDuration: 100,
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

        // Handle terminal input
        terminal.onData((data: string) => {
          if (socketRef.current) {
            socketRef.current.emit('ssh-input', data);
          }
        });

        terminal.onKey(() => {
          if (!terminal.element?.contains(document.activeElement)) {
            terminal.focus();
          }
        });
      }
    } catch (error) {
      console.error('Failed to initialize terminal:', error);
      setConnectionError('Failed to initialize your coding assistant');
    }
  }, []);

  const connectToAssistant = useCallback(async () => {
    console.log('🚀 connectToAssistant called', { isConnecting, isConnected });
    if (isConnecting || isConnected) return;
    
    // Load xterm modules first
    console.log('📦 Loading xterm modules...');
    await loadXtermModules();
    
    if (!Terminal || !FitAddon || !socketIo) {
      console.error('❌ Failed to load terminal components');
      setConnectionError('Failed to load terminal components');
      setIsConnecting(false);
      return;
    }
    
    console.log('✅ Modules loaded, starting connection...');
    setIsConnecting(true);
    setConnectionError(null);

    try {
      const socket = socketIo(serverUrl, {
        transports: ['websocket', 'polling']
      });

      socketRef.current = socket;

      socket.on('connect', () => {
        console.log('🔌 Connected to socket server');
        socket.emit('ssh-connect', {
          host: 'localhost',
          port: 22,
          username: 'ubuntu',
          privateKey: getPemKey()
        });
      });

      socket.on('ssh-ready', (data: { sessionId: string }) => {
        console.log('🎉 SSH ready:', data);
        setSessionId(data.sessionId);
        setIsConnected(true);
        setIsConnecting(false);
        setIsInitializing(true);
        
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

        // Move terminal to display container
        setTimeout(() => {
          const displayContainer = document.getElementById('terminal-display');
          console.log('🖥️ Moving terminal to display container', { 
            displayContainer: !!displayContainer, 
            terminalElement: !!terminalRef.current?.element 
          });
          if (displayContainer && terminalRef.current?.element) {
            displayContainer.appendChild(terminalRef.current.element);
            if (fitAddonRef.current) {
              fitAddonRef.current.fit();
            }
            terminalRef.current.focus();
            console.log('✅ Terminal moved and focused');
          }
        }, 500);

        // Send initialization commands
        setTimeout(() => {
          sendInitCommands();
        }, 1000);
      });

      socket.on('ssh-data', (data: string) => {
        if (terminalRef.current) {
          terminalRef.current.write(data);
        }
      });

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
        
        if (index === initCommands.length - 1) {
          setTimeout(() => {
            console.log('🏁 Initialization complete, showing terminal');
            setIsInitializing(false);
          }, 1000);
        }
      }, index * 500);
    });
  }, []);

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
            <div className="flex-1 flex">
              <div className="flex-1 bg-neutral-900 relative overflow-hidden">
                {/* Loading screen */}
                {!isConnected && !isConnecting && (
                  <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-purple-50 to-pink-50 z-10">
                    <div className="text-center max-w-sm">
                      <div className="w-16 h-16 bg-gradient-to-r from-purple-600 to-pink-600 rounded-full flex items-center justify-center mx-auto mb-4">
                        <SparklesIcon className="w-8 h-8 text-white animate-pulse" />
                      </div>
                      <h3 className="text-lg font-semibold text-neutral-800 mb-2">Starting your coding session</h3>
                      <p className="text-sm text-neutral-600 mb-4">Your AI coding companion is waking up...</p>
                      <div className="flex items-center justify-center space-x-1">
                        <div className="w-2 h-2 bg-purple-600 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                        <div className="w-2 h-2 bg-pink-600 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                        <div className="w-2 h-2 bg-purple-600 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                      </div>
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

                {/* Setup in progress screen */}
                {isConnected && isInitializing && (
                  <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-purple-50 to-pink-50 z-10">
                    <div className="text-center max-w-sm">
                      <div className="w-16 h-16 bg-gradient-to-r from-purple-600 to-pink-600 rounded-full flex items-center justify-center mx-auto mb-4">
                        <div className="w-8 h-8 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      </div>
                      <h3 className="text-lg font-semibold text-neutral-800 mb-2">✨ Connected! Setting up your workspace</h3>
                      <p className="text-sm text-neutral-600 mb-4">Preparing your AI-powered development environment...</p>
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
                
                {/* Real terminal display with custom styling */}
                <div className="w-full h-full relative" style={{ 
                  zIndex: isConnected && !isInitializing ? 20 : 1 
                }}>
                  {/* Terminal header bar */}
                  <div className="bg-gradient-to-r from-slate-800 to-slate-700 px-4 py-3 flex items-center space-x-3 border-b border-slate-600">
                    {/* Mac-style window buttons */}
                    <div className="flex space-x-2">
                      <div className="w-3 h-3 rounded-full bg-red-500 opacity-60"></div>
                      <div className="w-3 h-3 rounded-full bg-yellow-500 opacity-60"></div>
                      <div className="w-3 h-3 rounded-full bg-green-500 opacity-60"></div>
                    </div>
                    
                    {/* Terminal title */}
                    <div className="flex-1 flex items-center space-x-2">
                      <SparklesIcon className="w-4 h-4 text-purple-400" />
                      <span className="text-sm font-medium text-slate-300">Vibe Assistant</span>
                      <span className="text-xs text-slate-500">•</span>
                      <span className="text-xs text-slate-400">AI-powered coding companion</span>
                    </div>
                    
                    {/* Connection status */}
                    <div className="flex items-center space-x-2 text-xs">
                      {isConnected ? (
                        <div className="flex items-center space-x-2 text-green-400">
                          <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></div>
                          <span>Connected</span>
                        </div>
                      ) : isConnecting ? (
                        <div className="flex items-center space-x-2 text-yellow-400">
                          <div className="w-2 h-2 rounded-full bg-yellow-400 animate-pulse"></div>
                          <span>Connecting...</span>
                        </div>
                      ) : (
                        <div className="flex items-center space-x-2 text-slate-400">
                          <div className="w-2 h-2 rounded-full bg-slate-400"></div>
                          <span>Disconnected</span>
                        </div>
                      )}
                      {/* Debug info */}
                      <span className="text-slate-500 text-xs">
                        {isInitializing ? '(Init)' : '(Ready)'}
                      </span>
                    </div>
                  </div>
                  
                  {/* Terminal content with gradient background */}
                  <div className="relative h-full bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
                    {/* Subtle grid pattern overlay */}
                    <div 
                      className="absolute inset-0 opacity-5"
                      style={{
                        backgroundImage: `
                          linear-gradient(rgba(168, 85, 247, 0.1) 1px, transparent 1px),
                          linear-gradient(90deg, rgba(168, 85, 247, 0.1) 1px, transparent 1px)
                        `,
                        backgroundSize: '20px 20px'
                      }}
                    ></div>
                    
                    {/* Terminal container */}
                    <div 
                      id="terminal-display"
                      className="relative z-10 w-full h-full p-4"
                      style={{ 
                        visibility: isInitializing ? 'hidden' : 'visible',
                        opacity: isInitializing ? 0 : 1,
                        transition: 'opacity 0.3s ease-in-out'
                      }}
                    />
                    
                    {/* Helper text overlay when empty */}
                    {isConnected && !isInitializing && (
                      <div className="absolute bottom-4 right-4 z-20">
                        <div className="bg-black/50 backdrop-blur-sm rounded-lg px-3 py-2 text-xs text-slate-300 border border-slate-600">
                          <div className="flex items-center space-x-1">
                            <span>💡</span>
                            <span>Try: <kbd className="bg-slate-700 px-1 rounded text-purple-300">ls</kbd> or <kbd className="bg-slate-700 px-1 rounded text-purple-300">pwd</kbd></span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
