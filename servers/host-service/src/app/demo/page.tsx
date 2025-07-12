/**
 * Demo - Full Screen Forum Experience
 * 
 * This page shows the forum embed in full-screen mode with a subtle top bar.
 */

'use client';

import { useEffect } from 'react';
import { ArrowLeft } from 'lucide-react';

export default function DemoPage() {
  useEffect(() => {
    // Load the embed script for full-screen experience
    const script = document.createElement('script');
    script.src = '/embed.js';
    script.async = true;
    script.setAttribute('data-container', 'curia-forum');
    script.setAttribute('data-community', 'test-community');
    script.setAttribute('data-theme', 'auto');
    script.setAttribute('data-width', '100%');
    script.setAttribute('data-height', '100%');
    
    document.head.appendChild(script);

    // Cleanup on unmount
    return () => {
      if (script.parentNode) {
        script.parentNode.removeChild(script);
      }
      
      // Clean up global reference
      if (window.curiaEmbed) {
        if (window.curiaEmbed.destroy) {
          window.curiaEmbed.destroy();
        }
        delete window.curiaEmbed;
      }
    };
  }, []);

  const handleBack = () => {
    window.location.href = '/';
  };

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* Subtle Top Bar */}
      <div className="bg-white border-b border-gray-200 px-4 py-3 flex items-center shadow-sm">
        <button
          onClick={handleBack}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors duration-200 font-medium"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Home
        </button>
        
        <div className="ml-auto text-sm text-gray-500">
          Full Page Demo
        </div>
      </div>

      {/* Full Screen Embed Container */}
      <div className="flex-1 bg-white">
        <div id="curia-forum" className="w-full h-full"></div>
      </div>
    </div>
  );
} 