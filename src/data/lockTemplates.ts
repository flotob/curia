import { LockTemplate } from '@/types/templates';

export const LOCK_TEMPLATES: LockTemplate[] = [
  // Beginner Templates
  {
    id: 'lyx-holders-basic',
    name: 'LYX Holders Only',
    description: 'Simple requirement for LYX token holders. Perfect for basic token gating.',
    category: 'token_gating',
    difficulty: 'beginner',
    icon: '💎',
    estimatedSetupTime: '1 min',
    usageCount: 1250,
    tags: ['lyx', 'basic', 'token'],
    isOfficial: true,
    createdAt: '2024-01-15T10:00:00Z'
  },
  {
    id: 'eth-holders-basic',
    name: 'ETH Holders Only', 
    description: 'Simple requirement for ETH holders. Great for Ethereum-based communities.',
    category: 'token_gating',
    difficulty: 'beginner',
    icon: '⚡',
    estimatedSetupTime: '1 min',
    usageCount: 890,
    tags: ['eth', 'ethereum', 'basic'],
    isOfficial: true,
    createdAt: '2024-01-16T10:00:00Z'
  },
  {
    id: 'social-followers',
    name: 'Social Followers',
    description: 'Require minimum follower count on Universal Profile or EFP.',
    category: 'social',
    difficulty: 'beginner', 
    icon: '👥',
    estimatedSetupTime: '2 mins',
    usageCount: 650,
    tags: ['social', 'followers', 'community'],
    isOfficial: true,
    createdAt: '2024-01-17T10:00:00Z'
  },

  // Intermediate Templates
  {
    id: 'token-community',
    name: 'Token Community',
    description: 'Specific token + social requirements. Perfect for token-based communities.',
    category: 'hybrid',
    difficulty: 'intermediate',
    icon: '🏘️',
    estimatedSetupTime: '3 mins', 
    usageCount: 420,
    tags: ['token', 'social', 'community', 'hybrid'],
    isOfficial: true,
    createdAt: '2024-01-18T10:00:00Z'
  },
  {
    id: 'nft-collectors',
    name: 'NFT Collectors',
    description: 'Multiple NFT collection requirements. Great for exclusive collector groups.',
    category: 'nft_collections',
    difficulty: 'intermediate',
    icon: '🖼️',
    estimatedSetupTime: '4 mins',
    usageCount: 310,
    tags: ['nft', 'collectors', 'exclusive'],
    isOfficial: true,
    createdAt: '2024-01-19T10:00:00Z'
  },
  {
    id: 'vip-access',
    name: 'VIP Access',
    description: 'High token threshold + follower requirements for premium access.',
    category: 'hybrid',
    difficulty: 'intermediate',
    icon: '⭐',
    estimatedSetupTime: '3 mins',
    usageCount: 180,
    tags: ['vip', 'premium', 'exclusive', 'high-value'],
    isOfficial: true,
    createdAt: '2024-01-20T10:00:00Z'
  },

  // Advanced Templates
  {
    id: 'dao-governance',
    name: 'DAO Governance',
    description: 'Complex multi-chain governance requirements with social proof.',
    category: 'hybrid',
    difficulty: 'advanced',
    icon: '🏛️',
    estimatedSetupTime: '6 mins',
    usageCount: 95,
    tags: ['dao', 'governance', 'multi-chain', 'complex'],
    isOfficial: true,
    createdAt: '2024-01-21T10:00:00Z'
  },
  {
    id: 'creator-economy',
    name: 'Creator Economy',
    description: 'Support creators with token holdings, social engagement, and NFT ownership.',
    category: 'hybrid',
    difficulty: 'advanced',
    icon: '🎨',
    estimatedSetupTime: '5 mins',
    usageCount: 140,
    tags: ['creator', 'economy', 'engagement', 'multi-requirement'],
    isOfficial: true,
    createdAt: '2024-01-22T10:00:00Z'
  }
];

// Template categories with descriptions
export const TEMPLATE_CATEGORIES = {
  token_gating: {
    name: 'Token Gating',
    description: 'Requirements based on token ownership and balances',
    icon: '🪙',
    color: 'bg-blue-500'
  },
  social: {
    name: 'Social',
    description: 'Requirements based on social connections and engagement',
    icon: '👥', 
    color: 'bg-green-500'
  },
  hybrid: {
    name: 'Hybrid',
    description: 'Combination of token, social, and other requirements',
    icon: '🔗',
    color: 'bg-purple-500'
  },
  nft_collections: {
    name: 'NFT Collections',
    description: 'Requirements based on NFT ownership across collections',
    icon: '🖼️',
    color: 'bg-orange-500'
  }
} as const;

// Difficulty levels with descriptions
export const DIFFICULTY_LEVELS = {
  beginner: {
    name: 'Beginner',
    description: 'Simple, single requirement locks',
    color: 'bg-emerald-500'
  },
  intermediate: {
    name: 'Intermediate', 
    description: 'Multiple requirements with some complexity',
    color: 'bg-yellow-500'
  },
  advanced: {
    name: 'Advanced',
    description: 'Complex multi-chain and multi-category requirements',
    color: 'bg-red-500'
  }
} as const; 