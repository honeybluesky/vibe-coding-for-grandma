'use client';

import React, { useState, useEffect } from 'react';
import { XMarkIcon, SparklesIcon, WifiIcon } from '@heroicons/react/24/outline';

// Simplified version for now - we'll add the full terminal functionality later
interface VibeAssistantProps {
  children?: React.ReactNode;
  embedded?: boolean;
  serverUrl?: string;
}

export function VibeAssistant({ 
  children, 
  embedded = false
}: VibeAssistantProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);

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

  // Auto-open for embedded usage
  useEffect(() => {
    if (embedded) {
      setIsOpen(true);
      // Simulate connection after 2 seconds
      setTimeout(() => {
        setIsConnecting(true);
        setTimeout(() => {
          setIsConnecting(false);
          setIsConnected(true);
        }, 2000);
      }, 1000);
    }
  }, [embedded]);

  return (
    <>
      {children}
      
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
                        <SparklesIcon className="w-8 h-8 text-white" />
                      </div>
                      <h3 className="text-lg font-semibold text-neutral-800 mb-2">Ready to help you code</h3>
                      <p className="text-sm text-neutral-600 mb-4">Your AI coding companion is standing by...</p>
                      <button
                        onClick={() => {
                          setIsConnecting(true);
                          setTimeout(() => {
                            setIsConnecting(false);
                            setIsConnected(true);
                          }, 2000);
                        }}
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

                {/* Connected state - terminal area */}
                {isConnected && (
                  <div className="w-full h-full p-4 text-green-400 font-mono text-sm bg-neutral-900">
                    <div className="border border-green-400/30 rounded-lg p-4 h-full">
                      <div className="mb-4">
                        <div className="text-green-300">🎉 Welcome to Vibe Assistant!</div>
                        <div className="text-green-400">Your AI coding companion is now connected.</div>
                        <div className="text-neutral-400 mt-2">━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━</div>
                      </div>
                      
                      <div className="space-y-2">
                        <div><span className="text-blue-400">$</span> <span className="text-yellow-300">vibe-assistant</span> <span className="text-green-300">--status</span></div>
                        <div className="text-green-400">✓ Connection established</div>
                        <div className="text-green-400">✓ AI companion ready</div>
                        <div className="text-green-400">✓ Code analysis enabled</div>
                        <div className="text-green-400">✓ Smart suggestions active</div>
                        
                        <div className="mt-4">
                          <div><span className="text-blue-400">$</span> <span className="text-yellow-300">echo</span> <span className="text-green-300">&quot;Ready to help you code better!&quot;</span></div>
                          <div className="text-white">Ready to help you code better!</div>
                        </div>
                        
                        <div className="mt-4 text-neutral-400">
                          <div>Type your questions or paste code for analysis...</div>
                          <div className="text-purple-400 mt-2">💡 Tip: Use natural language - I understand what you need!</div>
                        </div>
                        
                        <div className="mt-4 flex items-center">
                          <span className="text-blue-400">$</span>
                          <span className="ml-2 animate-pulse bg-green-400 w-2 h-4 inline-block"></span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
