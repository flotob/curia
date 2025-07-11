/**
 * Demo Page - Shows Curia Embed Script in Action
 * 
 * This demonstrates how customers will embed Curia on their sites.
 * Single test case to debug properly.
 */

'use client';

import React, { useState } from 'react';

export default function DemoPage() {
  const [showCode, setShowCode] = useState(false);
  const [embedLoaded, setEmbedLoaded] = useState(false);

  // Function to load embed script manually
  const loadEmbedScript = () => {
    if (embedLoaded) {
      console.log('[Demo] Embed already loaded, skipping');
      return;
    }

    console.log('[Demo] Loading embed script...');
    
    const script = document.createElement('script');
    script.src = '/embed.js';
    script.async = true;
    script.setAttribute('data-container', 'curia-test-embed');
    script.setAttribute('data-theme', 'light');

    // Add script to document
    document.head.appendChild(script);

    script.onload = () => {
      console.log('[Demo] Embed script loaded successfully');
      setEmbedLoaded(true);
    };

    script.onerror = () => {
      console.error('[Demo] Failed to load embed script');
    };
  };

  // Function to reset/clear the embed
  const resetEmbed = () => {
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
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-gray-900">
              Curia Embed Test
            </h1>
            <button
              onClick={() => setShowCode(!showCode)}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              {showCode ? 'Hide Code' : 'Show Embed Code'}
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* Test Controls */}
        <div className="bg-white rounded-xl shadow-sm border p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            🎮 Test Controls
          </h2>
          <div className="flex space-x-4">
            <button
              onClick={loadEmbedScript}
              disabled={embedLoaded}
              className={`px-6 py-2 rounded-lg font-medium transition-colors ${
                embedLoaded 
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
                  : 'bg-green-600 text-white hover:bg-green-700'
              }`}
            >
              {embedLoaded ? '✅ Embed Loaded' : '🚀 Load Embed'}
            </button>
            <button
              onClick={resetEmbed}
              className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
            >
              🔄 Reset
            </button>
          </div>
        </div>

        {/* Embed Test */}
        <div className="bg-white rounded-xl shadow-sm border p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            🧪 Embed Test
          </h2>
          <p className="text-gray-600 mb-6">
            Testing the embed script and iframe content.
          </p>
          
          {showCode && (
            <div className="mb-6 bg-gray-900 rounded-lg p-4 overflow-x-auto">
              <pre className="text-green-400 text-sm">
{`<!-- Basic embed test -->
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
          <div 
            id="curia-test-embed" 
            className="border border-gray-200 rounded-lg bg-gray-50 min-h-[400px]"
          >
            <div className="text-center text-gray-500 py-12">
              <div className="text-lg mb-2">🎯</div>
              <div>Click "Load Embed" to test the embed script</div>
            </div>
          </div>
        </div>

        {/* Debug Info */}
        <div className="mt-8 bg-blue-50 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-blue-900 mb-3">
            🐛 Debug Info
          </h3>
          <div className="text-blue-800 space-y-2 text-sm font-mono">
            <p><strong>Script URL:</strong> /embed.js</p>
            <p><strong>Iframe URL:</strong> /embed</p>
            <p><strong>PostMessage:</strong> curia-resize</p>
            <p><strong>Status:</strong> {embedLoaded ? '✅ Script loaded' : '⏳ Ready to load'}</p>
          </div>
        </div>

        {/* Manual Test Links */}
        <div className="mt-8 bg-yellow-50 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-yellow-900 mb-3">
            🔗 Manual Test Links
          </h3>
          <div className="space-y-2">
            <p>
              <a href="/embed" target="_blank" className="text-blue-600 hover:underline">
                Open /embed directly in new tab
              </a>
              <span className="text-gray-500 text-sm ml-2">(should show auth flow)</span>
            </p>
            <p>
              <a href="/embed.js" target="_blank" className="text-blue-600 hover:underline">
                View /embed.js source
              </a>
              <span className="text-gray-500 text-sm ml-2">(should download JS file)</span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
} 