/**
 * Demo4 - Real Customer Deployment Simulation
 * 
 * This page simulates exactly what a customer would deploy on their website.
 * No fancy UI, no logging, no controls - just the embed script as intended.
 */

'use client';

import { useEffect } from 'react';

export default function Demo4Page() {
  useEffect(() => {
    // Load the embed script exactly as a customer would
    const script = document.createElement('script');
    script.src = '/embed.js';
    script.async = true;
    script.setAttribute('data-container', 'curia-forum');
    script.setAttribute('data-community', 'test-community');
    script.setAttribute('data-theme', 'light');
    script.setAttribute('data-height', '700px');
    
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

  return (
    <div style={{ 
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      maxWidth: '1200px',
      margin: '0 auto',
      padding: '20px'
    }}>
      <h1 style={{ 
        fontSize: '24px', 
        marginBottom: '8px', 
        color: '#1f2937' 
      }}>
        My Company Forum
      </h1>
      
      <p style={{ 
        fontSize: '16px', 
        marginBottom: '24px', 
        color: '#6b7280' 
      }}>
        Welcome to our community discussion forum. Join the conversation below.
      </p>

      {/* This is exactly what customers would include */}
      <div id="curia-forum"></div>
      
      <footer style={{ 
        marginTop: '40px', 
        padding: '20px 0', 
        borderTop: '1px solid #e5e7eb', 
        fontSize: '14px', 
        color: '#9ca3af',
        textAlign: 'center' as const
      }}>
        © 2025 My Company. Powered by Curia Forums.
      </footer>
    </div>
  );
} 