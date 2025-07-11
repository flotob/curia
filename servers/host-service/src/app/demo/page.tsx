/**
 * Demo Page - Shows Curia Embed Script in Action
 * 
 * This demonstrates how customers will embed Curia on their sites.
 * Includes real-time communication logging for development insight.
 * 
 * ARCHITECTURE: Parent loads /embed → auth/community selection → sends curia-auth-complete message 
 * → parent switches iframe src to localhost:3000?mod=standalone → forum asks for data via PostMessage
 * → parent responds with real database data via ClientPluginHost.
 */

'use client';

import React, { useState, useRef, useEffect } from 'react';
import { ClientPluginHost, AuthContext } from '@/lib/ClientPluginHost';

interface LogEntry {
  timestamp: string;
  message: string;
  type: 'info' | 'error' | 'success' | 'api' | 'auth';
}

export default function DemoPage() {
  const [showCode, setShowCode] = useState(false);
  const [embedLoaded, setEmbedLoaded] = useState(false);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [showLogs, setShowLogs] = useState(true);
  const [embedPhase, setEmbedPhase] = useState<'auth' | 'forum'>('auth');
  const [authContext, setAuthContext] = useState<AuthContext | null>(null);
  
  const logsRef = useRef<HTMLDivElement>(null);
  const pluginHostRef = useRef<ClientPluginHost | null>(null);
  const embedIframeRef = useRef<HTMLIFrameElement | null>(null);

  // Auto-scroll logs to bottom
  useEffect(() => {
    if (logsRef.current) {
      logsRef.current.scrollTop = logsRef.current.scrollHeight;
    }
  }, [logs]);

  // Add log entry
  const addLog = (message: string, type: 'info' | 'error' | 'success' | 'api' | 'auth' = 'info') => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs(prev => [...prev.slice(-99), { timestamp, message, type }]); // Keep last 100 logs
    console.log(`[Demo] ${message}`);
  };

  // Clear logs
  const clearLogs = () => {
    setLogs([]);
    addLog('Logs cleared', 'info');
  };

  // Initialize ClientPluginHost
  useEffect(() => {
    // Initialize plugin host
    pluginHostRef.current = new ClientPluginHost(process.env.NEXT_PUBLIC_HOST_SERVICE_URL);
    
    // Set up event listeners
    const pluginHost = pluginHostRef.current;
    
    pluginHost.on('plugin-loaded', (data) => {
      addLog(`Forum plugin loaded successfully with UID: ${data.iframeUid}`, 'success');
      addLog(`Forum URL: ${data.url}`, 'info');
    });
    
    pluginHost.on('plugin-error', (data) => {
      addLog(`Forum plugin error: ${data.error}`, 'error');
    });
    
    pluginHost.on('api-request', (data) => {
      addLog(`API Request: ${data.method}${data.params ? ` with params: ${JSON.stringify(data.params)}` : ''}`, 'api');
    });
    
    pluginHost.on('plugin-communication', (data) => {
      addLog(`Plugin communication: ${data.type} - ${data.method || 'N/A'}`, 'api');
    });
    
    return () => {
      if (pluginHostRef.current) {
        pluginHostRef.current.unloadPlugin();
      }
    };
  }, []);

  // Listen for postMessage events to log communication and handle auth completion
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      // Filter for Curia-related messages
      if (event.data && typeof event.data === 'object') {
        // Handle auth completion from embed
        if (event.data.type === 'curia-auth-complete') {
          addLog('Auth completion received from embed', 'auth');
          addLog(`User: ${event.data.userId}, Community: ${event.data.communityId}`, 'auth');
          
          // Store auth context
          const newAuthContext: AuthContext = {
            userId: event.data.userId,
            communityId: event.data.communityId,
            sessionToken: event.data.sessionToken
          };
          setAuthContext(newAuthContext);
          
          // Set auth context in plugin host
          if (pluginHostRef.current) {
            pluginHostRef.current.setAuthContext(newAuthContext);
          }
          
          // Switch iframe to forum URL
          switchToForum();
          return;
        }

        // Curia resize messages
        if (event.data.type === 'curia-resize') {
          addLog(`Iframe resize request: ${event.data.height}px`, 'info');
          return;
        }

        // PostMessage API communication
        if (event.data.type && event.data.iframeUid && event.data.requestId) {
          if (event.data.type === 'api_request') {
            addLog(`API Request: ${event.data.method}${event.data.params ? ` with params: ${JSON.stringify(event.data.params)}` : ''}`, 'api');
          } else if (event.data.type === 'api_response') {
            const status = event.data.error ? 'error' : 'success';
            const message = event.data.error 
              ? `API Error: ${event.data.error}`
              : `API Response: ${event.data.method || 'unknown'} completed`;
            addLog(message, status);
          }
        }
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  // Switch iframe from embed to forum
  const switchToForum = () => {
    if (!embedIframeRef.current || !pluginHostRef.current) {
      addLog('Cannot switch to forum - iframe or plugin host not ready', 'error');
      return;
    }

    addLog('Switching iframe to forum URL...', 'info');
    setEmbedPhase('forum');
    
    // Build forum URL
    const forumUrl = 'http://localhost:3000?mod=standalone&cg_theme=light';
    
    // Get the iframe container
    const container = embedIframeRef.current.parentElement;
    if (!container) {
      addLog('Cannot find iframe container', 'error');
      return;
    }

    // Load forum via ClientPluginHost
    pluginHostRef.current.loadPlugin({
      url: forumUrl,
      height: '700px',
      width: '100%',
      allowedOrigins: ['*']
    }, container).then(() => {
      // Remove the old embed iframe
      if (embedIframeRef.current && embedIframeRef.current.parentElement) {
        embedIframeRef.current.parentElement.removeChild(embedIframeRef.current);
      }
      embedIframeRef.current = null;
      
      addLog('Successfully switched to forum', 'success');
    }).catch(error => {
      addLog(`Failed to switch to forum: ${error.message}`, 'error');
    });
  };

  // Function to load embed script manually
  const loadEmbedScript = () => {
    if (embedLoaded) {
      addLog('Embed already loaded, skipping', 'info');
      return;
    }

    addLog('Loading embed script...', 'info');
    
    const script = document.createElement('script');
    script.src = '/embed.js';
    script.async = true;
    script.setAttribute('data-container', 'curia-test-embed');
    script.setAttribute('data-theme', 'light');

    // Add script to document
    document.head.appendChild(script);

    script.onload = () => {
      addLog('Embed script loaded successfully', 'success');
      addLog('Embed iframe should now be initializing...', 'info');
      setEmbedLoaded(true);
      
      // Find and store reference to the embed iframe
      setTimeout(() => {
        const container = document.getElementById('curia-test-embed');
        if (container) {
          const iframe = container.querySelector('iframe');
          if (iframe) {
            embedIframeRef.current = iframe;
            addLog('Found embed iframe reference', 'info');
          }
        }
      }, 1000);
    };

    script.onerror = () => {
      addLog('Failed to load embed script', 'error');
    };
  };

  // Function to reset/clear the embed
  const resetEmbed = () => {
    // Unload plugin if loaded
    if (pluginHostRef.current) {
      pluginHostRef.current.unloadPlugin();
    }
    
    const container = document.getElementById('curia-test-embed');
    if (container) {
      container.innerHTML = `
        <div class="text-center text-gray-500 py-12">
          <div class="text-lg mb-2">🎯</div>
          <div>Click "Load Embed" to test the embed script</div>
        </div>
      `;
    }
    
    setEmbedLoaded(false);
    setEmbedPhase('auth');
    setAuthContext(null);
    embedIframeRef.current = null;
    
    addLog('Embed reset', 'info');
  };

  // Log type colors
  const getLogColor = (type: string) => {
    switch (type) {
      case 'error': return '#fca5a5';
      case 'success': return '#86efac';
      case 'api': return '#93c5fd';
      case 'auth': return '#fbbf24';
      default: return '#d1d5db';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-12 px-4">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header */}
        <div className="text-center space-y-4">
          <h1 className="text-4xl font-bold text-gray-900">
            🚀 Curia Embed Demo
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            See how easy it is to embed Curia forums on any website. 
            Watch real-time communication between embed and forum.
          </p>
        </div>

        {/* Main Content Grid */}
        <div className="space-y-8">
          
          {/* Embed Demo Section */}
          <div className="space-y-6">
            
            {/* Control Panel */}
            <div className="bg-white rounded-xl shadow-sm border p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">
                🎮 Demo Controls
              </h2>
              <div className="space-y-4">
                <div className="flex gap-3">
                  <button
                    onClick={loadEmbedScript}
                    disabled={embedLoaded}
                    className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                      embedLoaded
                        ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                        : 'bg-blue-600 text-white hover:bg-blue-700'
                    }`}
                  >
                    {embedLoaded ? 'Embed Loaded' : 'Load Embed'}
                  </button>
                  
                  <button
                    onClick={resetEmbed}
                    className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium transition-colors"
                  >
                    Reset
                  </button>
                  
                  <button
                    onClick={() => setShowCode(!showCode)}
                    className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 font-medium transition-colors"
                  >
                    {showCode ? 'Hide Code' : 'Show Code'}
                  </button>
                </div>
                
                {/* Status Info */}
                <div className="flex items-center gap-4 text-sm">
                  <span className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${embedPhase === 'auth' ? 'bg-yellow-400' : 'bg-gray-300'}`}></span>
                    Auth Phase
                  </span>
                  <span className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${embedPhase === 'forum' ? 'bg-green-400' : 'bg-gray-300'}`}></span>
                    Forum Phase
                  </span>
                  {authContext && (
                    <span className="text-gray-600">
                      User: {authContext.userId} | Community: {authContext.communityId}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {showCode && (
              <div className="bg-gray-900 rounded-xl p-6 overflow-x-auto">
                <h3 className="text-lg font-semibold text-white mb-4">📝 Integration Code</h3>
                <pre className="text-green-400 text-sm">
{`<!-- Basic embed integration -->
<div id="curia-test-embed"></div>
<script 
  src="/embed.js"
  data-container="curia-test-embed"
  data-theme="light"
  async>
</script>`}
                </pre>
              </div>
            )}

            {/* Embed Container */}
            <div className="bg-white rounded-xl shadow-sm border p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">
                🧪 Live Embed ({embedPhase === 'auth' ? 'Auth Phase' : 'Forum Phase'})
              </h2>
              
              <div 
                id="curia-test-embed" 
                className="border border-gray-200 rounded-lg bg-gray-50 min-h-[700px]"
              >
                <div className="text-center text-gray-500 py-12">
                  <div className="text-lg mb-2">🎯</div>
                  <div>Click "Load Embed" to test the embed script</div>
                </div>
              </div>
            </div>

          </div>

          {/* Communication Monitor Section */}
          <div className="space-y-6">
            
            {/* Log Controls */}
            <div className="bg-white rounded-xl shadow-sm border p-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-900">
                  📡 Communication Monitor
                </h2>
                <div className="flex gap-2">
                  <button
                    onClick={() => setShowLogs(!showLogs)}
                    className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors"
                  >
                    {showLogs ? 'Hide' : 'Show'}
                  </button>
                  <button
                    onClick={clearLogs}
                    className="px-3 py-1 text-sm bg-red-100 text-red-700 rounded hover:bg-red-200 transition-colors"
                  >
                    Clear
                  </button>
                </div>
              </div>
            </div>

            {/* Communication Logs */}
            {showLogs && (
              <div className="bg-gray-900 rounded-xl overflow-hidden shadow-lg">
                <div className="bg-gray-800 px-4 py-3 border-b border-gray-700">
                  <h3 className="text-white font-medium flex items-center gap-2">
                    <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
                    Real-time Communication Logs
                  </h3>
                </div>
                <div 
                  ref={logsRef}
                  className="h-80 overflow-y-auto p-4 bg-gray-900"
                >
                  {logs.length === 0 ? (
                    <div className="text-gray-400 italic text-sm">
                      💡 Load the embed to see PostMessage communication between parent and iframe...
                    </div>
                  ) : (
                    <div className="space-y-1">
                      {logs.map((log, index) => (
                        <div 
                          key={index}
                          className="text-sm font-mono"
                          style={{ color: getLogColor(log.type) }}
                        >
                          <span className="text-gray-400">[{log.timestamp}]</span>{' '}
                          <span className={`inline-block w-8 text-xs ${
                            log.type === 'api' ? 'text-blue-300' :
                            log.type === 'auth' ? 'text-yellow-300' :
                            log.type === 'error' ? 'text-red-300' :
                            log.type === 'success' ? 'text-green-300' :
                            'text-gray-300'
                          }`}>
                            {log.type.toUpperCase()}
                          </span>{' '}
                          {log.message}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Status Information */}
            <div className="bg-blue-50 rounded-xl p-6">
              <h3 className="text-lg font-semibold text-blue-900 mb-3">
                🔍 What You'll See
              </h3>
              <div className="text-blue-800 space-y-2 text-sm">
                <p><strong>🟦 API:</strong> PostMessage requests from forum to host</p>
                <p><strong>🟨 AUTH:</strong> Authentication context and user data</p>
                <p><strong>🟩 SUCCESS:</strong> Successful operations and responses</p>
                <p><strong>🟥 ERROR:</strong> Failed operations and error messages</p>
                <p><strong>⚪ INFO:</strong> General embed lifecycle events</p>
              </div>
            </div>

          </div>
        </div>

        {/* Info Footer */}
        <div className="bg-white rounded-xl shadow-sm border p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-3">
            🚀 How It Works
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm text-gray-600">
            <div>
              <div className="font-medium text-gray-900 mb-1">1. Script Loading</div>
              <p>Customer includes embed script with data attributes for configuration</p>
            </div>
            <div>
              <div className="font-medium text-gray-900 mb-1">2. Auth Phase</div>
              <p>Embed iframe loads with authentication and community selection</p>
            </div>
            <div>
              <div className="font-medium text-gray-900 mb-1">3. Forum Switch</div>
              <p>After auth complete, parent switches iframe to forum URL</p>
            </div>
            <div>
              <div className="font-medium text-gray-900 mb-1">4. PostMessage API</div>
              <p>Real-time communication between forum and parent for data exchange</p>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
} 