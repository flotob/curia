import { RequirementType, RequirementCategory } from '@/types/locks';
import { categoryColors, difficultyColors } from '@/lib/design-system/colors';

export interface RequirementTypeInfo {
  type: RequirementType;
  name: string;
  description: string;  
  icon: string;
  category: RequirementCategory;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  popularity: number; // Usage frequency score (higher = more popular)
  estimatedConfigTime: string; // e.g., "30 seconds"
}

export const REQUIREMENT_TYPES: RequirementTypeInfo[] = [
  // Token Requirements - Beginner
  {
    type: 'lyx_balance',
    name: 'LYX Minimum Balance',
    description: 'Require minimum LYX tokens in wallet',
    icon: '💎',
    category: 'token',
    difficulty: 'beginner',
    popularity: 95,
    estimatedConfigTime: '30 seconds'
  },
  {
    type: 'eth_balance',
    name: 'ETH Minimum Balance', 
    description: 'Require minimum ETH in wallet',
    icon: '⚡',
    category: 'token',
    difficulty: 'beginner',
    popularity: 90,
    estimatedConfigTime: '30 seconds'
  },

  // Token Requirements - Intermediate
  {
    type: 'lsp7_token',
    name: 'LSP7 Token Holding',
    description: 'Require specific LSP7 tokens (fungible tokens on LUKSO)',
    icon: '🏆',
    category: 'token',
    difficulty: 'intermediate',
    popularity: 75,
    estimatedConfigTime: '2 minutes'
  },
  {
    type: 'erc20_token',
    name: 'ERC-20 Token Holding',
    description: 'Require specific ERC-20 tokens (USDC, DAI, etc.)',
    icon: '🎨',
    category: 'token',
    difficulty: 'intermediate',
    popularity: 80,
    estimatedConfigTime: '2 minutes'
  },
  {
    type: 'erc721_nft',
    name: 'ERC-721 NFT Ownership',
    description: 'Require ownership of specific NFT collections',
    icon: '🖼️',
    category: 'token',
    difficulty: 'intermediate',
    popularity: 70,
    estimatedConfigTime: '1 minute'
  },

  // Token Requirements - Advanced
  {
    type: 'lsp8_nft',
    name: 'LSP8 NFT Ownership',
    description: 'Require specific LSP8 NFTs (NFTs on LUKSO)',
    icon: '🎯',
    category: 'token',
    difficulty: 'advanced',
    popularity: 45,
    estimatedConfigTime: '3 minutes'
  },
  {
    type: 'erc1155_token',
    name: 'ERC-1155 Token Holding',
    description: 'Require specific ERC-1155 tokens (gaming, utility tokens)',
    icon: '🔷',
    category: 'token',
    difficulty: 'advanced',
    popularity: 35,
    estimatedConfigTime: '3 minutes'
  },

  // Social Requirements - Beginner
  {
    type: 'up_follower_count',
    name: 'UP Follower Count',
    description: 'Require minimum Universal Profile followers',
    icon: '📊',
    category: 'social',
    difficulty: 'beginner',
    popularity: 85,
    estimatedConfigTime: '30 seconds'
  },
  {
    type: 'efp_follower_count',
    name: 'EFP Follower Count',
    description: 'Require minimum Ethereum Follow Protocol followers',
    icon: '📈',
    category: 'social',
    difficulty: 'beginner',
    popularity: 65,
    estimatedConfigTime: '30 seconds'
  },

  // Social Requirements - Intermediate
  {
    type: 'up_must_follow',
    name: 'UP Must Follow Address',
    description: 'Must follow a specific Universal Profile address',
    icon: '🤝',
    category: 'social',
    difficulty: 'intermediate',
    popularity: 60,
    estimatedConfigTime: '1 minute'
  },
  {
    type: 'up_must_be_followed_by',
    name: 'UP Must Be Followed By',
    description: 'Must be followed by a specific Universal Profile',
    icon: '⭐',
    category: 'social',
    difficulty: 'intermediate',
    popularity: 55,
    estimatedConfigTime: '1 minute'
  },
  {
    type: 'efp_must_follow',
    name: 'EFP Must Follow User',
    description: 'Must follow a specific user on Ethereum Follow Protocol',
    icon: '🔗',
    category: 'social',
    difficulty: 'intermediate',
    popularity: 45,
    estimatedConfigTime: '1 minute'
  },
  {
    type: 'efp_must_be_followed_by',
    name: 'EFP Must Be Followed By',
    description: 'Must be followed by a specific EFP user',
    icon: '🎯',
    category: 'social',
    difficulty: 'intermediate',
    popularity: 40,
    estimatedConfigTime: '1 minute'
  },

  // Identity Requirements - Beginner to Intermediate
  {
    type: 'ens_domain',
    name: 'ENS Domain Ownership',
    description: 'Require ownership of any ENS domain',
    icon: '🏷️',
    category: 'identity',
    difficulty: 'beginner',
    popularity: 70,
    estimatedConfigTime: '30 seconds'
  },
  {
    type: 'ens_pattern',
    name: 'ENS Domain Pattern',
    description: 'Require specific ENS domain patterns (*.eth, vitalik.eth)',
    icon: '🎭',
    category: 'identity',
    difficulty: 'intermediate',
    popularity: 50,
    estimatedConfigTime: '1 minute'
  }
];

// Category metadata
export const REQUIREMENT_CATEGORIES = {
  token: {
    name: 'Token Requirements',
    description: 'Requirements based on token and NFT ownership',
    icon: '🪙',
    color: categoryColors.token.icon,
    bgColor: categoryColors.token.bg,
    borderColor: categoryColors.token.border
  },
  social: {
    name: 'Social Requirements',
    description: 'Requirements based on social connections and engagement',
    icon: '👥',
    color: categoryColors.social.icon, 
    bgColor: categoryColors.social.bg,
    borderColor: categoryColors.social.border
  },
  identity: {
    name: 'Identity Requirements',
    description: 'Requirements based on identity and domain ownership',
    icon: '🌐',
    color: categoryColors.identity.icon,
    bgColor: categoryColors.identity.bg,
    borderColor: categoryColors.identity.border
  }
} as const;

// Difficulty level metadata
export const DIFFICULTY_LEVELS = {
  beginner: {
    name: 'Beginner',
    description: 'Simple setup, quick configuration',
    color: difficultyColors.beginner.text,
    bgColor: difficultyColors.beginner.badge,
    textColor: difficultyColors.beginner.text
  },
  intermediate: {
    name: 'Intermediate',
    description: 'Moderate setup, requires some technical knowledge',
    color: difficultyColors.intermediate.text,
    bgColor: difficultyColors.intermediate.badge, 
    textColor: difficultyColors.intermediate.text
  },
  advanced: {
    name: 'Advanced',
    description: 'Complex setup, technical expertise recommended',
    color: difficultyColors.advanced.text,
    bgColor: difficultyColors.advanced.badge,
    textColor: difficultyColors.advanced.text
  }
} as const;

// Helper functions
export const getRequirementsByCategory = (category: RequirementCategory) => {
  return REQUIREMENT_TYPES.filter(req => req.category === category);
};

export const getRequirementsByDifficulty = (difficulty: 'beginner' | 'intermediate' | 'advanced') => {
  return REQUIREMENT_TYPES.filter(req => req.difficulty === difficulty);
};

export const searchRequirements = (query: string) => {
  if (!query.trim()) return REQUIREMENT_TYPES;
  
  const searchTerm = query.toLowerCase();
  return REQUIREMENT_TYPES.filter(req => 
    req.name.toLowerCase().includes(searchTerm) ||
    req.description.toLowerCase().includes(searchTerm) ||
    req.type.toLowerCase().includes(searchTerm)
  );
};

export const sortRequirementsByPopularity = (requirements: RequirementTypeInfo[]) => {
  return [...requirements].sort((a, b) => b.popularity - a.popularity);
}; 