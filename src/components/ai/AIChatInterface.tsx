'use client';

import React, { useRef, useEffect, useState, forwardRef, useImperativeHandle, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Loader2, Send, Sparkles, Bot, User, X, ChevronUp, ChevronDown, Trash2, Copy, Check } from 'lucide-react';
import type { Message } from '@ai-sdk/react';
import { useAuth } from '@/contexts/AuthContext';
import { useGlobalSearch } from '@/contexts/GlobalSearchContext';
import { useCgLib } from '@/contexts/CgLibContext';
import { useCommunityData } from '@/hooks/useCommunityData';
import { FunctionCardRenderer, isValidFunctionCardType } from './utils/FunctionCardRenderer';
import { LockPreviewModal } from '@/components/locks/LockPreviewModal';
import { LockWithStats } from '@/types/locks';
import { formatRelativeTime } from '@/utils/timeFormatting';

interface AIChatInterfaceProps {
  className?: string;
  onClose?: () => void;
  // Chat state passed from parent for persistence
  messages: Message[];
  input: string;
  handleInputChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  handleSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
  isLoading: boolean;
  setInput: (input: string) => void;
  onClearChat?: () => void;
}

// Ref interface to expose methods
export interface AIChatInterfaceRef {
  sendMessage: (message: string) => void;
}

// Simple markdown renderer for AI chat messages
function MarkdownContent({ content }: { content: string }) {
  const { cgInstance } = useCgLib();
  
  const renderMarkdown = (text: string) => {
    // Split by lines to handle lists and structure
    const lines = text.split('\n');
    const result: React.ReactNode[] = [];
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      
      if (line.trim() === '') {
        result.push(<br key={i} />);
        continue;
      }
      
      // Handle lists
      if (line.match(/^\s*[-*+]\s/)) {
        const content = line.replace(/^\s*[-*+]\s/, '');
        result.push(
          <div key={i} className="flex items-start gap-2 my-1">
            <span className="text-muted-foreground mt-1">•</span>
            <span>{renderInlineFormatting(content)}</span>
          </div>
        );
        continue;
      }
      
      // Handle numbered lists
      if (line.match(/^\s*\d+\.\s/)) {
        const match = line.match(/^\s*(\d+)\.\s(.*)$/);
        if (match) {
          const number = match[1];
          const content = match[2];
          result.push(
            <div key={i} className="flex items-start gap-2 my-1">
              <span className="text-muted-foreground mt-1">{number}.</span>
              <span>{renderInlineFormatting(content)}</span>
            </div>
          );
          continue;
        }
      }
      
      // Handle headings
      if (line.match(/^#+\s/)) {
        const level = line.match(/^(#+)/)?.[1].length || 1;
        const content = line.replace(/^#+\s/, '');
        const className = "font-semibold my-2";
        
        if (level === 1) {
          result.push(<h1 key={i} className={className}>{renderInlineFormatting(content)}</h1>);
        } else if (level === 2) {
          result.push(<h2 key={i} className={className}>{renderInlineFormatting(content)}</h2>);
        } else if (level === 3) {
          result.push(<h3 key={i} className={className}>{renderInlineFormatting(content)}</h3>);
        } else {
          result.push(<h4 key={i} className={className}>{renderInlineFormatting(content)}</h4>);
        }
        continue;
      }
      
      // Regular paragraph
      result.push(
        <p key={i} className="my-1">
          {renderInlineFormatting(line)}
        </p>
      );
    }
    
    return result;
  };
  
  const renderInlineFormatting = (text: string): React.ReactNode => {
    // Parse links manually to implement clean link policy
    const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
    const parts: React.ReactNode[] = [];
    let lastIndex = 0;
    let match;
    let keyCounter = 0;
    
    while ((match = linkRegex.exec(text)) !== null) {
      const [fullMatch, linkText, url] = match;
      const matchStart = match.index;
      
      // Add text before the link
      if (matchStart > lastIndex) {
        const beforeText = text.slice(lastIndex, matchStart);
        parts.push(
          <span 
            key={`text-before-${keyCounter}`}
            dangerouslySetInnerHTML={{ __html: processNonLinkText(beforeText) }}
          />
        );
        keyCounter++;
      }
      
      // Implement clean link policy
      if (url.startsWith('/') || url.startsWith('./') || url.startsWith('../') || 
          url.includes('/board/') || url.includes('/c/') || url.includes('/locks') ||
          url.startsWith('#') || url === '' || url.startsWith('https://yourcommunityurl')) {
        // Block internal links - show just the text
        parts.push(<span key={`internal-link-${matchStart}`}>{linkText}</span>);
      } else if (url.startsWith('http://') || url.startsWith('https://')) {
        // Allow external links with CG navigation
        parts.push(
          <a
            key={`external-link-${matchStart}`}
            href="#"
            className="text-primary hover:underline cursor-pointer"
            onClick={(e) => {
              e.preventDefault();
              if (cgInstance?.navigate) {
                console.log('[MarkdownContent] Navigating to external URL:', url);
                cgInstance.navigate(url);
              } else {
                console.log('[MarkdownContent] CG navigation not available, using window.open for:', url);
                window.open(url, '_blank', 'noopener,noreferrer');
              }
            }}
          >
            {linkText}
          </a>
        );
      } else {
        // For anything else, just show the text
        parts.push(<span key={`other-link-${matchStart}`}>{linkText}</span>);
      }
      
      lastIndex = match.index + fullMatch.length;
    }
    
    // Add remaining text after last link
    if (lastIndex < text.length) {
      const remainingText = text.slice(lastIndex);
      parts.push(
        <span 
          key={`text-after-${keyCounter}`}
          dangerouslySetInnerHTML={{ __html: processNonLinkText(remainingText) }}
        />
      );
    }
    
    return <>{parts}</>;
  };
  
  // Helper function to process non-link markdown formatting
  const processNonLinkText = (text: string): string => {
    let processed = text;
    
    // Bold
    processed = processed.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    // Italic  
    processed = processed.replace(/\*(.*?)\*/g, '<em>$1</em>');
    // Inline code
    processed = processed.replace(/`([^`]+)`/g, '<code class="bg-muted px-1 rounded text-sm">$1</code>');
    
    return processed;
  };
  
  return <div>{renderMarkdown(content)}</div>;
}

export const AIChatInterface = forwardRef<AIChatInterfaceRef, AIChatInterfaceProps>(
  ({ className, onClose, messages, input, handleInputChange, handleSubmit, isLoading, setInput, onClearChat }, ref) => {
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const messagesContainerRef = useRef<HTMLDivElement>(null);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [userHasScrolled, setUserHasScrolled] = useState(false);
    const [lastAssistantMessageId, setLastAssistantMessageId] = useState<string | null>(null);
    const [hasScrolledToNewResponse, setHasScrolledToNewResponse] = useState(false);
    const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null);
    const { user } = useAuth();
    const { cgInstance } = useCgLib();
    const { data: communityData } = useCommunityData();
    const formRef = useRef<HTMLFormElement>(null);

    // Lock preview modal state
    const [selectedLock, setSelectedLock] = useState<LockWithStats | null>(null);
    const [isLockModalOpen, setIsLockModalOpen] = useState(false);

    // Copy to clipboard function
    const copyMessageToClipboard = async (content: string, messageId: string) => {
      try {
        if (navigator.clipboard && window.isSecureContext) {
          await navigator.clipboard.writeText(content);
        } else {
          // Fallback for older browsers or non-secure contexts
          const textArea = document.createElement('textarea');
          textArea.value = content;
          textArea.style.position = 'fixed';
          textArea.style.left = '-999999px';
          textArea.style.top = '-999999px';
          document.body.appendChild(textArea);
          textArea.focus();
          textArea.select();
          document.execCommand('copy');
          textArea.remove();
        }
        
        setCopiedMessageId(messageId);
        // Reset the copied state after 2 seconds
        setTimeout(() => setCopiedMessageId(null), 2000);
      } catch (err) {
        console.error('Failed to copy message:', err);
      }
    };

    // Simple, robust scroll behavior - only scroll when user is genuinely at bottom
    const scrollToBottom = useCallback((force = false) => {
      if (!messagesContainerRef.current) return;
      
      const container = messagesContainerRef.current;
      const scrollTop = container.scrollTop;
      const scrollHeight = container.scrollHeight;
      const clientHeight = container.clientHeight;
      const distanceFromBottom = scrollHeight - scrollTop - clientHeight;
      
      // Only auto-scroll in two cases:
      // 1. Force mode (user sent a message) - always scroll
      // 2. User is genuinely at bottom (≤2px) AND hasn't manually scrolled away
      if (force || (distanceFromBottom <= 2 && !userHasScrolled)) {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        if (force) {
          setUserHasScrolled(false); // Reset tracking on user actions
        }
      }
    }, [userHasScrolled]);

    // Scroll to a specific message (for new assistant responses)
    const scrollToMessage = useCallback((messageId: string) => {
      const messageElement = document.querySelector(`[data-message-id="${messageId}"]`);
      if (messageElement && messagesContainerRef.current) {
        messageElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
        setUserHasScrolled(false); // Reset tracking since this is an automatic scroll
      }
    }, []);

    // Track user scroll behavior - very conservative
    const handleScroll = () => {
      if (!messagesContainerRef.current) return;
      
      const container = messagesContainerRef.current;
      const scrollTop = container.scrollTop;
      const scrollHeight = container.scrollHeight;
      const clientHeight = container.clientHeight;
      const distanceFromBottom = scrollHeight - scrollTop - clientHeight;
      
      if (distanceFromBottom <= 2) {
        // User is genuinely at bottom - allow auto-scroll
        setUserHasScrolled(false);
      } else if (distanceFromBottom > 50) {
        // User has scrolled significantly away - disable auto-scroll
        setUserHasScrolled(true);
      }
      // Don't change state for middle zone (2-50px) to avoid flip-flopping
    };

    // Dynamic suggestions based on community name
    const communityName = communityData?.name || 'this community';
    const quickActions = [
      'How do I create a new post?',
      `Find recent discussions about ${communityName}`,
      'What is trending in this community?',
      'Help me navigate this board'
    ];

    const { openSearch } = useGlobalSearch();
    
    // Simple submit function that can be called programmatically
    const submitForm = () => {
      if (formRef.current) {
        const event = new Event('submit', { bubbles: true, cancelable: true });
        formRef.current.dispatchEvent(event);
      }
    };
    
    // Expose sendMessage method via ref
    useImperativeHandle(ref, () => ({
      sendMessage: (message: string) => {
        setInput(message);
        // Trigger form submission after setting input
        setTimeout(() => {
          submitForm();
        }, 100);
      }
    }), [setInput]);

    // Wrapper for handleSubmit to force scroll on form submission
    const handleFormSubmit = (e: React.FormEvent<HTMLFormElement>) => {
      handleSubmit(e);
      // Force scroll to bottom when user submits a message
      setTimeout(() => scrollToBottom(true), 100);
    };

    const handleFunctionCardAction = (action: string, params?: any) => {
      switch (action) {
        case 'openPostCreator':
          openSearch({
            initialQuery: params?.initialQuery || 'Share your thoughts',
            autoExpandForm: true,
            initialTitle: params?.initialTitle
          });
          break;
        case 'openLockPreview':
          // Handle lock preview modal opening
          if (params?.lockData) {
            // Convert the lock search result to LockWithStats format
            const lockData = params.lockData;
            const lockWithStats: LockWithStats = {
              id: lockData.id,
              name: lockData.name,
              description: lockData.description,
              icon: lockData.icon,
              color: lockData.color,
              gatingConfig: lockData.gatingConfig,
              creatorUserId: '', // Not needed for preview
              communityId: '', // Not needed for preview
              isTemplate: lockData.isTemplate,
              isPublic: true, // Since we only search public locks
              tags: lockData.tags,
              usageCount: lockData.usageCount,
              successRate: lockData.successRate / 100, // Convert back to 0-1 range
              avgVerificationTime: lockData.avgVerificationTime * 60, // Convert back to seconds
              createdAt: lockData.createdAt,
              updatedAt: lockData.createdAt,
              // Additional fields for preview (use available data)
              postsUsingLock: lockData.postsUsingLock || 0,
              isOwned: false,
              canEdit: false,
              canDelete: false
            };
            setSelectedLock(lockWithStats);
            setIsLockModalOpen(true);
            console.log(`[AIChatInterface] Opening lock preview for: ${lockData.name}`);
          }
          break;
        case 'navigateToPost':
          console.log('[AIChatInterface] Post navigation:', params);
          // Additional tracking/analytics if needed
          break;
        // Handle other actions as we add more function cards
      }
    };

    const handleCloseLockModal = () => {
      setIsLockModalOpen(false);
      setSelectedLock(null);
    };

    useEffect(() => {
      // Check for new assistant messages and scroll to them with delay
      const latestAssistantMessage = [...messages]
        .reverse()
        .find(msg => msg.role === 'assistant');
      
      if (latestAssistantMessage && latestAssistantMessage.id !== lastAssistantMessageId && !hasScrolledToNewResponse) {
        // New assistant message detected - scroll to it after a short delay
        setLastAssistantMessageId(latestAssistantMessage.id);
        setHasScrolledToNewResponse(true);
        
        // Wait 500ms to let some content appear, then scroll to the message
        setTimeout(() => {
          scrollToMessage(latestAssistantMessage.id);
        }, 500);
        
        return; // Don't do normal scroll behavior for new assistant messages
      }
      
      // Reset the scroll flag when loading stops (response complete)
      if (!isLoading && hasScrolledToNewResponse) {
        setHasScrolledToNewResponse(false);
      }
      
      // Normal scroll behavior for other cases (user at bottom following conversation)
      scrollToBottom();
    }, [messages, isLoading, lastAssistantMessageId, hasScrolledToNewResponse, scrollToBottom, scrollToMessage]);

    const handleQuickAction = (action: string) => {
      setInput(action);
      // Automatically submit the message and force scroll to bottom for new interactions
      setTimeout(() => {
        submitForm();
        scrollToBottom(true); // Force scroll for new user interactions
      }, 100);
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        submitForm();
        // Force scroll to bottom when user sends a message
        setTimeout(() => scrollToBottom(true), 100);
      }
    };

    return (
      <>
        <div className={`flex flex-col h-full bg-background ${className}`}>
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b bg-background/50">
            <div className="flex items-center gap-2">
              <Avatar className="w-7 h-7">
                <AvatarImage src="/clippy-icon.webp" alt="Clippy Assistant" />
                <AvatarFallback>
                  <Bot className="w-3.5 h-3.5" />
                </AvatarFallback>
              </Avatar>
              <div>
                <h3 className="font-semibold text-sm">Community Assistant</h3>
                <p 
                  onClick={async () => {
                    const clippyUrl = "https://skfb.ly/ousxv";
                    
                    if (!cgInstance) {
                      // Fallback to regular window.open when not in Common Ground context
                      window.open(clippyUrl, '_blank', 'noopener,noreferrer');
                      return;
                    }

                    try {
                      console.log('[ClippyAttribution] Navigating to Clippy model via Common Ground:', clippyUrl);
                      await cgInstance.navigate(clippyUrl);
                    } catch (error) {
                      console.error('[ClippyAttribution] Common Ground navigation failed:', error);
                      // Fallback to regular window.open
                      window.open(clippyUrl, '_blank', 'noopener,noreferrer');
                    }
                  }}
                  className="text-xs text-muted-foreground hover:text-foreground opacity-60 hover:opacity-100 transition-opacity cursor-pointer"
                  title="Clippy 3D Model Attribution"
                >
                  &quot;Clippy&quot; by ironflower (CC BY-NC-SA)
                </p>
              </div>
            </div>
            {onClose ? (
              <div className="flex items-center gap-1">
                {/* Clear chat button - only show when there are messages */}
                {messages.length > 0 && onClearChat && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={onClearChat}
                    className="text-muted-foreground hover:text-foreground p-1 h-auto"
                    title="Clear chat history"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onClose}
                  className="text-muted-foreground hover:text-foreground p-1 h-auto"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            ) : (
              <Sparkles className="w-5 h-5 text-primary" />
            )}
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-4 py-2" ref={messagesContainerRef} onScroll={handleScroll}>
            {messages.length === 0 ? (
              <div className="flex flex-col h-full">
                {/* Welcome Section - Compact */}
                <div className="text-center py-6">
                  <Avatar className="w-12 h-12 mx-auto mb-3">
                    <AvatarImage src="/clippy-icon.webp" alt="Clippy Assistant" />
                    <AvatarFallback>
                      <Bot className="w-6 h-6" />
                    </AvatarFallback>
                  </Avatar>
                  <h4 className="font-semibold mb-1">Community Assistant</h4>
                  <p className="text-sm text-muted-foreground">
                    Navigate, find discussions, and discover content
                  </p>
                </div>
                
                {/* Quick Actions - Horizontal Pills */}
                <div className="flex-1 flex flex-col justify-center px-2">
                  <p className="text-xs text-muted-foreground mb-3 text-center">
                    Try asking:
                  </p>
                  <div className="flex flex-wrap gap-2 justify-center">
                    {quickActions.map((action, index) => (
                      <Button
                        key={index}
                        variant="outline"
                        size="sm"
                        onClick={() => handleQuickAction(action)}
                        className="text-xs px-3 py-1 h-auto rounded-full border-primary/20 hover:border-primary/40"
                      >
                        {action}
                      </Button>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-4 py-2">
                {messages.map((message) => (
                  <div
                    key={message.id}
                    data-message-id={message.id}
                    className={`flex gap-2 group ${
                      message.role === 'user' ? 'justify-end' : 'justify-start'
                    }`}
                  >
                    {message.role === 'assistant' && (
                      <Avatar className="w-7 h-7 flex-shrink-0 mt-1">
                        <AvatarImage src="/clippy-icon.webp" alt="Clippy Assistant" />
                        <AvatarFallback>
                          <Bot className="w-3.5 h-3.5" />
                        </AvatarFallback>
                      </Avatar>
                    )}
                    
                    <div className="max-w-[85%] flex flex-col">
                      {/* Message Content */}
                      <div
                        className={`rounded-lg px-3 py-2 ${
                          message.role === 'user'
                            ? 'bg-blue-600 text-white ml-auto dark:bg-blue-500 dark:text-white'
                            : 'bg-muted text-foreground'
                        }`}
                      >
                        <div className={`prose prose-sm max-w-none text-base break-words ${
                          message.role === 'user' 
                            ? 'prose-invert text-white' 
                            : 'dark:prose-invert text-foreground'
                        }`}>
                          {/* Hide AI message content when function call UI cards exist, but show it for text_only mode */}
                          {message.role === 'assistant' && (message as any).toolInvocations ? (
                            (() => {
                              // Check if any tool invocation has displayMode: 'text_only'
                              const hasTextOnlyMode = (message as any).toolInvocations.some(
                                (inv: any) => inv.result?.displayMode === 'text_only'
                              );
                              
                              if (hasTextOnlyMode) {
                                // Show AI content when text_only mode is requested
                                return <MarkdownContent content={message.content} />;
                              } else {
                                // Hide AI content when UI cards provide the value
                                return (
                                  <div className="text-xs text-muted-foreground italic">
                                    {/* Just show a minimal indicator that AI processed the request */}
                                  </div>
                                );
                              }
                            })()
                          ) : (
                            <MarkdownContent content={message.content} />
                          )}
                        </div>
                        
                        {/* Render special UI components for tool call results (respecting displayMode) */}
                        {message.role === 'assistant' && (message as any).toolInvocations && (
                          <div className="mt-2">
                            {(message as any).toolInvocations.map((invocation: any, index: number) => {
                              const resultType = invocation.result?.type;
                              const displayMode = invocation.result?.displayMode;
                              
                              // Skip UI card rendering if displayMode is 'text_only'
                              if (displayMode === 'text_only') {
                                return null;
                              }
                              
                              if (resultType && isValidFunctionCardType(resultType)) {
                                return (
                                  <FunctionCardRenderer
                                    key={index}
                                    data={invocation.result}
                                    onAction={handleFunctionCardAction}
                                  />
                                );
                              }
                              return null;
                            })}
                          </div>
                        )}
                      </div>
                      
                      {/* Message Footer */}
                      <div className={`flex items-center gap-3 text-xs text-muted-foreground mt-1 px-1 h-5 ${
                        message.role === 'user' 
                          ? 'justify-end opacity-0 group-hover:opacity-100 transition-opacity duration-200' 
                          : 'justify-start opacity-30 group-hover:opacity-100 transition-opacity duration-200'
                      } ${message.role === 'user' ? '[@media(hover:none)]:opacity-30' : '[@media(hover:none)]:opacity-30'}`}>
                        
                        {/* Timestamp */}
                        <span className="text-xs">
                          {formatRelativeTime(message.createdAt || new Date(), { style: 'short' })}
                        </span>
                        
                        {/* Copy Button */}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => copyMessageToClipboard(message.content, message.id)}
                          className={`
                            h-4 w-4 p-0 rounded-full transition-all duration-200
                            hover:bg-background/80 hover:shadow-sm
                            text-muted-foreground hover:text-foreground
                            ${message.role === 'user' 
                              ? 'hover:bg-white/20 hover:text-white' 
                              : 'hover:bg-muted/80'
                            }
                          `}
                          title="Copy message"
                        >
                          {copiedMessageId === message.id ? (
                            <Check className="w-2.5 h-2.5" />
                          ) : (
                            <Copy className="w-2.5 h-2.5" />
                          )}
                        </Button>
                      </div>
                    </div>

                    {message.role === 'user' && (
                      <Avatar className="w-7 h-7 flex-shrink-0 mt-1">
                        <AvatarImage src={user?.picture || undefined} alt={user?.name || 'User'} />
                        <AvatarFallback>
                          <User className="w-3.5 h-3.5" />
                        </AvatarFallback>
                      </Avatar>
                    )}
                  </div>
                ))}
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="border-t bg-background/50">
            <div className="p-3">
              <form onSubmit={handleFormSubmit} ref={formRef} className="flex gap-2">
                <Textarea
                  value={input}
                  onChange={handleInputChange}
                  onKeyDown={handleKeyDown}
                  placeholder="Ask about community, posts, or navigation..."
                  className="flex-1 min-h-[50px] max-h-[100px] resize-none text-base"
                  disabled={isLoading}
                />
                <Button
                  type="submit"
                  disabled={!input.trim() || isLoading}
                  className="px-3 self-end"
                  size="sm"
                >
                  {isLoading ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Send className="w-3.5 h-3.5" />
                  )}
                </Button>
              </form>
              
              {messages.length > 0 && (
                <div className="mt-2">
                  {/* Suggestions Toggle */}
                  <div className="flex items-center justify-center mb-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowSuggestions(!showSuggestions)}
                      className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
                    >
                      {showSuggestions ? (
                        <>Hide suggestions <ChevronUp className="w-3 h-3" /></>
                      ) : (
                        <>Show suggestions <ChevronDown className="w-3 h-3" /></>
                      )}
                    </Button>
                  </div>
                  
                  {/* Collapsible Suggestions */}
                  {showSuggestions && (
                    <div className="flex flex-wrap gap-1 justify-center">
                      {quickActions.map((action, index) => (
                        <Button
                          key={index}
                          variant="ghost"
                          size="sm"
                          onClick={() => handleQuickAction(action)}
                          disabled={isLoading}
                          className="text-xs px-2 py-1 h-auto rounded-full hover:bg-muted/50"
                        >
                          {action}
                        </Button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

          </div>
        </div>
        
        {/* Lock Preview Modal */}
        <LockPreviewModal
          lock={selectedLock}
          isOpen={isLockModalOpen}
          onClose={handleCloseLockModal}
          // No edit/duplicate/delete actions in preview context
        />
      </>
    );
  }
);

AIChatInterface.displayName = 'AIChatInterface';