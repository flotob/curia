import { useBackground } from '@/contexts/BackgroundContext';

export const useCardStyling = () => {
  const { activeBackground } = useBackground();
  const hasActiveBackground = !!(activeBackground && activeBackground.imageUrl);
  
  return {
    hasActiveBackground,
    // Main card styling - solid when no background, frosted glass when background active
    cardClassName: hasActiveBackground 
      ? 'backdrop-blur-md bg-white/20 dark:bg-slate-900/20 border-slate-200/30 dark:border-slate-700/30 shadow-xl'
      : 'bg-card border shadow',
    
    // Page header styling - slightly more prominent for headers/hero sections
    headerClassName: hasActiveBackground
      ? 'backdrop-blur-md bg-white/30 dark:bg-slate-900/30 border-slate-200/40 dark:border-slate-700/40 shadow-xl'
      : 'bg-card border shadow',
    
    // Content section styling - for sections that currently have no background
    contentClassName: hasActiveBackground
      ? 'backdrop-blur-sm bg-white/10 dark:bg-slate-900/10 border-slate-200/20 dark:border-slate-700/20 shadow-lg'
      : 'bg-background border-slate-200/60 dark:border-slate-700/40',
    
    // Utility functions
    getCardStyle: (variant: 'card' | 'header' | 'content' = 'card') => {
      switch (variant) {
        case 'header':
          return hasActiveBackground 
            ? 'backdrop-blur-md bg-white/30 dark:bg-slate-900/30 border-slate-200/40 dark:border-slate-700/40 shadow-xl'
            : 'bg-card border shadow';
        case 'content':
          return hasActiveBackground
            ? 'backdrop-blur-sm bg-white/10 dark:bg-slate-900/10 border-slate-200/20 dark:border-slate-700/20 shadow-lg'
            : 'bg-background border-slate-200/60 dark:border-slate-700/40';
        default:
          return hasActiveBackground 
            ? 'backdrop-blur-md bg-white/20 dark:bg-slate-900/20 border-slate-200/30 dark:border-slate-700/30 shadow-xl'
            : 'bg-card border shadow';
      }
    }
  };
}; 