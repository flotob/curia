import { atom } from 'jotai';
import { atomWithStorage } from 'jotai/utils';
import { 
  AIConversation, 
  AIMessage, 
  ChatUIState, 
  ChatPreferences,
  ListConversationsResponse 
} from '@/types/ai-chat';

// UI State Atoms
export const isChatOpenAtom = atom<boolean>(false);
export const currentConversationIdAtom = atom<string | undefined>(undefined);
export const isChatLoadingAtom = atom<boolean>(false);
export const isStreamingAtom = atom<boolean>(false);
export const chatErrorAtom = atom<string | undefined>(undefined);

// Data Atoms
export const conversationsAtom = atom<AIConversation[]>([]);
export const messagesMapAtom = atom<Record<string, AIMessage[]>>({});

// Current conversation messages (derived atom)
export const currentMessagesAtom = atom<AIMessage[]>((get) => {
  const currentId = get(currentConversationIdAtom);
  const messagesMap = get(messagesMapAtom);
  return currentId ? messagesMap[currentId] || [] : [];
});

// Current conversation (derived atom)
export const currentConversationAtom = atom<AIConversation | undefined>((get) => {
  const currentId = get(currentConversationIdAtom);
  const conversations = get(conversationsAtom);
  return conversations.find(conv => conv.id === currentId);
});

// Chat preferences (persisted)
export const chatPreferencesAtom = atomWithStorage<ChatPreferences>('ai-chat-preferences', {
  theme: 'auto',
  sounds_enabled: true,
  auto_scroll: true,
  show_timestamps: false,
});

// Combined UI state (derived atom)
export const chatUIStateAtom = atom<ChatUIState>((get) => ({
  isOpen: get(isChatOpenAtom),
  currentConversationId: get(currentConversationIdAtom),
  conversations: get(conversationsAtom),
  messages: get(messagesMapAtom),
  isLoading: get(isChatLoadingAtom),
  isStreaming: get(isStreamingAtom),
  error: get(chatErrorAtom),
}));

// Active conversations count (derived atom)
export const activeConversationsCountAtom = atom<number>((get) => {
  const conversations = get(conversationsAtom);
  return conversations.filter(conv => conv.status === 'active').length;
});

// Has unread messages (derived atom)
export const hasUnreadMessagesAtom = atom<boolean>((get) => {
  const conversations = get(conversationsAtom);
  // This would need to be enhanced with actual unread tracking
  return conversations.some(conv => conv.status === 'active');
});

// Actions
export const openChatAtom = atom(
  null,
  (get, set, conversationId?: string) => {
    set(isChatOpenAtom, true);
    if (conversationId) {
      set(currentConversationIdAtom, conversationId);
    }
  }
);

export const closeChatAtom = atom(
  null,
  (get, set) => {
    set(isChatOpenAtom, false);
    set(isStreamingAtom, false);
    set(chatErrorAtom, undefined);
  }
);

export const setCurrentConversationAtom = atom(
  null,
  (get, set, conversationId: string | undefined) => {
    set(currentConversationIdAtom, conversationId);
    set(chatErrorAtom, undefined);
  }
);

export const addConversationAtom = atom(
  null,
  (get, set, conversation: AIConversation) => {
    const conversations = get(conversationsAtom);
    const updatedConversations = [conversation, ...conversations];
    set(conversationsAtom, updatedConversations);
  }
);

export const updateConversationAtom = atom(
  null,
  (get, set, updatedConversation: AIConversation) => {
    const conversations = get(conversationsAtom);
    const updatedConversations = conversations.map(conv => 
      conv.id === updatedConversation.id ? updatedConversation : conv
    );
    set(conversationsAtom, updatedConversations);
  }
);

export const addMessageAtom = atom(
  null,
  (get, set, message: AIMessage) => {
    const messagesMap = get(messagesMapAtom);
    const conversationMessages = messagesMap[message.conversation_id] || [];
    const updatedMessages = [...conversationMessages, message];
    
    set(messagesMapAtom, {
      ...messagesMap,
      [message.conversation_id]: updatedMessages,
    });
  }
);

export const updateMessageAtom = atom(
  null,
  (get, set, updatedMessage: AIMessage) => {
    const messagesMap = get(messagesMapAtom);
    const conversationMessages = messagesMap[updatedMessage.conversation_id] || [];
    const updatedMessages = conversationMessages.map(msg => 
      msg.id === updatedMessage.id ? updatedMessage : msg
    );
    
    set(messagesMapAtom, {
      ...messagesMap,
      [updatedMessage.conversation_id]: updatedMessages,
    });
  }
);

export const setMessagesForConversationAtom = atom(
  null,
  (get, set, conversationId: string, messages: AIMessage[]) => {
    const messagesMap = get(messagesMapAtom);
    set(messagesMapAtom, {
      ...messagesMap,
      [conversationId]: messages,
    });
  }
);

export const setLoadingAtom = atom(
  null,
  (get, set, loading: boolean) => {
    set(isChatLoadingAtom, loading);
    if (loading) {
      set(chatErrorAtom, undefined);
    }
  }
);

export const setStreamingAtom = atom(
  null,
  (get, set, streaming: boolean) => {
    set(isStreamingAtom, streaming);
    if (streaming) {
      set(chatErrorAtom, undefined);
    }
  }
);

export const setErrorAtom = atom(
  null,
  (get, set, error: string | undefined) => {
    set(chatErrorAtom, error);
    if (error) {
      set(isChatLoadingAtom, false);
      set(isStreamingAtom, false);
    }
  }
);

export const clearChatStateAtom = atom(
  null,
  (get, set) => {
    set(conversationsAtom, []);
    set(messagesMapAtom, {});
    set(currentConversationIdAtom, undefined);
    set(isChatLoadingAtom, false);
    set(isStreamingAtom, false);
    set(chatErrorAtom, undefined);
    set(isChatOpenAtom, false);
  }
);

// Bulk operations
export const loadConversationsAtom = atom(
  null,
  (get, set, response: ListConversationsResponse) => {
    if (response.success) {
      set(conversationsAtom, response.conversations);
    } else {
      set(chatErrorAtom, 'Failed to load conversations');
    }
  }
);

export const deleteConversationAtom = atom(
  null,
  (get, set, conversationId: string) => {
    const conversations = get(conversationsAtom);
    const messagesMap = get(messagesMapAtom);
    const currentId = get(currentConversationIdAtom);
    
    // Remove conversation from list
    const updatedConversations = conversations.filter(conv => conv.id !== conversationId);
    set(conversationsAtom, updatedConversations);
    
    // Remove messages for this conversation
    const updatedMessagesMap = { ...messagesMap };
    delete updatedMessagesMap[conversationId];
    set(messagesMapAtom, updatedMessagesMap);
    
    // If this was the current conversation, clear it
    if (currentId === conversationId) {
      set(currentConversationIdAtom, undefined);
    }
  }
);

// Conversation type filters
export const adminConversationsAtom = atom<AIConversation[]>((get) => {
  const conversations = get(conversationsAtom);
  return conversations.filter(conv => conv.conversation_type === 'admin_assistant');
});

export const quizConversationsAtom = atom<AIConversation[]>((get) => {
  const conversations = get(conversationsAtom);
  return conversations.filter(conv => conv.conversation_type === 'onboarding_quiz');
});

// Conversation status filters
export const activeConversationsAtom = atom<AIConversation[]>((get) => {
  const conversations = get(conversationsAtom);
  return conversations.filter(conv => conv.status === 'active');
});

export const completedConversationsAtom = atom<AIConversation[]>((get) => {
  const conversations = get(conversationsAtom);
  return conversations.filter(conv => conv.status === 'completed');
});

// Search and filter atoms
export const searchQueryAtom = atom<string>('');
export const selectedConversationTypeAtom = atom<'all' | 'admin_assistant' | 'onboarding_quiz'>('all');
export const selectedStatusAtom = atom<'all' | 'active' | 'completed' | 'archived'>('all');

export const filteredConversationsAtom = atom<AIConversation[]>((get) => {
  const conversations = get(conversationsAtom);
  const searchQuery = get(searchQueryAtom).toLowerCase();
  const typeFilter = get(selectedConversationTypeAtom);
  const statusFilter = get(selectedStatusAtom);
  
  return conversations.filter(conv => {
    // Text search
    const matchesSearch = !searchQuery || 
      conv.title?.toLowerCase().includes(searchQuery) ||
      conv.id.toLowerCase().includes(searchQuery);
    
    // Type filter
    const matchesType = typeFilter === 'all' || conv.conversation_type === typeFilter;
    
    // Status filter
    const matchesStatus = statusFilter === 'all' || conv.status === statusFilter;
    
    return matchesSearch && matchesType && matchesStatus;
  });
});

// Quick actions
export const startAdminChatAtom = atom(
  null,
  (get, set) => {
    set(selectedConversationTypeAtom, 'admin_assistant');
    set(isChatOpenAtom, true);
    set(currentConversationIdAtom, undefined); // New conversation
  }
);

export const startOnboardingQuizAtom = atom(
  null,
  (get, set) => {
    set(selectedConversationTypeAtom, 'onboarding_quiz');
    set(isChatOpenAtom, true);
    set(currentConversationIdAtom, undefined); // New conversation
  }
);

// Utility atoms for UI components
export const canStartNewChatAtom = atom<boolean>((get) => {
  const isLoading = get(isChatLoadingAtom);
  const isStreaming = get(isStreamingAtom);
  return !isLoading && !isStreaming;
});

export const shouldShowWelcomeAtom = atom<boolean>((get) => {
  const conversations = get(conversationsAtom);
  return conversations.length === 0;
});

export const lastActiveConversationAtom = atom<AIConversation | undefined>((get) => {
  const conversations = get(conversationsAtom);
  const activeConvs = conversations.filter(conv => conv.status === 'active');
  return activeConvs.sort((a, b) => 
    new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
  )[0];
});