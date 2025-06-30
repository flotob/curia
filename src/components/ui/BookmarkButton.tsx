import React from 'react';
import { Button } from '@/components/ui/button';
import { Bookmark, BookmarkCheck } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useBookmarks } from '@/hooks/useBookmarks';

interface BookmarkButtonProps {
  postId: number;
  variant?: 'default' | 'ghost' | 'outline';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  showLabel?: boolean;
  className?: string;
  'aria-label'?: string;
}

export const BookmarkButton: React.FC<BookmarkButtonProps> = ({
  postId,
  variant = 'ghost',
  size = 'sm',
  showLabel = false,
  className,
  'aria-label': ariaLabel,
}) => {
  const { isBookmarked, isLoading, toggleBookmark } = useBookmarks(postId);

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    toggleBookmark();
  };

  const Icon = isBookmarked ? BookmarkCheck : Bookmark;
  const label = isBookmarked ? 'Remove bookmark' : 'Add bookmark';
  const buttonLabel = isBookmarked ? 'Bookmarked' : 'Bookmark';

  return (
    <Button
      variant={variant}
      size={size}
      onClick={handleClick}
      disabled={isLoading}
      className={cn(
        'relative transition-all duration-200 group',
        isBookmarked && 'text-amber-600 hover:text-amber-700',
        !isBookmarked && 'text-muted-foreground hover:text-foreground',
        'hover:scale-105 active:scale-95',
        className
      )}
      aria-label={ariaLabel || label}
      title={label}
    >
      {/* Loading state */}
      {isLoading ? (
        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current" />
      ) : (
        <>
          <Icon 
            size={14} 
            className={cn(
              'transition-all duration-200',
              isBookmarked ? 'fill-current scale-110' : 'scale-100',
              showLabel && 'mr-1.5'
            )} 
          />
          {showLabel && (
            <span className="text-xs sm:text-sm">{buttonLabel}</span>
          )}
        </>
      )}

      {/* Subtle highlight effect for bookmarked state */}
      <div
        className={cn(
          'absolute inset-0 rounded-md transition-all duration-300 pointer-events-none',
          'bg-amber-100 dark:bg-amber-900/30 opacity-0 scale-50',
          isBookmarked && 'opacity-10 scale-100'
        )}
      />

      {/* Hover effect ring */}
      <div
        className={cn(
          'absolute inset-0 rounded-md transition-all duration-200 pointer-events-none',
          'ring-2 ring-transparent group-hover:ring-amber-200 dark:group-hover:ring-amber-800',
          'opacity-0 group-hover:opacity-50'
        )}
      />
    </Button>
  );
};