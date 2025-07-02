export interface AIConversation {
  id: string;
  user_id: string;
  community_id: string;
  conversation_type: 'admin_assistant' | 'onboarding_quiz';
  title?: string;
  status: 'active' | 'completed' | 'archived';
  metadata: Record<string, any>;
  created_at: string;
  updated_at: string;
  completed_at?: string;
}

export interface AIMessage {
  id: string;
  conversation_id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  tool_calls?: any[];
  tool_results?: any[];
  metadata: {
    tokens?: {
      prompt?: number;
      completion?: number;
      total?: number;
    };
    processing_time_ms?: number;
    [key: string]: any;
  };
  created_at: string;
  message_index: number;
}

export interface AIUsageLog {
  id: string;
  conversation_id: string;
  message_id: string;
  user_id: string;
  community_id: string;
  api_provider: string;
  model: string;
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
  estimated_cost_usd: number;
  processing_time_ms?: number;
  tool_calls_count: number;
  success: boolean;
  error_message?: string;
  created_at: string;
}

// API Request/Response Types

export interface CreateConversationRequest {
  conversation_type: 'admin_assistant' | 'onboarding_quiz';
  title?: string;
  initial_message?: string;
}

export interface CreateConversationResponse {
  success: boolean;
  conversation: AIConversation;
  initial_response?: AIMessage;
}

export interface SendMessageRequest {
  message: string;
  conversation_id: string;
}

export interface SendMessageResponse {
  success: boolean;
  message: AIMessage;
  conversation: AIConversation;
}

export interface GetConversationResponse {
  success: boolean;
  conversation: AIConversation;
  messages: AIMessage[];
}

export interface ListConversationsRequest {
  conversation_type?: 'admin_assistant' | 'onboarding_quiz';
  status?: 'active' | 'completed' | 'archived';
  page?: number;
  limit?: number;
}

export interface ListConversationsResponse {
  success: boolean;
  conversations: AIConversation[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

// Tool Definition Types (for admin assistant)

export interface ToolDefinition {
  type: 'function';
  function: {
    name: string;
    description: string;
    parameters: {
      type: 'object';
      properties: Record<string, {
        type: string;
        description: string;
        enum?: string[];
      }>;
      required: string[];
    };
  };
}

export interface ToolCall {
  id: string;
  type: 'function';
  function: {
    name: string;
    arguments: string;
  };
}

export interface ToolResult {
  tool_call_id: string;
  result: any;
  success: boolean;
  error?: string;
}

// Admin Assistant Tool Types

export interface DatabaseQueryTool {
  query: string;
  params?: any[];
}

export interface UserAnalyticsTool {
  user_id?: string;
  date_range?: {
    start: string;
    end: string;
  };
}

export interface CommunityStatsTool {
  community_id?: string;
  include_detailed?: boolean;
}

export interface PostAnalyticsTool {
  post_id?: string;
  board_id?: string;
  date_range?: {
    start: string;
    end: string;
  };
}

export interface SystemHealthTool {
  include_database?: boolean;
  include_performance?: boolean;
}

export interface ErrorLogsTool {
  severity?: 'error' | 'warning' | 'info';
  limit?: number;
  since?: string;
}

export interface BackupStatusTool {
  include_schedule?: boolean;
}

export interface SecurityAuditTool {
  audit_type?: 'permissions' | 'authentication' | 'data_access';
  target_user_id?: string;
}

export interface ConfigurationTool {
  config_type?: 'environment' | 'feature_flags' | 'integrations';
}

// Onboarding Quiz Types

export interface QuizProgress {
  current_step: number;
  total_steps: number;
  completed_steps: string[];
  quiz_data: Record<string, any>;
}

export interface QuizCompletion {
  completed: boolean;
  score?: number;
  recommendations: string[];
  next_steps: string[];
}

// Chat UI State Types (for Jotai)

export interface ChatUIState {
  isOpen: boolean;
  currentConversationId?: string;
  conversations: AIConversation[];
  messages: Record<string, AIMessage[]>; // keyed by conversation_id
  isLoading: boolean;
  isStreaming: boolean;
  error?: string;
}

export interface ChatPreferences {
  theme: 'light' | 'dark' | 'auto';
  sounds_enabled: boolean;
  auto_scroll: boolean;
  show_timestamps: boolean;
}

// Streaming Types

export interface StreamingChunk {
  type: 'content' | 'tool_call' | 'tool_result' | 'done';
  content?: string;
  tool_call?: ToolCall;
  tool_result?: ToolResult;
  conversation_id?: string;
  message_id?: string;
}

// Error Types

export interface AIError {
  code: string;
  message: string;
  details?: Record<string, any>;
}

export interface QuotaExceededError extends AIError {
  code: 'QUOTA_EXCEEDED';
  details: {
    current_usage: number;
    limit: number;
    reset_time: string;
  };
}

export interface InvalidToolError extends AIError {
  code: 'INVALID_TOOL';
  details: {
    tool_name: string;
    validation_errors: string[];
  };
}

// Configuration Types

export interface AIConfig {
  openai: {
    api_key: string;
    model: string;
    max_tokens: number;
    temperature: number;
  };
  quotas: {
    daily_requests: number;
    monthly_cost_usd: number;
  };
  features: {
    admin_tools_enabled: boolean;
    onboarding_quiz_enabled: boolean;
    streaming_enabled: boolean;
  };
}