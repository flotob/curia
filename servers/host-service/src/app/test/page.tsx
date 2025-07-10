'use client'

/**
 * Plugin Testing Page
 * 
 * This page provides a UI to load and test Curia plugins in iframes,
 * similar to the example-host-app interface.
 */

import { useState, useRef, useEffect } from 'react';
import { ClientPluginHost } from '../../lib/ClientPluginHost';

interface LogEntry {
  timestamp: string;
  message: string;
  type: 'info' | 'error' | 'success';
}

export default function PluginTestPage() {
  const [pluginUrl, setPluginUrl] = useState('http://localhost:3000?mod=standalone');
  const [customUrl, setCustomUrl] = useState('');
  const [isUrlCustom, setIsUrlCustom] = useState(false);
  const [pluginHeight, setPluginHeight] = useState(600);
  const [isPluginLoaded, setIsPluginLoaded] = useState(false);
  const [pluginStatus, setPluginStatus] = useState<'idle' | 'loading' | 'connected' | 'error'>('idle');
  const [currentPluginUrl, setCurrentPluginUrl] = useState('');
  const [logs, setLogs] = useState<LogEntry[]>([]);
  
  const iframeContainerRef = useRef<HTMLDivElement>(null);
  const logsRef = useRef<HTMLDivElement>(null);
  const pluginHostRef = useRef<ClientPluginHost | null>(null);

  // Initialize plugin host
  useEffect(() => {
    pluginHostRef.current = new ClientPluginHost(process.env.NEXT_PUBLIC_HOST_SERVICE_URL);
    
    // Set up event listeners
    const pluginHost = pluginHostRef.current;
    
    pluginHost.on('plugin-loaded', (data) => {
      addLog(`Plugin loaded successfully with UID: ${data.iframeUid}`, 'success');
      addLog(`Plugin URL: ${data.url}`, 'info');
      setPluginStatus('connected');
      setIsPluginLoaded(true);
    });
    
    pluginHost.on('plugin-error', (data) => {
      addLog(`Plugin error: ${data.error}`, 'error');
      setPluginStatus('error');
    });
    
    pluginHost.on('api-request', (data) => {
      addLog(`API Request: ${data.method}${data.params ? ` with params: ${JSON.stringify(data.params)}` : ''}`, 'info');
    });
    
    pluginHost.on('plugin-communication', (data) => {
      addLog(`Plugin communication: ${data.type} - ${data.method || 'N/A'}`, 'info');
    });
    
    return () => {
      if (pluginHostRef.current) {
        pluginHostRef.current.unloadPlugin();
      }
    };
  }, []);

  // Auto-scroll logs to bottom
  useEffect(() => {
    if (logsRef.current) {
      logsRef.current.scrollTop = logsRef.current.scrollHeight;
    }
  }, [logs]);

  // Add log entry
  const addLog = (message: string, type: 'info' | 'error' | 'success' = 'info') => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs(prev => [...prev.slice(-99), { timestamp, message, type }]); // Keep last 100 logs
    console.log(`[PluginTester] ${message}`);
  };

  // Handle plugin loading
  const handleLoadPlugin = async () => {
    const urlToLoad = isUrlCustom ? customUrl.trim() : pluginUrl;
    
    if (!urlToLoad) {
      addLog('Please enter a plugin URL', 'error');
      return;
    }

    if (!pluginHostRef.current || !iframeContainerRef.current) {
      addLog('Plugin host not initialized', 'error');
      return;
    }

    setPluginStatus('loading');
    addLog(`Loading plugin from: ${urlToLoad}`, 'info');
    setCurrentPluginUrl(urlToLoad);
    
    try {
      // Use ClientPluginHost to load the plugin
      await pluginHostRef.current.loadPlugin({
        url: urlToLoad,
        height: `${pluginHeight}px`,
        allowedOrigins: ['*'] // In production, this should be more restrictive
      }, iframeContainerRef.current);
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      addLog(`Failed to load plugin: ${errorMessage}`, 'error');
      setPluginStatus('error');
      setIsPluginLoaded(false);
      setCurrentPluginUrl('');
    }
  };

  // Handle plugin unloading
  const handleUnloadPlugin = async () => {
    if (!pluginHostRef.current) {
      return;
    }
    
    try {
      await pluginHostRef.current.unloadPlugin();
      setIsPluginLoaded(false);
      setPluginStatus('idle');
      setCurrentPluginUrl('');
      addLog('Plugin unloaded successfully', 'success');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      addLog(`Failed to unload plugin: ${errorMessage}`, 'error');
    }
  };

  // Plugin communication is now handled by ClientPluginHost via event listeners

  const statusColors = {
    idle: '#6b7280',
    loading: '#f59e0b', 
    connected: '#10b981',
    error: '#ef4444'
  };

  const statusTexts = {
    idle: 'Not connected',
    loading: 'Loading...',
    connected: 'Connected',
    error: 'Error'
  };

  return (
    <div style={{ padding: '20px', fontFamily: 'system-ui', maxWidth: '1200px', margin: '0 auto' }}>
      <h1>🧪 Plugin Tester</h1>
      <p>Load and test Curia plugins with real-time API communication monitoring</p>

      {/* Plugin Configuration */}
      <div style={{ background: '#f8fafc', padding: '20px', borderRadius: '8px', marginBottom: '20px' }}>
        <h2>Plugin Configuration</h2>
        
        <div style={{ marginBottom: '15px' }}>
          <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
            Plugin URL:
          </label>
          <select 
            value={isUrlCustom ? 'custom' : pluginUrl}
            onChange={(e) => {
              if (e.target.value === 'custom') {
                setIsUrlCustom(true);
              } else {
                setIsUrlCustom(false);
                setPluginUrl(e.target.value);
              }
            }}
            style={{ width: '100%', padding: '8px', marginBottom: '10px' }}
            disabled={isPluginLoaded}
          >
            <option value="">Select a plugin URL...</option>
            <option value="http://localhost:3000?mod=standalone">Local Curia (Standalone Mode)</option>
            <option value="http://localhost:3000">Local Curia (Normal Mode)</option>
            <option value="custom">Custom URL...</option>
          </select>
          
          {isUrlCustom && (
            <input
              type="text"
              placeholder="Enter custom plugin URL..."
              value={customUrl}
              onChange={(e) => setCustomUrl(e.target.value)}
              style={{ width: '100%', padding: '8px' }}
              disabled={isPluginLoaded}
            />
          )}
        </div>

        <div style={{ marginBottom: '15px' }}>
          <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
            Plugin Height (px):
          </label>
          <input
            type="number"
            value={pluginHeight}
            onChange={(e) => setPluginHeight(parseInt(e.target.value) || 600)}
            style={{ width: '100px', padding: '8px' }}
            disabled={isPluginLoaded}
          />
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            onClick={handleLoadPlugin}
            disabled={isPluginLoaded || pluginStatus === 'loading'}
            style={{
              padding: '10px 20px',
              backgroundColor: isPluginLoaded ? '#9ca3af' : '#3b82f6',
              color: 'white',
              border: 'none',
              borderRadius: '5px',
              cursor: isPluginLoaded ? 'not-allowed' : 'pointer'
            }}
          >
            {pluginStatus === 'loading' ? 'Loading...' : 'Load Plugin'}
          </button>
          
          <button
            onClick={handleUnloadPlugin}
            disabled={!isPluginLoaded}
            style={{
              padding: '10px 20px',
              backgroundColor: !isPluginLoaded ? '#9ca3af' : '#ef4444',
              color: 'white',
              border: 'none',
              borderRadius: '5px',
              cursor: !isPluginLoaded ? 'not-allowed' : 'pointer'
            }}
          >
            Unload Plugin
          </button>
        </div>
      </div>

      {/* Plugin Status */}
      <div style={{ background: '#f0f9ff', padding: '15px', borderRadius: '8px', marginBottom: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontWeight: 'bold' }}>Status:</span>
          <span 
            style={{ 
              color: statusColors[pluginStatus],
              fontWeight: 'bold'
            }}
          >
            {statusTexts[pluginStatus]}
          </span>
          {currentPluginUrl && (
            <>
              <span style={{ margin: '0 10px' }}>•</span>
              <span style={{ fontSize: '14px', color: '#6b7280' }}>
                URL: {currentPluginUrl}
              </span>
            </>
          )}
        </div>
      </div>

      {/* Plugin Container */}
      <div style={{ background: '#ffffff', border: '2px solid #e5e7eb', borderRadius: '8px', marginBottom: '20px' }}>
        <div style={{ padding: '10px', borderBottom: '1px solid #e5e7eb', backgroundColor: '#f9fafb' }}>
          <h3 style={{ margin: 0 }}>Plugin Window</h3>
        </div>
        <div 
          ref={iframeContainerRef}
          style={{ 
            padding: '0',
            width: '100%',
            height: `${pluginHeight}px`,
            backgroundColor: '#f8fafc'
          }}
        >
          {/* Iframe will be inserted here by ClientPluginHost */}
        </div>
      </div>

      {/* Communication Logs */}
      <div style={{ background: '#1f2937', borderRadius: '8px', overflow: 'hidden' }}>
        <div style={{ padding: '15px', borderBottom: '1px solid #374151', backgroundColor: '#111827' }}>
          <h3 style={{ margin: 0, color: '#f9fafb' }}>Communication Logs</h3>
        </div>
        <div 
          ref={logsRef}
          style={{ 
            height: '300px', 
            overflowY: 'auto', 
            padding: '10px',
            backgroundColor: '#1f2937'
          }}
        >
          {logs.length === 0 ? (
            <div style={{ color: '#9ca3af', fontStyle: 'italic' }}>
              No logs yet. Load a plugin to see communication logs.
            </div>
          ) : (
            logs.map((log, index) => (
              <div 
                key={index}
                style={{ 
                  marginBottom: '5px',
                  color: log.type === 'error' ? '#fca5a5' : 
                        log.type === 'success' ? '#86efac' : '#d1d5db',
                  fontSize: '13px',
                  fontFamily: 'monospace'
                }}
              >
                [{log.timestamp}] {log.message}
              </div>
            ))
          )}
        </div>
      </div>

      {/* Instructions */}
      <div style={{ background: '#fefce8', padding: '15px', borderRadius: '8px', marginTop: '20px' }}>
        <h3>🚀 How to Test</h3>
        <ol>
          <li>Make sure your Curia app is running (e.g., <code>yarn dev</code> on port 3000)</li>
          <li>Select "Local Curia (Standalone Mode)" from the dropdown</li>
          <li>Click "Load Plugin" to embed the forum in iframe</li>
          <li>Watch the communication logs for API calls</li>
          <li>Test forum functionality and verify it works with host service APIs</li>
        </ol>
      </div>
    </div>
  );
} 