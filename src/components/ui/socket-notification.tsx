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
        "flex items-start gap-3 p-4 bg-card border border-border rounded-lg shadow-lg min-w-[320px] max-w-[400px]",
        "animate-in slide-in-from-top-2 duration-300",
        className
      )}
    >
      {/* Profile Image - Full height on left */}
      <div className="flex-shrink-0">
        <Avatar className="h-10 w-10">
          <AvatarImage 
            src={profileImage || undefined} 
            alt={`${authorName}'s avatar`}
            className="object-cover"
          />
          <AvatarFallback className="bg-primary/10 text-primary font-medium text-sm">
            {getInitials(authorName)}
          </AvatarFallback>
        </Avatar>
      </div>

      {/* Content Area */}
      <div className="flex-1 min-w-0 space-y-1">
        {/* Author and Message */}
        <div className="space-y-0.5">
          <p className="font-medium text-sm text-foreground leading-tight">
            {authorName}
          </p>
          <p className="text-sm text-muted-foreground leading-tight">
            {message}
          </p>
        </div>

        {/* Action Button */}
        {action && (
          <div className="pt-1">
            <Button
              variant="outline"
              size="sm"
              onClick={action.onClick}
              className="h-7 px-3 text-xs font-medium"
            >
              {action.label}
            </Button>
          </div>
        )}
      </div>

      {/* Dismiss Button */}
      {onDismiss && (
        <div className="flex-shrink-0">
          <Button
            variant="ghost"
            size="sm"
            onClick={onDismiss}
            className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground"
          >
            <X className="h-3 w-3" />
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