/**
 * Standardized Color System
 * 
 * Provides consistent color patterns using Tailwind classes that work with
 * the theme system. All colors use semantic theme variables where possible
 * and provide both light and dark mode variants.
 */

export const statusColors = {
  success: {
    bg: 'bg-green-50 dark:bg-green-950/10',
    text: 'text-green-700 dark:text-green-300',
    border: 'border-green-200 dark:border-green-800',
    icon: 'text-green-600 dark:text-green-400',
    subtle: 'bg-green-50/50 dark:bg-green-950/5'
  },
  warning: {
    bg: 'bg-amber-50 dark:bg-amber-950/10',
    text: 'text-amber-700 dark:text-amber-300', 
    border: 'border-amber-200 dark:border-amber-800',
    icon: 'text-amber-600 dark:text-amber-400',
    subtle: 'bg-amber-50/50 dark:bg-amber-950/5'
  },
  error: {
    bg: 'bg-red-50 dark:bg-red-950/10',
    text: 'text-red-700 dark:text-red-300',
    border: 'border-red-200 dark:border-red-800', 
    icon: 'text-red-600 dark:text-red-400',
    subtle: 'bg-red-50/50 dark:bg-red-950/5'
  },
  info: {
    bg: 'bg-blue-50 dark:bg-blue-950/10',
    text: 'text-blue-700 dark:text-blue-300',
    border: 'border-blue-200 dark:border-blue-800',
    icon: 'text-blue-600 dark:text-blue-400',
    subtle: 'bg-blue-50/50 dark:bg-blue-950/5'
  },
  neutral: {
    bg: 'bg-muted',
    text: 'text-muted-foreground',
    border: 'border-border',
    icon: 'text-muted-foreground',
    subtle: 'bg-muted/50'
  }
} as const;

export const categoryColors = {
  token: {
    bg: 'bg-blue-50 dark:bg-blue-950/10',
    text: 'text-blue-700 dark:text-blue-300',
    border: 'border-blue-200 dark:border-blue-800',
    icon: 'text-blue-600 dark:text-blue-400',
    gradient: 'from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20'
  },
  social: {
    bg: 'bg-green-50 dark:bg-green-950/10', 
    text: 'text-green-700 dark:text-green-300',
    border: 'border-green-200 dark:border-green-800',
    icon: 'text-green-600 dark:text-green-400',
    gradient: 'from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20'
  },
  identity: {
    bg: 'bg-purple-50 dark:bg-purple-950/10',
    text: 'text-purple-700 dark:text-purple-300', 
    border: 'border-purple-200 dark:border-purple-800',
    icon: 'text-purple-600 dark:text-purple-400',
    gradient: 'from-purple-50 to-violet-50 dark:from-purple-950/20 dark:to-violet-950/20'
  }
} as const;

export const difficultyColors = {
  beginner: {
    bg: 'bg-emerald-50 dark:bg-emerald-950/10',
    text: 'text-emerald-700 dark:text-emerald-300',
    border: 'border-emerald-200 dark:border-emerald-800',
    badge: 'bg-emerald-100 dark:bg-emerald-900/30'
  },
  intermediate: {
    bg: 'bg-amber-50 dark:bg-amber-950/10',
    text: 'text-amber-700 dark:text-amber-300',
    border: 'border-amber-200 dark:border-amber-800', 
    badge: 'bg-amber-100 dark:bg-amber-900/30'
  },
  advanced: {
    bg: 'bg-red-50 dark:bg-red-950/10',
    text: 'text-red-700 dark:text-red-300',
    border: 'border-red-200 dark:border-red-800',
    badge: 'bg-red-100 dark:bg-red-900/30'
  }
} as const;

export const verificationColors = {
  verified: {
    bg: 'bg-green-50 dark:bg-green-950/10',
    text: 'text-green-700 dark:text-green-300', 
    border: 'border-green-200 dark:border-green-800',
    icon: 'text-green-600 dark:text-green-400',
    gradient: 'from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20'
  },
  pending: {
    bg: 'bg-amber-50 dark:bg-amber-950/10',
    text: 'text-amber-700 dark:text-amber-300',
    border: 'border-amber-200 dark:border-amber-800',
    icon: 'text-amber-600 dark:text-amber-400',
    gradient: 'from-amber-50 to-yellow-50 dark:from-amber-900/20 dark:to-yellow-900/20'
  },
  expired: {
    bg: 'bg-red-50 dark:bg-red-950/10', 
    text: 'text-red-700 dark:text-red-300',
    border: 'border-red-200 dark:border-red-800',
    icon: 'text-red-600 dark:text-red-400',
    gradient: 'from-red-50 to-rose-50 dark:from-red-900/20 dark:to-rose-900/20'
  },
  not_started: {
    bg: 'bg-muted',
    text: 'text-muted-foreground',
    border: 'border-border', 
    icon: 'text-muted-foreground',
    gradient: 'from-muted to-muted/80'
  }
} as const;

// Helper type for all color schemes
export type StatusColor = keyof typeof statusColors;
export type CategoryColor = keyof typeof categoryColors;
export type DifficultyColor = keyof typeof difficultyColors;
export type VerificationColor = keyof typeof verificationColors;

// Utility function to get complete color scheme
export const getColorScheme = (type: 'status' | 'category' | 'difficulty' | 'verification', key: string) => {
  switch (type) {
    case 'status':
      return statusColors[key as StatusColor] || statusColors.neutral;
    case 'category':
      return categoryColors[key as CategoryColor] || categoryColors.token;
    case 'difficulty':
      return difficultyColors[key as DifficultyColor] || difficultyColors.beginner;
    case 'verification':
      return verificationColors[key as VerificationColor] || verificationColors.not_started;
    default:
      return statusColors.neutral;
  }
};