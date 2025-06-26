'use client';

import React from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SocketNotificationProps {
  id: string | number;
  profileImage?: string | null;
  authorName: string;
  message: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  onDismiss?: () => void;
  className?: string;
}

export const SocketNotificationCard: React.FC<SocketNotificationProps> = ({
  profileImage,
  authorName,
  message,
  action,
  onDismiss,
  className
}) => {
  // Generate initials for fallback avatar
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div
      className={cn(
        // Base layout and sizing with proper rounded corners
        "flex items-start gap-3 p-4 min-w-[320px] max-w-[400px] relative overflow-hidden rounded-xl",
        // Enhanced frosted glass effect with stronger backdrop blur
        "backdrop-blur-xl backdrop-saturate-180",
        // Light mode: Enhanced contrast with tinted glass effect
        "bg-gradient-to-br from-slate-50/95 via-white/90 to-slate-100/95",
        "border border-slate-200/60 shadow-2xl shadow-slate-900/15",
        // Dark mode: Deep translucent with enhanced glow
        "dark:bg-gradient-to-br dark:from-slate-900/95 dark:via-slate-800/90 dark:to-slate-900/95",
        "dark:border-slate-700/40 dark:shadow-2xl dark:shadow-black/40",
        // Enhanced convex appearance with stronger inner glow
        "before:absolute before:inset-0 before:rounded-xl before:pointer-events-none",
        "before:bg-gradient-to-br before:from-white/30 before:via-white/10 before:to-transparent",
        "dark:before:from-white/15 dark:before:via-white/5",
        // Enhanced animation entrance
        "animate-in slide-in-from-top-2 fade-in-0 duration-300",
        // Stronger shimmer effect for light mode visibility
        "after:absolute after:inset-0 after:rounded-xl after:pointer-events-none",
        "after:bg-gradient-to-r after:from-transparent after:via-white/15 after:to-transparent",
        "after:translate-x-[-100%] after:animate-[shimmer_2s_ease-in-out_infinite]",
        "dark:after:via-white/8",
        className
      )}
      style={{
        // Enhanced backdrop filters for stronger frosted glass effect
        backdropFilter: 'blur(20px) saturate(200%) brightness(1.1)',
        WebkitBackdropFilter: 'blur(20px) saturate(200%) brightness(1.1)',
      }}
    >
      {/* Profile Image - Enhanced with visible frosted glass ring */}
      <div className="flex-shrink-0 relative">
        <div className="absolute inset-0 rounded-full bg-gradient-to-br from-slate-200/60 via-white/40 to-slate-100/60 dark:from-white/20 dark:via-white/5 dark:to-transparent blur-sm"></div>
        <Avatar className="h-10 w-10 relative z-10 ring-2 ring-slate-300/40 dark:ring-white/10 ring-offset-1 ring-offset-white/20 dark:ring-offset-slate-900/20">
          <AvatarImage 
            src={profileImage || undefined} 
            alt={`${authorName}'s avatar`}
            className="object-cover"
          />
          <AvatarFallback className="bg-gradient-to-br from-slate-100/90 to-slate-200/90 dark:from-primary/20 dark:to-primary/10 text-slate-700 dark:text-primary font-medium text-sm backdrop-blur-sm">
            {getInitials(authorName)}
          </AvatarFallback>
        </Avatar>
      </div>

      {/* Content Area - Enhanced with better contrast */}
      <div className="flex-1 min-w-0 space-y-1 relative z-10">
        {/* Author and Message */}
        <div className="space-y-0.5">
          <p className="font-semibold text-sm leading-tight bg-gradient-to-r from-slate-900 to-slate-700 dark:from-white dark:to-slate-200 bg-clip-text text-transparent">
            {authorName}
          </p>
          <p className="text-sm leading-tight text-slate-700/90 dark:text-slate-300/90">
            {message}
          </p>
        </div>

        {/* Action Button - Enhanced frosted glass button */}
        {action && (
          <div className="pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={action.onClick}
              className={cn(
                "h-7 px-3 text-xs font-medium relative overflow-hidden rounded-lg",
                // Enhanced frosted glass button effect with better light mode contrast
                "bg-slate-100/80 hover:bg-slate-200/90 dark:bg-slate-800/40 dark:hover:bg-slate-700/60",
                "border-slate-300/50 dark:border-white/20",
                "backdrop-blur-sm text-slate-700 dark:text-slate-200",
                "shadow-lg shadow-slate-900/10 dark:shadow-black/20",
                "transition-all duration-200 ease-out hover:scale-105 hover:shadow-xl",
                // Enhanced inner glow for both modes
                "before:absolute before:inset-0 before:rounded-lg before:bg-gradient-to-r before:from-white/40 before:to-transparent dark:before:from-white/20 before:opacity-0 hover:before:opacity-100 before:transition-opacity before:duration-200"
              )}
            >
              <span className="relative z-10">{action.label}</span>
            </Button>
          </div>
        )}
      </div>

      {/* Dismiss Button - Enhanced frosted glass treatment */}
      {onDismiss && (
        <div className="flex-shrink-0 relative z-10">
          <Button
            variant="ghost"
            size="sm"
            onClick={onDismiss}
            className={cn(
              "h-6 w-6 p-0 relative overflow-hidden group rounded-lg",
              "bg-slate-200/40 hover:bg-red-500/20 dark:bg-slate-800/20 dark:hover:bg-red-500/20",
              "border border-slate-300/30 dark:border-white/10",
              "backdrop-blur-sm",
              "text-slate-500 hover:text-red-600 dark:text-slate-400 dark:hover:text-red-400",
              "transition-all duration-200 ease-out hover:scale-110",
              "shadow-sm hover:shadow-lg shadow-slate-900/5 dark:shadow-black/20",
              // Subtle pulse effect on hover
              "hover:animate-pulse"
            )}
          >
            <X className="h-3 w-3 relative z-10 transition-transform duration-200 group-hover:rotate-90" />
            <span className="sr-only">Dismiss notification</span>
          </Button>
        </div>
      )}
    </div>
  );
};

// Import toast directly to avoid dynamic require issues
import { toast } from 'sonner';

// Utility function to show enhanced socket notifications
export const showSocketNotification = (
  authorName: string,
  authorProfileImage: string | null,
  message: string,
  action?: {
    label: string;
    onClick: () => void;
  }
) => {
  console.log('[showSocketNotification] Called with:', { authorName, authorProfileImage, message, action });
  
  try {
    const result = toast.custom((id: string | number) => (
    <SocketNotificationCard
      id={id}
      profileImage={authorProfileImage}
      authorName={authorName}
      message={message}
      action={action}
      onDismiss={() => toast.dismiss(id)}
    />
    ), {
      duration: 5000,
      position: 'top-right',
    });
    
    console.log('[showSocketNotification] Toast created successfully:', result);
    return result;
  } catch (error) {
    console.error('[showSocketNotification] Error creating toast:', error);
    // Fallback to simple toast if custom fails
    return toast.error(`${authorName}: ${message}`);
  }
}; 