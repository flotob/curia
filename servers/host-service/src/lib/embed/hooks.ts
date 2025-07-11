/**
 * Embed Hooks - Reusable hooks for embed functionality
 */

import { useCallback, useEffect } from 'react';

export const useIframeResize = () => {
  const sendHeightToParent = useCallback((height?: number) => {
    if (typeof window === 'undefined') return;
    
    const actualHeight = height || Math.max(
      document.body.scrollHeight,
      document.body.offsetHeight,
      document.documentElement.clientHeight,
      document.documentElement.scrollHeight,
      document.documentElement.offsetHeight
    );

    try {
      window.parent.postMessage({
        type: 'curia-resize',
        height: actualHeight
      }, '*');
    } catch (error) {
      console.warn('[Curia Embed] Could not send height to parent:', error);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => sendHeightToParent(), 100);
    
    const resizeObserver = new ResizeObserver(() => {
      sendHeightToParent();
    });

    if (document.body) {
      resizeObserver.observe(document.body);
    }

    return () => {
      clearTimeout(timer);
      resizeObserver.disconnect();
    };
  }, [sendHeightToParent]);

  return sendHeightToParent;
}; 