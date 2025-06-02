'use client';

import { Toaster } from 'sonner';
import { useEffect, useState } from 'react';

export function ResponsiveToaster() {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkIsMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    // Check on mount
    checkIsMobile();

    // Listen for resize events
    window.addEventListener('resize', checkIsMobile);
    return () => window.removeEventListener('resize', checkIsMobile);
  }, []);

  return (
    <Toaster 
      position={isMobile ? "top-center" : "top-right"}
      toastOptions={{
        duration: 5000,
        style: {
          margin: isMobile ? '0 1rem' : '0',
        },
      }}
      className={isMobile ? "!top-4" : "!top-4 !right-4"}
    />
  );
} 