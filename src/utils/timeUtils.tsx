'use client';

import React from 'react';

/**
 * Custom hook for hydration-safe time formatting
 * Prevents hydration mismatches by only calculating relative time on the client
 */
export function useTimeSince(dateString: string): string {
  const [timeText, setTimeText] = React.useState('recently');

  React.useEffect(() => {
    const calculateTime = () => {
      const date = new Date(dateString);
      const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);
      let interval = seconds / 31536000;
      if (interval > 1) return Math.floor(interval) + (Math.floor(interval) === 1 ? " year" : " years") + " ago";
      interval = seconds / 2592000;
      if (interval > 1) return Math.floor(interval) + (Math.floor(interval) === 1 ? " month" : " months") + " ago";
      interval = seconds / 86400;
      if (interval > 1) return Math.floor(interval) + (Math.floor(interval) === 1 ? " day" : " days") + " ago";
      interval = seconds / 3600;
      if (interval > 1) return Math.floor(interval) + (Math.floor(interval) === 1 ? " hour" : " hours") + " ago";
      interval = seconds / 60;
      if (interval > 1) return Math.floor(interval) + (Math.floor(interval) === 1 ? " minute" : " minutes") + " ago";
      if (seconds < 10) return "just now";
      return Math.floor(seconds) + " seconds ago";
    };
    setTimeText(calculateTime());
  }, [dateString]);

  return timeText;
} 