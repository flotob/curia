import { useEffect, useCallback, useRef } from 'react';

interface KeyboardNavigationOptions {
  onShare?: () => void;
  onBookmark?: () => void;
  onComment?: () => void;
  onVote?: () => void;
  onReply?: () => void;
  onNavigateBack?: () => void;
  onFocusComment?: () => void;
  enableGlobalShortcuts?: boolean;
}

interface KeyboardNavigationReturn {
  focusableElementsRef: React.MutableRefObject<HTMLElement[]>;
  currentFocusIndex: number;
  navigateToElement: (index: number) => void;
  focusNext: () => void;
  focusPrevious: () => void;
}

export const useKeyboardNavigation = (
  options: KeyboardNavigationOptions = {}
): KeyboardNavigationReturn => {
  const {
    onShare,
    onBookmark,
    onComment,
    onVote,
    onReply,
    onNavigateBack,
    onFocusComment,
    enableGlobalShortcuts = true,
  } = options;

  const focusableElementsRef = useRef<HTMLElement[]>([]);
  const currentFocusIndexRef = useRef(0);

  // Update focusable elements list
  const updateFocusableElements = useCallback(() => {
    const focusableSelectors = [
      'button:not([disabled])',
      'a[href]:not([disabled])',
      'input:not([disabled])',
      'textarea:not([disabled])',
      'select:not([disabled])',
      '[tabindex]:not([tabindex="-1"]):not([disabled])',
      '[contenteditable="true"]',
      '[role="button"]:not([disabled])',
    ].join(', ');

    const elements = Array.from(
      document.querySelectorAll(focusableSelectors)
    ) as HTMLElement[];

    // Filter out elements that are not visible or in hidden containers
    focusableElementsRef.current = elements.filter((element) => {
      const rect = element.getBoundingClientRect();
      const style = window.getComputedStyle(element);
      return (
        rect.width > 0 &&
        rect.height > 0 &&
        style.visibility !== 'hidden' &&
        style.display !== 'none' &&
        !element.hasAttribute('aria-hidden')
      );
    });
  }, []);

  // Navigate to specific element
  const navigateToElement = useCallback((index: number) => {
    updateFocusableElements();
    const elements = focusableElementsRef.current;
    
    if (elements.length === 0) return;
    
    const validIndex = Math.max(0, Math.min(index, elements.length - 1));
    currentFocusIndexRef.current = validIndex;
    
    const element = elements[validIndex];
    if (element) {
      element.focus();
      // Scroll into view if needed
      element.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
        inline: 'nearest'
      });
    }
  }, [updateFocusableElements]);

  // Focus next element
  const focusNext = useCallback(() => {
    const newIndex = currentFocusIndexRef.current + 1;
    navigateToElement(newIndex);
  }, [navigateToElement]);

  // Focus previous element
  const focusPrevious = useCallback(() => {
    const newIndex = currentFocusIndexRef.current - 1;
    navigateToElement(newIndex);
  }, [navigateToElement]);

  // Handle keyboard shortcuts
  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    // Don't handle shortcuts when user is typing in inputs
    const activeElement = document.activeElement;
    const isTyping = activeElement && (
      activeElement.tagName === 'INPUT' ||
      activeElement.tagName === 'TEXTAREA' ||
      activeElement.getAttribute('contenteditable') === 'true'
    );

    // Global navigation shortcuts (work even when typing)
    if (event.key === 'Escape') {
      // Clear focus from current element
      if (activeElement && activeElement !== document.body) {
        (activeElement as HTMLElement).blur();
      }
      return;
    }

    // Skip other shortcuts when typing
    if (isTyping) return;

    const isMetaOrCtrl = event.metaKey || event.ctrlKey;
    const isShift = event.shiftKey;

    // Global shortcuts (only when global shortcuts are enabled)
    if (enableGlobalShortcuts) {
      // Cmd/Ctrl + shortcuts
      if (isMetaOrCtrl) {
        switch (event.key.toLowerCase()) {
          case 's':
            event.preventDefault();
            onShare?.();
            break;
          case 'b':
            event.preventDefault();
            onBookmark?.();
            break;
          case 'enter':
          case 'return':
            event.preventDefault();
            onComment?.();
            break;
        }
        return;
      }

      // Single key shortcuts
      switch (event.key.toLowerCase()) {
        case 'u':
          event.preventDefault();
          onVote?.();
          break;
        case 'r':
          event.preventDefault();
          onReply?.();
          break;
        case 'c':
          event.preventDefault();
          onFocusComment?.();
          break;
        case 'backspace':
        case 'h':
          if (event.key === 'h' || (event.key === 'Backspace' && !isShift)) {
            event.preventDefault();
            onNavigateBack?.();
          }
          break;
      }
    }

    // Tab navigation enhancement
    if (event.key === 'Tab') {
      updateFocusableElements();
      const elements = focusableElementsRef.current;
      const currentElement = document.activeElement as HTMLElement;
      const currentIndex = elements.indexOf(currentElement);
      
      if (currentIndex !== -1) {
        currentFocusIndexRef.current = currentIndex;
        
        if (isShift) {
          // Navigate backwards
          const newIndex = currentIndex > 0 ? currentIndex - 1 : elements.length - 1;
          event.preventDefault();
          navigateToElement(newIndex);
        } else {
          // Navigate forwards
          const newIndex = currentIndex < elements.length - 1 ? currentIndex + 1 : 0;
          event.preventDefault();
          navigateToElement(newIndex);
        }
      }
    }

    // Arrow key navigation for specific contexts
    if (event.key === 'ArrowDown' && event.altKey) {
      event.preventDefault();
      focusNext();
    } else if (event.key === 'ArrowUp' && event.altKey) {
      event.preventDefault();
      focusPrevious();
    }
  }, [
    enableGlobalShortcuts,
    onShare,
    onBookmark,
    onComment,
    onVote,
    onReply,
    onNavigateBack,
    onFocusComment,
    updateFocusableElements,
    navigateToElement,
    focusNext,
    focusPrevious,
  ]);

  // Set up keyboard event listeners
  useEffect(() => {
    if (!enableGlobalShortcuts) return;

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown, enableGlobalShortcuts]);

  // Update focusable elements on mount and when DOM changes
  useEffect(() => {
    updateFocusableElements();
    
    // Set up observer for DOM changes
    const observer = new MutationObserver(() => {
      updateFocusableElements();
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['disabled', 'tabindex', 'aria-hidden'],
    });

    return () => observer.disconnect();
  }, [updateFocusableElements]);

  return {
    focusableElementsRef,
    currentFocusIndex: currentFocusIndexRef.current,
    navigateToElement,
    focusNext,
    focusPrevious,
  };
};