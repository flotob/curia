/**
 * Demo3 Page - Self-Contained Embed Script Test
 * 
 * This page tests the truly self-contained embed script that requires NO
 * parent page implementation. Customer just includes the script tag.
 * 
 * PHASE 3 VALIDATION:
 * - No ClientPluginHost imports
 * - No manual PostMessage handling
 * - No auth context management
 * - Just: <script src="/embed.js" data-community="test">
 */

'use client';

import React, { useState, useEffect } from 'react';

export default function Demo3Page() {
  const [embedLoaded, setEmbedLoaded] = useState(false);
  const [embedError, setEmbedError] = useState<string | null>(null);
  const [logs, setLogs] = useState<string[]>([]);

  // Add log entry
  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs(prev => [...prev.slice(-19), `[${timestamp}] ${message}`]); // Keep last 20 logs
    console.log(`[Demo3] ${message}`);
  };

  // Monitor console logs for embed activity
  useEffect(() => {
    const originalConsoleLog = console.log;
    console.log = (...args) => {
      originalConsoleLog(...args);
      const message = args.join(' ');
      if (message.includes('[CuriaEmbed]') || message.includes('[InternalPluginHost]')) {
        addLog(message);
      }
    };

    const originalConsoleError = console.error;
    console.error = (...args) => {
      originalConsoleError(...args);
      const message = args.join(' ');
      if (message.includes('[CuriaEmbed]') || message.includes('[InternalPluginHost]')) {
        addLog(`ERROR: ${message}`);
      }
    };

    return () => {
      console.log = originalConsoleLog;
      console.error = originalConsoleError;
    };
  }, []);

  // Load embed script
  const loadEmbedScript = () => {
    if (embedLoaded) {
      addLog('Embed already loaded');
      return;
    }

    addLog('Loading self-contained embed script...');
    
    const script = document.createElement('script');
    script.src = '/embed.js';
    script.async = true;
    script.setAttribute('data-container', 'demo3-embed-container');
    script.setAttribute('data-community', 'test-community');
    script.setAttribute('data-theme', 'light');
    script.setAttribute('data-height', '700px');

    script.onload = () => {
      addLog('✅ Embed script loaded successfully');
      addLog('🎯 Embed should now be completely self-contained');
      setEmbedLoaded(true);
    };

    script.onerror = (error) => {
      const errorMsg = 'Failed to load embed script';
      addLog(`❌ ${errorMsg}`);
      setEmbedError(errorMsg);
    };

    document.head.appendChild(script);
  };

  // Reset embed
  const resetEmbed = () => {
    // Clear container
    const container = document.getElementById('demo3-embed-container');
    if (container) {
      container.innerHTML = `
        <div style="padding: 40px; text-align: center; color: #6b7280; background: #f9fafb; border: 2px dashed #d1d5db; border-radius: 8px;">
          <div style="font-size: 24px; margin-bottom: 8px;">🎯</div>
          <div style="font-size: 16px; font-weight: 500; margin-bottom: 4px;">Phase 3 Test Ready</div>
          <div style="font-size: 14px;">Click "Load Self-Contained Embed" to test</div>
        </div>
      `;
    }

    // Clear global reference
    if (window.curiaEmbed) {
      if (window.curiaEmbed.destroy) {
        window.curiaEmbed.destroy();
      }
      delete window.curiaEmbed;
    }

    setEmbedLoaded(false);
    setEmbedError(null);
    setLogs([]);
    addLog('Demo3 reset - ready for Phase 3 test');
  };

  // Clear logs
  const clearLogs = () => {
    setLogs([]);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-teal-100 py-12 px-4">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header */}
        <div className="text-center space-y-4">
          <h1 className="text-4xl font-bold text-gray-900">
            🎯 Phase 3: Self-Contained Embed Test
          </h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Testing the truly self-contained embed script that requires <strong>zero</strong> parent page implementation.
            No ClientPluginHost imports, no PostMessage handling, no auth context management.
          </p>
        </div>

        {/* Architecture Comparison */}
        <div className="bg-white rounded-xl shadow-sm border p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            📊 Architecture Comparison
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <h3 className="font-medium text-red-600">❌ Demo (Original)</h3>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• Imports ClientPluginHost</li>
                <li>• Handles PostMessage events</li>
                <li>• Manages auth context</li>
                <li>• Switches iframe manually</li>
                <li>• Complex parent page logic</li>
              </ul>
            </div>
            <div className="space-y-2">
              <h3 className="font-medium text-green-600">✅ Demo3 (Phase 3)</h3>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• No imports needed</li>
                <li>• No PostMessage handling</li>
                <li>• No auth management</li>
                <li>• No iframe switching</li>
                <li>• Just script tag ✨</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Controls */}
        <div className="bg-white rounded-xl shadow-sm border p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            🎮 Phase 3 Test Controls
          </h2>
          <div className="space-y-4">
            <div className="flex gap-3">
              <button
                onClick={loadEmbedScript}
                disabled={embedLoaded}
                className={`px-6 py-3 rounded-lg font-medium transition-colors ${
                  embedLoaded
                    ? 'bg-green-200 text-green-800 cursor-not-allowed'
                    : 'bg-emerald-600 text-white hover:bg-emerald-700'
                }`}
              >
                {embedLoaded ? '✅ Self-Contained Embed Loaded' : '🚀 Load Self-Contained Embed'}
              </button>
              
              <button
                onClick={resetEmbed}
                className="px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium transition-colors"
              >
                🔄 Reset
              </button>
            </div>

            {embedError && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
                <strong>Error:</strong> {embedError}
              </div>
            )}

            <div className="text-sm text-gray-600">
              <strong>What to expect:</strong> The embed script should handle everything internally - 
              auth iframe loading, user authentication, forum switching, and API routing.
            </div>
          </div>
        </div>

        {/* Embed Container */}
        <div className="bg-white rounded-xl shadow-sm border p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            🧪 Self-Contained Embed Test
          </h2>
          
          <div 
            id="demo3-embed-container" 
            className="border border-gray-200 rounded-lg min-h-[700px]"
          >
            <div style={{ padding: '40px', textAlign: 'center', color: '#6b7280', background: '#f9fafb', border: '2px dashed #d1d5db', borderRadius: '8px' }}>
              <div style={{ fontSize: '24px', marginBottom: '8px' }}>🎯</div>
              <div style={{ fontSize: '16px', fontWeight: '500', marginBottom: '4px' }}>Phase 3 Test Ready</div>
              <div style={{ fontSize: '14px' }}>Click "Load Self-Contained Embed" to test</div>
            </div>
          </div>
        </div>

        {/* Logs */}
        <div className="bg-white rounded-xl shadow-sm border p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-900">
              📡 Self-Contained Embed Logs
            </h2>
            <button
              onClick={clearLogs}
              className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors"
            >
              Clear
            </button>
          </div>
          
          <div className="bg-gray-900 rounded-lg p-4 h-64 overflow-y-auto">
            {logs.length === 0 ? (
              <div className="text-gray-400 italic text-sm">
                Load the embed to see internal logs from the self-contained script...
              </div>
            ) : (
              <div className="space-y-1">
                {logs.map((log, index) => (
                  <div key={index} className="text-sm font-mono text-green-400">
                    {log}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Customer Integration Example */}
        <div className="bg-gray-900 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-white mb-4">
            📝 Customer Integration Code
          </h3>
          <pre className="text-green-400 text-sm overflow-x-auto">
{`<!-- This is ALL customers need to include -->
<div id="my-forum-container"></div>
<script 
  src="https://your-host.com/embed.js"
  data-container="my-forum-container"
  data-community="your-community"
  data-theme="light"
  data-height="700px"
  async>
</script>

<!-- NO other code needed - completely self-contained! -->`}
          </pre>
        </div>

        {/* Success Criteria */}
        <div className="bg-emerald-50 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-emerald-900 mb-3">
            ✅ Phase 3 Success Criteria
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-emerald-800">
            <div>
              <strong>Self-Contained:</strong>
              <ul className="mt-1 space-y-1">
                <li>• Auth iframe loads automatically</li>
                <li>• User authentication works</li>
                <li>• Forum switching happens internally</li>
                <li>• API routing works without parent</li>
              </ul>
            </div>
            <div>
              <strong>Customer Ready:</strong>
              <ul className="mt-1 space-y-1">
                <li>• Single script tag integration</li>
                <li>• No imports or dependencies</li>
                <li>• No PostMessage handling needed</li>
                <li>• Production-ready architecture</li>
              </ul>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}

// Global types are now defined in EmbedTypes.ts 