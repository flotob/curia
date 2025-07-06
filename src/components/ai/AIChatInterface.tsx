'use client';

import React, { useRef, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, Send, Sparkles, Bot, User, X, ChevronUp, ChevronDown } from 'lucide-react';
import { useChat } from '@ai-sdk/react';
import { useGlobalSearch } from '@/contexts/GlobalSearchContext';
import { FunctionCardRenderer, isValidFunctionCardType } from './utils/FunctionCardRenderer';

interface ChatContext {
  boardId?: string;
  postId?: string;
}

interface AIChatInterfaceProps {
  context?: ChatContext;
  className?: string;
  onClose?: () => void;
}

// Simple markdown renderer for AI chat messages
function MarkdownContent({ content }: { content: string }) {
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
    // Simple approach: handle basic markdown formatting
    let processed = text;
    
    // Bold
    processed = processed.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    // Italic  
    processed = processed.replace(/\*(.*?)\*/g, '<em>$1</em>');
    // Inline code
    processed = processed.replace(/`([^`]+)`/g, '<code class="bg-muted px-1 rounded text-sm">$1</code>');
    // Links
    processed = processed.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" class="text-primary hover:underline" target="_blank" rel="noopener noreferrer">$1</a>');
    
    return <span dangerouslySetInnerHTML={{ __html: processed }} />;
  };
  
  return <div>{renderMarkdown(content)}</div>;
}



export function AIChatInterface({ context, className, onClose }: AIChatInterfaceProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [showSuggestions, setShowSuggestions] = useState(false);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const quickActions = [
    'How do I create a new post?',
    'Find recent discussions about React',
    'What is trending in this community?',
    'Help me navigate this board'
  ];

  const { openSearch } = useGlobalSearch();
  
  const { messages, input, handleInputChange, handleSubmit, isLoading, setInput } = useChat({
    api: '/api/ai/chat',
    fetch: async (url, options) => {
      // Use the app's authFetch utility which handles auth headers properly
      const { authFetch } = await import('@/utils/authFetch');
      const urlString = url instanceof Request ? url.url : url.toString();
      return authFetch(urlString, options);
    },
    body: {
      context
    }
  });

  const handleFunctionCardAction = (action: string, params?: any) => {
    switch (action) {
      case 'openPostCreator':
        openSearch({
          initialQuery: params?.initialQuery || 'Share your thoughts',
          autoExpandForm: true,
          initialTitle: params?.initialTitle
        });
        break;
      // Handle other actions as we add more function cards
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleQuickAction = (action: string) => {
    setInput(action);
    // Automatically submit the message
    setTimeout(() => {
      const form = document.querySelector('form') as HTMLFormElement;
      if (form) {
        form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
      }
    }, 100);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  return (
    <div className={`flex flex-col h-full bg-background ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b bg-background/50">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-full bg-primary flex items-center justify-center">
            <Bot className="w-3.5 h-3.5 text-primary-foreground" />
          </div>
          <div>
            <h3 className="font-semibold text-sm">Community Assistant</h3>
            <p className="text-xs text-muted-foreground">
              Navigation & content discovery
            </p>
          </div>
        </div>
        {onClose ? (
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground p-1 h-auto"
          >
            <X className="w-4 h-4" />
          </Button>
        ) : (
          <Sparkles className="w-5 h-5 text-primary" />
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-2">
        {messages.length === 0 ? (
          <div className="flex flex-col h-full">
            {/* Welcome Section - Compact */}
            <div className="text-center py-6">
              <div className="w-12 h-12 rounded-full bg-primary flex items-center justify-center mx-auto mb-3">
                <Bot className="w-6 h-6 text-primary-foreground" />
              </div>
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
          <div className="space-y-3 py-2">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex gap-2 ${
                  message.role === 'user' ? 'justify-end' : 'justify-start'
                }`}
              >
                {message.role === 'assistant' && (
                  <div className="w-7 h-7 rounded-full bg-primary flex items-center justify-center flex-shrink-0 mt-1">
                    <Bot className="w-3.5 h-3.5 text-primary-foreground" />
                  </div>
                )}
                
                <div
                  className={`max-w-[85%] rounded-lg px-3 py-2 ${
                    message.role === 'user'
                      ? 'bg-blue-600 text-white ml-auto dark:bg-blue-500 dark:text-white'
                      : 'bg-muted text-foreground'
                  }`}
                >
                  <div className={`prose prose-sm max-w-none text-sm break-words ${
                    message.role === 'user' 
                      ? 'prose-invert text-white' 
                      : 'dark:prose-invert text-foreground'
                  }`}>
                    <MarkdownContent content={message.content} />
                  </div>
                  
                  {/* Render special UI components for tool call results */}
                  {message.role === 'assistant' && (message as any).toolInvocations && (
                    <div className="mt-2">
                      {(message as any).toolInvocations.map((invocation: any, index: number) => {
                        const resultType = invocation.result?.type;
                        if (resultType && isValidFunctionCardType(resultType)) {
                          return (
                            <FunctionCardRenderer
                              key={index}
                              type={resultType}
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

                {message.role === 'user' && (
                  <div className="w-7 h-7 rounded-full bg-primary flex items-center justify-center flex-shrink-0 mt-1">
                    <User className="w-3.5 h-3.5 text-primary-foreground" />
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-3 border-t bg-background/50">
        <form onSubmit={handleSubmit} className="flex gap-2">
          <Textarea
            value={input}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            placeholder="Ask about community, posts, or navigation..."
            className="flex-1 min-h-[50px] max-h-[100px] resize-none text-sm"
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
  );
}