'use client';

import { useState, useEffect } from 'react';
import { useAtom, useAtomValue, useSetAtom } from 'jotai';
import { 
  MessageCircle, 
  X, 
  Plus, 
  Settings, 
  Users, 
  BookOpen,
  Send,
  Loader2 
} from 'lucide-react';
import {
  isChatOpenAtom,
  currentConversationAtom,
  currentMessagesAtom,
  isStreamingAtom,
  isChatLoadingAtom,
  chatErrorAtom,
  conversationsAtom,
  openChatAtom,
  closeChatAtom,
  startAdminChatAtom,
  startOnboardingQuizAtom,
  shouldShowWelcomeAtom,
  canStartNewChatAtom,
  activeConversationsCountAtom
} from '@/stores/ai-chat';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useAuth } from '@/contexts/AuthContext';

// Message component
interface MessageProps {
  message: {
    id: string;
    role: 'user' | 'assistant' | 'system';
    content: string;
    created_at: string;
  };
  isStreaming?: boolean;
}

function ChatMessage({ message, isStreaming }: MessageProps) {
  const isUser = message.role === 'user';
  const isSystem = message.role === 'system';

  if (isSystem) return null; // Don't display system messages

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-4`}>
      <div 
        className={`max-w-[80%] rounded-lg px-4 py-2 ${
          isUser 
            ? 'bg-blue-500 text-white' 
            : 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100'
        }`}
      >
        <div className="text-sm">{message.content}</div>
        {isStreaming && !isUser && (
          <div className="flex items-center mt-2">
            <Loader2 className="h-3 w-3 animate-spin mr-1" />
            <span className="text-xs opacity-70">Thinking...</span>
          </div>
        )}
      </div>
    </div>
  );
}

// Chat input component
interface ChatInputProps {
  onSendMessage: (message: string) => void;
  disabled?: boolean;
  placeholder?: string;
}

function ChatInput({ onSendMessage, disabled, placeholder = "Type your message..." }: ChatInputProps) {
  const [message, setMessage] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (message.trim() && !disabled) {
      onSendMessage(message.trim());
      setMessage('');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex gap-2 p-4 border-t">
      <Input
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        className="flex-1"
      />
      <Button 
        type="submit" 
        disabled={!message.trim() || disabled}
        size="sm"
      >
        <Send className="h-4 w-4" />
      </Button>
    </form>
  );
}

// Conversation list component
function ConversationList() {
  const conversations = useAtomValue(conversationsAtom);
  const currentConversation = useAtomValue(currentConversationAtom);
  const openChat = useSetAtom(openChatAtom);

  return (
    <div className="p-4">
      <h3 className="font-medium mb-3">Recent Conversations</h3>
      <div className="space-y-2">
        {conversations.slice(0, 5).map((conv) => (
          <button
            key={conv.id}
            onClick={() => openChat(conv.id)}
            className={`w-full text-left p-3 rounded-lg transition-colors ${
              currentConversation?.id === conv.id
                ? 'bg-blue-100 dark:bg-blue-900'
                : 'hover:bg-gray-100 dark:hover:bg-gray-800'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="font-medium truncate">{conv.title || 'Untitled Chat'}</span>
              <Badge variant={conv.status === 'active' ? 'default' : 'secondary'}>
                {conv.status}
              </Badge>
            </div>
            <div className="text-xs text-gray-500 mt-1">
              {conv.conversation_type === 'admin_assistant' ? 'Admin Assistant' : 'Onboarding Quiz'}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

// Welcome screen component
function WelcomeScreen() {
  const startAdminChat = useSetAtom(startAdminChatAtom);
  const startOnboardingQuiz = useSetAtom(startOnboardingQuizAtom);
  const { user } = useAuth();

  return (
    <div className="p-6 text-center">
      <div className="mb-6">
        <MessageCircle className="h-12 w-12 mx-auto mb-4 text-blue-500" />
        <h2 className="text-xl font-semibold mb-2">Welcome to AI Assistant</h2>
        <p className="text-gray-600 dark:text-gray-400">
          How can I help you today?
        </p>
      </div>

      <div className="space-y-3">
        {user?.isAdmin && (
          <Button 
            onClick={startAdminChat} 
            className="w-full"
            variant="default"
          >
            <Users className="h-4 w-4 mr-2" />
            Admin Assistant
          </Button>
        )}
        
        <Button 
          onClick={startOnboardingQuiz} 
          className="w-full"
          variant="outline"
        >
          <BookOpen className="h-4 w-4 mr-2" />
          Onboarding Guide
        </Button>
      </div>

      <div className="mt-6 text-xs text-gray-500">
        Choose an option above to start a conversation
      </div>
    </div>
  );
}

// Main chat widget component
export function AIChatWidget() {
  const [isOpen, setIsOpen] = useAtom(isChatOpenAtom);
  const currentConversation = useAtomValue(currentConversationAtom);
  const messages = useAtomValue(currentMessagesAtom);
  const isStreaming = useAtomValue(isStreamingAtom);
  const isLoading = useAtomValue(isChatLoadingAtom);
  const error = useAtomValue(chatErrorAtom);
  const shouldShowWelcome = useAtomValue(shouldShowWelcomeAtom);
  const canStartNewChat = useAtomValue(canStartNewChatAtom);
  const activeCount = useAtomValue(activeConversationsCountAtom);
  
  const closeChat = useSetAtom(closeChatAtom);

  // Mock send message function - in real implementation, this would call the API
  const handleSendMessage = async (message: string) => {
    console.log('Sending message:', message);
    // TODO: Implement actual API call with streaming
    // This would call the appropriate API endpoint based on conversation type
  };

  // Floating chat button when closed
  if (!isOpen) {
    return (
      <div className="fixed bottom-6 right-6 z-50">
        <Button
          onClick={() => setIsOpen(true)}
          size="lg"
          className="rounded-full h-14 w-14 shadow-lg relative"
        >
          <MessageCircle className="h-6 w-6" />
          {activeCount > 0 && (
            <Badge 
              variant="destructive" 
              className="absolute -top-2 -right-2 h-6 w-6 rounded-full p-0 flex items-center justify-center text-xs"
            >
              {activeCount}
            </Badge>
          )}
        </Button>
      </div>
    );
  }

  // Chat interface when open
  return (
    <div className="fixed bottom-6 right-6 z-50 w-96 h-[600px] bg-white dark:bg-gray-900 rounded-lg shadow-2xl border flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center gap-2">
          <MessageCircle className="h-5 w-5" />
          <h3 className="font-medium">
            {currentConversation?.title || 'AI Assistant'}
          </h3>
        </div>
        <div className="flex items-center gap-2">
          {currentConversation && (
            <Badge variant="outline">
              {currentConversation.conversation_type === 'admin_assistant' ? 'Admin' : 'Guide'}
            </Badge>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={closeChat}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 flex flex-col min-h-0">
        {error && (
          <Alert variant="destructive" className="m-4">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {shouldShowWelcome ? (
          <WelcomeScreen />
        ) : currentConversation ? (
          <>
            {/* Messages */}
            <ScrollArea className="flex-1 p-4">
              <div className="space-y-4">
                {messages.map((message) => (
                  <ChatMessage 
                    key={message.id} 
                    message={message}
                    isStreaming={isStreaming && message === messages[messages.length - 1]}
                  />
                ))}
                
                {isLoading && (
                  <div className="flex justify-center py-4">
                    <Loader2 className="h-6 w-6 animate-spin" />
                  </div>
                )}
              </div>
            </ScrollArea>

            {/* Input */}
            <ChatInput
              onSendMessage={handleSendMessage}
              disabled={isLoading || isStreaming}
              placeholder={
                currentConversation.conversation_type === 'admin_assistant'
                  ? "Ask about your community..."
                  : "Share your thoughts..."
              }
            />
          </>
        ) : (
          <div className="flex-1 flex flex-col">
            <ConversationList />
            
            <div className="p-4 border-t">
              <Button 
                className="w-full" 
                disabled={!canStartNewChat}
                onClick={() => {/* TODO: Show conversation type selector */}}
              >
                <Plus className="h-4 w-4 mr-2" />
                New Conversation
              </Button>
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
}

export default AIChatWidget;