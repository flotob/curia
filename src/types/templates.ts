export type TemplateCategory = 'token_gating' | 'social' | 'hybrid' | 'nft_collections';

export type TemplateDifficulty = 'beginner' | 'intermediate' | 'advanced';

export interface LockTemplate {
  id: string;
  name: string;
  description: string;
  category: TemplateCategory;
  difficulty: TemplateDifficulty;
  icon: string;
  estimatedSetupTime: string; // e.g., "2 mins"
  usageCount: number;
  tags: string[];
  
  // Pre-configured requirements (optional for basic templates)
  prefilledMetadata?: {
    title?: string;
    description?: string;
    icon?: string;
  };
  
  // Pre-filled requirements for templates
  prefilledRequirements?: any[]; // eslint-disable-line @typescript-eslint/no-explicit-any -- Will be GatingRequirement[] but avoiding circular dependency
  
  // Pre-selected categories and basic configuration (optional for basic templates)
  prefilledCategories?: {
    universalProfile?: {
      enabled: boolean;
      suggestedRequirements?: {
        minLyxBalance?: string;
        requiredTokens?: Array<{
          contractAddress?: string;
          minAmount?: string;
          tokenType?: 'LSP7' | 'LSP8';
        }>;
        followerRequirements?: Array<{
          type: 'minimum_followers' | 'followed_by' | 'following';
          value?: string;
        }>;
      };
    };
    ethereumProfile?: {
      enabled: boolean;
      suggestedRequirements?: {
        requiresENS?: boolean;
        minimumETHBalance?: string;
        requiredERC20Tokens?: Array<{
          contractAddress?: string;
          minimum?: string;
        }>;
        requiredERC721Collections?: Array<{
          contractAddress?: string;
          minimumCount?: number;
        }>;
        efpRequirements?: Array<{
          type: 'minimum_followers' | 'must_follow' | 'must_be_followed_by';
          value?: string;
        }>;
      };
    };
  };
  
  // AI-powered smart suggestions
  smartSuggestions?: {
    tokenAnalysis?: boolean; // Analyze user's wallet for relevant tokens
    socialAnalysis?: boolean; // Analyze user's social connections
    communityAnalysis?: boolean; // Analyze community patterns
  };
  
  // Template metadata
  createdBy?: 'system' | 'community' | string; // user ID if created by user
  isOfficial: boolean;
  createdAt: string;
  updatedAt?: string;
}

export interface TemplateSearchFilters {
  category?: TemplateCategory;
  difficulty?: TemplateDifficulty;
  searchTerm?: string;
  sortBy?: 'popular' | 'recent' | 'name';
  showOnlyOfficial?: boolean;
}

export interface TemplateAnalytics {
  templateId: string;
  usageCount: number;
  completionRate: number; // % of users who complete setup after selecting template
  averageSetupTime: number; // in minutes
  successRate: number; // % of successful lock creations
  popularModifications: string[]; // common changes users make
}

// Template suggestion system interfaces
export interface UserContext {
  connectedWallets?: {
    ethereum?: string;
    lukso?: string;
  };
  ownedTokens?: Array<{
    contractAddress: string;
    balance: string;
    tokenType: 'ERC20' | 'ERC721' | 'ERC1155' | 'LSP7' | 'LSP8';
    metadata?: {
      name?: string;
      symbol?: string;
    };
  }>;
  socialConnections?: {
    efpFollowers?: number;
    upFollowers?: number;
  };
  communityRole?: 'admin' | 'moderator' | 'member';
  previousLocks?: number; // count of previously created locks
}

export interface TemplateSuggestion {
  template: LockTemplate;
  score: number; // 0-100 confidence score
  reasoning: string; // AI explanation for why this template is suggested
  customizations?: {
    prefillValues?: Record<string, unknown>;
    recommendedChanges?: string[];
  };
} 