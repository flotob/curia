'use client';

import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';

interface GlobalSearchOptions {
  initialQuery?: string;
  autoExpandForm?: boolean;
  initialTitle?: string;
}

interface GlobalSearchContextType {
  isSearchOpen: boolean;
  openSearch: (options?: string | GlobalSearchOptions) => void;
  closeSearch: () => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  // Internal state for form expansion
  shouldAutoExpand: boolean;
  autoExpandTitle: string;
  clearAutoExpand: () => void;
}

const GlobalSearchContext = createContext<GlobalSearchContextType | undefined>(undefined);

export function GlobalSearchProvider({ children }: { children: React.ReactNode }) {
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [shouldAutoExpand, setShouldAutoExpand] = useState(false);
  const [autoExpandTitle, setAutoExpandTitle] = useState('');

  const openSearch = useCallback((options?: string | GlobalSearchOptions) => {
    // Handle backward compatibility - if string passed, treat as initialQuery
    if (typeof options === 'string') {
      setSearchQuery(options);
      setShouldAutoExpand(false);
      setAutoExpandTitle('');
    } else if (options) {
      // Handle new options object
      setSearchQuery(options.initialQuery || '');
      setShouldAutoExpand(options.autoExpandForm || false);
      setAutoExpandTitle(options.initialTitle || options.initialQuery || '');
    } else {
      // No options provided
      setSearchQuery('');
      setShouldAutoExpand(false);
      setAutoExpandTitle('');
    }
    
    setIsSearchOpen(true);
  }, []);

  const clearAutoExpand = useCallback(() => {
    setShouldAutoExpand(false);
    setAutoExpandTitle('');
  }, []);

  const closeSearch = useCallback(() => {
    setIsSearchOpen(false);
    // Don't clear query immediately - let modal handle cleanup
  }, []);

  // Global keyboard shortcut listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd+K on Mac, Ctrl+K on Windows/Linux
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        // Don't trigger if user is typing in an input/textarea
        const activeElement = document.activeElement;
        const isInputActive = activeElement && (
          activeElement.tagName === 'INPUT' ||
          activeElement.tagName === 'TEXTAREA' ||
          activeElement.getAttribute('contenteditable') === 'true'
        );

        if (!isInputActive) {
          e.preventDefault();
          openSearch();
        }
      }

      // ESC key to close search
      if (e.key === 'Escape' && isSearchOpen) {
        e.preventDefault();
        closeSearch();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isSearchOpen, openSearch, closeSearch]);

  const value: GlobalSearchContextType = {
    isSearchOpen,
    openSearch,
    closeSearch,
    searchQuery,
    setSearchQuery,
    shouldAutoExpand,
    autoExpandTitle,
    clearAutoExpand,
  };

  return (
    <GlobalSearchContext.Provider value={value}>
      {children}
    </GlobalSearchContext.Provider>
  );
}

export function useGlobalSearch() {
  const context = useContext(GlobalSearchContext);
  if (context === undefined) {
    throw new Error('useGlobalSearch must be used within a GlobalSearchProvider');
  }
  return context;
} 