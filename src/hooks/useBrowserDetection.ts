'use client';

import { useEffect, useState } from 'react';
import Bowser from 'bowser';

export interface BrowserInfo {
  name: string;
  version: string;
  isSafari: boolean;
  isFirefox: boolean;
  isChrome: boolean;
  isSupported: boolean; // True for browsers that support auto-forward
  platform: string;
  isCrawler: boolean;
}

export interface BrowserDetectionResult {
  browser: BrowserInfo;
  isLoading: boolean;
  error: string | null;
}

// Fallback detection for cases where Bowser might fail
const getFallbackBrowserInfo = (): Partial<BrowserInfo> => {
  if (typeof window === 'undefined') {
    return { isCrawler: true };
  }

  const userAgent = window.navigator.userAgent.toLowerCase();
  
  // Check for crawlers first
  const crawlerPatterns = [
    'bot', 'crawler', 'spider', 'scraper', 'facebookexternalhit',
    'twitterbot', 'linkedinbot', 'whatsapp', 'telegram', 'discord',
    'googlebot', 'bingbot', 'slackbot', 'applebot'
  ];
  
  const isCrawler = crawlerPatterns.some(pattern => userAgent.includes(pattern));
  
  if (isCrawler) {
    return { isCrawler: true };
  }

  // Browser detection patterns
  const isSafari = userAgent.includes('safari') && !userAgent.includes('chrome');
  const isFirefox = userAgent.includes('firefox');
  const isChrome = userAgent.includes('chrome') && !userAgent.includes('edg');

  return {
    isSafari,
    isFirefox,
    isChrome,
    isSupported: isChrome, // Only Chrome fully supports auto-forward
    isCrawler: false
  };
};

export const useBrowserDetection = (): BrowserDetectionResult => {
  const [browser, setBrowser] = useState<BrowserInfo>({
    name: 'Unknown',
    version: 'Unknown',
    isSafari: false,
    isFirefox: false,
    isChrome: false,
    isSupported: false,
    platform: 'Unknown',
    isCrawler: false
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const detectBrowser = () => {
      try {
        // Server-side or crawler detection
        if (typeof window === 'undefined') {
          setBrowser(prev => ({ ...prev, isCrawler: true }));
          setIsLoading(false);
          return;
        }

        // Try Bowser first for accurate detection
        const parser = Bowser.getParser(window.navigator.userAgent);
        const browserInfo = parser.getBrowser();
        const platformInfo = parser.getPlatform();

        // Check for crawlers
        const userAgent = window.navigator.userAgent.toLowerCase();
        const crawlerPatterns = [
          'bot', 'crawler', 'spider', 'scraper', 'facebookexternalhit',
          'twitterbot', 'linkedinbot', 'whatsapp', 'telegram', 'discord',
          'googlebot', 'bingbot', 'slackbot', 'applebot'
        ];
        
        const isCrawler = crawlerPatterns.some(pattern => userAgent.includes(pattern));

        if (isCrawler) {
          setBrowser(prev => ({ ...prev, isCrawler: true }));
          setIsLoading(false);
          return;
        }

        // Determine browser types
        const name = browserInfo.name?.toLowerCase() || '';
        const isSafari = name.includes('safari') || (parser.satisfies({
          safari: '>=1'
        }) === true);
        const isFirefox = name.includes('firefox') || (parser.satisfies({
          firefox: '>=1'
        }) === true);
        const isChrome = name.includes('chrome') || (parser.satisfies({
          chrome: '>=1'
        }) === true);

        // Browsers that support auto-forward (iframe cookie access)
        const isSupported = isChrome || (
          // Some Chromium-based browsers also work
          name.includes('chromium') ||
          name.includes('edge') ||
          name.includes('opera')
        );

        setBrowser({
          name: browserInfo.name || 'Unknown',
          version: browserInfo.version || 'Unknown',
          isSafari: isSafari && !isChrome, // Safari but not Chrome
          isFirefox,
          isChrome,
          isSupported,
          platform: platformInfo.type || 'Unknown',
          isCrawler: false
        });

      } catch (bowserError) {
        // Fallback to manual detection if Bowser fails
        console.warn('Bowser detection failed, using fallback:', bowserError);
        
        try {
          const fallbackInfo = getFallbackBrowserInfo();
          setBrowser(prev => ({
            ...prev,
            ...fallbackInfo,
            name: fallbackInfo.isSafari ? 'Safari' : 
                  fallbackInfo.isFirefox ? 'Firefox' :
                  fallbackInfo.isChrome ? 'Chrome' : 'Unknown'
          }));
        } catch (fallbackError) {
          console.error('Browser detection completely failed:', fallbackError);
          setError('Unable to detect browser');
        }
      } finally {
        setIsLoading(false);
      }
    };

    detectBrowser();
  }, []);

  return { browser, isLoading, error };
};

// Utility function for quick browser checks
export const getBrowserType = (): 'safari' | 'firefox' | 'chrome' | 'other' | 'crawler' => {
  if (typeof window === 'undefined') return 'crawler';
  
  const userAgent = window.navigator.userAgent.toLowerCase();
  
  // Check for crawlers first
  const crawlerPatterns = [
    'bot', 'crawler', 'spider', 'scraper', 'facebookexternalhit',
    'twitterbot', 'linkedinbot', 'whatsapp', 'telegram', 'discord'
  ];
  
  if (crawlerPatterns.some(pattern => userAgent.includes(pattern))) {
    return 'crawler';
  }

  if (userAgent.includes('safari') && !userAgent.includes('chrome')) {
    return 'safari';
  }
  if (userAgent.includes('firefox')) {
    return 'firefox';
  }
  if (userAgent.includes('chrome')) {
    return 'chrome';
  }
  
  return 'other';
};

// Check if browser supports auto-forward functionality
export const supportsBrowserAutoForward = (): boolean => {
  const browserType = getBrowserType();
  return browserType === 'chrome' || browserType === 'other'; // Assume other modern browsers work
}; 