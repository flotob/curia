'use client';

import React, { useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, Send, Sparkles, Bot, User } from 'lucide-react';
import { useChat } from '@ai-sdk/react';

interface ChatContext {
  boardId?: string;
  postId?: string;
}

interface AIChatInterfaceProps {
  context?: ChatContext;
  className?: string;
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

export function AIChatInterface({ context, className }: AIChatInterfaceProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const quickActions = [
    'How do I create a new post?',
    'Find recent discussions about React',
    'What&apos;s trending in this community?',
    'Help me navigate this board'
  ];

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

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleQuickAction = (action: string) => {
    setInput(action);
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
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center">
            <Bot className="w-4 h-4 text-primary-foreground" />
          </div>
          <div>
            <h3 className="font-semibold">AI Writing Assistant</h3>
            <p className="text-sm text-muted-foreground">
              Help with content, structure, and style
            </p>
          </div>
        </div>
        <Sparkles className="w-5 h-5 text-primary" />
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-primary flex items-center justify-center">
              <Bot className="w-8 h-8 text-primary-foreground" />
            </div>
            <div>
              <h4 className="font-semibold mb-2">Community Assistant</h4>
              <p className="text-sm text-muted-foreground mb-4">
                I can help you navigate the community, find relevant discussions, and discover trending content.
              </p>
              <div className="grid grid-cols-1 gap-2 max-w-sm">
                {quickActions.map((action, index) => (
                  <Button
                    key={index}
                    variant="outline"
                    size="sm"
                    onClick={() => handleQuickAction(action)}
                    className="text-left justify-start h-auto py-2 px-3"
                  >
                    {action}
                  </Button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex gap-3 ${
                  message.role === 'user' ? 'justify-end' : 'justify-start'
                }`}
              >
                {message.role === 'assistant' && (
                  <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
                    <Bot className="w-4 h-4 text-primary-foreground" />
                  </div>
                )}
                
                <div
                  className={`max-w-[80%] rounded-lg px-4 py-2 ${
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
                  
                  {/* Hide tool invocations - users see the human-readable AI response instead */}
                </div>

                {message.role === 'user' && (
                  <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
                    <User className="w-4 h-4 text-primary-foreground" />
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-4 border-t">
        <form onSubmit={handleSubmit} className="flex gap-2">
          <Textarea
            value={input}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            placeholder="Ask me anything about the community, finding posts, or navigating the forum..."
            className="flex-1 min-h-[60px] max-h-[120px] resize-none"
            disabled={isLoading}
          />
          <Button
            type="submit"
            disabled={!input.trim() || isLoading}
            className="px-3"
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </Button>
        </form>
        
        {messages.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-3">
            {quickActions.map((action, index) => (
              <Button
                key={index}
                variant="ghost"
                size="sm"
                onClick={() => handleQuickAction(action)}
                disabled={isLoading}
                className="text-xs"
              >
                {action}
              </Button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}