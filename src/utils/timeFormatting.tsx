/**
 * Consolidated time formatting utilities
 * Replaces scattered implementations across 7+ components
 */

'use client';

import React from 'react';

export interface TimeFormatOptions {
  style?: 'short' | 'long';
  includeSeconds?: boolean;
  maxUnit?: 'minute' | 'hour' | 'day' | 'week' | 'month' | 'year';
}

/**
 * Format relative time for past dates (e.g., "2 hours ago", "3d ago")
 * Consolidates implementations from timeUtils.tsx, metadataUtils.ts, RichCategoryHeader.tsx, etc.
 */
export function formatRelativeTime(
  date: Date | string,
  options: TimeFormatOptions = {}
): string {
  const {
    style = 'long',
    includeSeconds = true,
    maxUnit = 'year'
  } = options;

  const now = new Date();
  const targetDate = typeof date === 'string' ? new Date(date) : date;
  const diffMs = now.getTime() - targetDate.getTime();
  
  // Handle invalid dates
  if (isNaN(targetDate.getTime()) || diffMs < 0) {
    return style === 'short' ? 'now' : 'just now';
  }

  const seconds = Math.floor(diffMs / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  const weeks = Math.floor(days / 7);
  const months = Math.floor(days / 30);
  const years = Math.floor(days / 365);

  // Short format (e.g., "3m ago", "2h ago")
  if (style === 'short') {
    if (maxUnit === 'minute' && minutes >= 60) return `${hours}h ago`;
    if (maxUnit === 'hour' && hours >= 24) return `${days}d ago`;
    if (maxUnit === 'day' && days >= 7) return `${weeks}w ago`;
    
    if (years >= 1 && maxUnit !== 'month') return `${years}y ago`;
    if (months >= 1 && maxUnit !== 'week' && maxUnit !== 'day' && maxUnit !== 'hour' && maxUnit !== 'minute') return `${months}mo ago`;
    if (weeks >= 1 && maxUnit !== 'day' && maxUnit !== 'hour' && maxUnit !== 'minute') return `${weeks}w ago`;
    if (days >= 1 && maxUnit !== 'hour' && maxUnit !== 'minute') return `${days}d ago`;
    if (hours >= 1 && maxUnit !== 'minute') return `${hours}h ago`;
    if (minutes >= 1) return `${minutes}m ago`;
    if (includeSeconds && seconds >= 10) return `${seconds}s ago`;
    return 'now';
  }

  // Long format (e.g., "3 minutes ago", "2 hours ago")
  if (years >= 1 && maxUnit !== 'month') {
    return `${years} ${years === 1 ? 'year' : 'years'} ago`;
  }
  if (months >= 1 && maxUnit !== 'week' && maxUnit !== 'day' && maxUnit !== 'hour' && maxUnit !== 'minute') {
    return `${months} ${months === 1 ? 'month' : 'months'} ago`;
  }
  if (weeks >= 1 && maxUnit !== 'day' && maxUnit !== 'hour' && maxUnit !== 'minute') {
    return `${weeks} ${weeks === 1 ? 'week' : 'weeks'} ago`;
  }
  if (days >= 1 && maxUnit !== 'hour' && maxUnit !== 'minute') {
    return `${days} ${days === 1 ? 'day' : 'days'} ago`;
  }
  if (hours >= 1 && maxUnit !== 'minute') {
    return `${hours} ${hours === 1 ? 'hour' : 'hours'} ago`;
  }
  if (minutes >= 1) {
    return `${minutes} ${minutes === 1 ? 'minute' : 'minutes'} ago`;
  }
  if (includeSeconds && seconds >= 10) {
    return `${seconds} ${seconds === 1 ? 'second' : 'seconds'} ago`;
  }
  
  return 'just now';
}

/**
 * Format time remaining for future dates (e.g., "2h 30m left", "3 days left")
 * Consolidates implementations from RichCategoryHeader.tsx, BoardAccessStatus.tsx
 */
export function formatTimeRemaining(
  futureDate: Date | string,
  options: TimeFormatOptions = {}
): string {
  const {
    style = 'long',
    includeSeconds = false
  } = options;

  const now = new Date();
  const targetDate = typeof futureDate === 'string' ? new Date(futureDate) : futureDate;
  const diffMs = targetDate.getTime() - now.getTime();
  
  // Handle invalid dates or past dates
  if (isNaN(targetDate.getTime()) || diffMs <= 0) {
    return 'Expired';
  }

  const seconds = Math.floor(diffMs / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  const weeks = Math.floor(days / 7);
  const months = Math.floor(days / 30);
  const years = Math.floor(days / 365);

  // Short format (e.g., "2h 30m left", "3d left")
  if (style === 'short') {
    if (years >= 1) return `${years}y left`;
    if (months >= 1) return `${months}mo left`;
    if (weeks >= 1) return `${weeks}w left`;
    if (days >= 1) return `${days}d left`;
    if (hours >= 1) {
      const remainingMins = minutes % 60;
      return remainingMins > 0 ? `${hours}h ${remainingMins}m left` : `${hours}h left`;
    }
    if (minutes >= 1) {
      if (includeSeconds) {
        const remainingSecs = seconds % 60;
        return remainingSecs > 0 ? `${minutes}m ${remainingSecs}s left` : `${minutes}m left`;
      }
      return `${minutes}m left`;
    }
    if (includeSeconds && seconds >= 1) return `${seconds}s left`;
    return 'Expiring soon';
  }

  // Long format (e.g., "2 hours 30 minutes left", "3 days left")
  if (years >= 1) {
    return `${years} ${years === 1 ? 'year' : 'years'} left`;
  }
  if (months >= 1) {
    return `${months} ${months === 1 ? 'month' : 'months'} left`;
  }
  if (weeks >= 1) {
    return `${weeks} ${weeks === 1 ? 'week' : 'weeks'} left`;
  }
  if (days >= 1) {
    return `${days} ${days === 1 ? 'day' : 'days'} left`;
  }
  if (hours >= 1) {
    const remainingMins = minutes % 60;
    if (remainingMins > 0) {
      return `${hours} ${hours === 1 ? 'hour' : 'hours'} ${remainingMins} ${remainingMins === 1 ? 'minute' : 'minutes'} left`;
    }
    return `${hours} ${hours === 1 ? 'hour' : 'hours'} left`;
  }
  if (minutes >= 1) {
    if (includeSeconds) {
      const remainingSecs = seconds % 60;
      if (remainingSecs > 0) {
        return `${minutes} ${minutes === 1 ? 'minute' : 'minutes'} ${remainingSecs} ${remainingSecs === 1 ? 'second' : 'seconds'} left`;
      }
    }
    return `${minutes} ${minutes === 1 ? 'minute' : 'minutes'} left`;
  }
  if (includeSeconds && seconds >= 1) {
    return `${seconds} ${seconds === 1 ? 'second' : 'seconds'} left`;
  }
  
  return 'Expiring soon';
}

/**
 * Format time for user visit context (specialized for dateUtils.ts use cases)
 */
export function formatUserVisitTime(
  previousVisit: string | null,
  options: { short?: boolean; userName?: string | null } = {}
): string {
  const { short = false, userName } = options;
  const name = userName ? ` ${userName}` : '';
  
  if (!previousVisit) {
    return short ? 'First visit' : `🎉 Welcome to the community${name}!`;
  }
  
  const relativeTime = formatRelativeTime(previousVisit, { 
    style: short ? 'short' : 'long' 
  });
  
  if (short) {
    return relativeTime;
  }
  
  const lastVisit = new Date(previousVisit);
  const now = new Date();
  const diffMs = now.getTime() - lastVisit.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  
  const isLongTimeReturning = diffDays >= 7;
  
  if (isLongTimeReturning) {
    return `👋 Welcome back${name}! Last visit: ${relativeTime}`;
  }
  
  return `👋 Welcome back${name}! Last visit: ${relativeTime}`;
}

/**
 * Format absolute time with fallback to relative time
 * Useful when you want to show exact time on hover/detailed views
 */
export function formatTimeWithFallback(
  date: Date | string,
  options: TimeFormatOptions & { 
    showAbsolute?: boolean;
    locale?: string;
    dateStyle?: 'full' | 'long' | 'medium' | 'short';
    timeStyle?: 'full' | 'long' | 'medium' | 'short';
  } = {}
): string {
  const {
    showAbsolute = false,
    locale = 'en-US',
    dateStyle = 'medium',
    timeStyle = 'short',
    ...timeOptions
  } = options;

  const targetDate = typeof date === 'string' ? new Date(date) : date;
  
  if (isNaN(targetDate.getTime())) {
    return 'Invalid date';
  }

  if (showAbsolute) {
    try {
      return new Intl.DateTimeFormat(locale, { 
        dateStyle, 
        timeStyle 
      }).format(targetDate);
    } catch {
      // Fallback to ISO string if Intl formatting fails
      return targetDate.toLocaleString();
    }
  }

  return formatRelativeTime(targetDate, timeOptions);
}

/**
 * Hydration-safe React hook for time formatting
 * Prevents hydration mismatches by only calculating relative time on the client
 * Replaces the useTimeSince hook from timeUtils.tsx
 */
export function useHydrationSafeTime(
  dateString: string,
  options: TimeFormatOptions & { 
    updateInterval?: number;
    defaultText?: string;
    type?: 'relative' | 'remaining';
  } = {}
): string {
  const {
    updateInterval = 60000, // Update every minute by default
    defaultText = 'recently',
    type = 'relative',
    ...formatOptions
  } = options;

  const [timeText, setTimeText] = React.useState(defaultText);

  React.useEffect(() => {
    const calculateTime = () => {
      try {
        if (type === 'remaining') {
          return formatTimeRemaining(dateString, formatOptions);
        } else {
          return formatRelativeTime(dateString, formatOptions);
        }
      } catch {
        return defaultText;
      }
    };

    // Initial calculation
    setTimeText(calculateTime());

    // Set up interval for updates (if updateInterval > 0)
    if (updateInterval > 0) {
      const interval = setInterval(() => {
        setTimeText(calculateTime());
      }, updateInterval);

      return () => clearInterval(interval);
    }
  }, [dateString, type, updateInterval, defaultText, formatOptions]);

  return timeText;
}

/**
 * Utility for checking if a date is considered "recent" (within last 24 hours)
 */
export function isRecent(date: Date | string, thresholdHours: number = 24): boolean {
  const targetDate = typeof date === 'string' ? new Date(date) : date;
  const now = new Date();
  const diffMs = now.getTime() - targetDate.getTime();
  const diffHours = diffMs / (1000 * 60 * 60);
  
  return diffHours >= 0 && diffHours <= thresholdHours;
}

/**
 * Utility for checking if a user is returning after a long absence
 */
export function isLongTimeReturning(previousVisit: string | null, thresholdDays: number = 7): boolean {
  if (!previousVisit) return false;
  
  const lastVisit = new Date(previousVisit);
  const now = new Date();
  const diffMs = now.getTime() - lastVisit.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  
  return diffDays >= thresholdDays;
}