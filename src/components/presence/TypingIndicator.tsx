'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import { MessageSquare, Edit3, PenTool } from 'lucide-react';

// Typing context types
type TypingContext = 'commenting' | 'posting' | 'editing' | 'general';

// Indicator variants
type IndicatorVariant = 'dots' | 'pulse' | 'minimal';

interface TypingIndicatorProps {
  variant?: IndicatorVariant;
  context?: TypingContext;
  postTitle?: string;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  showIcon?: boolean;
}

// Utility to truncate text
const truncateText = (text: string, maxLength: number) => {
  if (text.length <= maxLength) return text;
  return `${text.substring(0, maxLength)}...`;
};

// Animated dots component
const AnimatedDots: React.FC<{ size?: 'sm' | 'md' | 'lg' }> = ({ size = 'md' }) => {
  const dotSizes = {
    sm: 'w-1 h-1',
    md: 'w-1.5 h-1.5', 
    lg: 'w-2 h-2'
  };

  return (
    <div className="flex space-x-0.5 items-center">
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className={cn(
            "bg-current rounded-full",
            dotSizes[size],
            "animate-pulse"
          )}
          style={{
            animationDelay: `${i * 200}ms`,
            animationDuration: '1.4s',
            animationTimingFunction: 'ease-in-out',
            animationIterationCount: 'infinite'
          }}
        />
      ))}
    </div>
  );
};

// Pulse indicator component
const PulseIndicator: React.FC<{ size?: 'sm' | 'md' | 'lg' }> = ({ size = 'md' }) => {
  const sizes = {
    sm: 'w-2 h-2',
    md: 'w-3 h-3',
    lg: 'w-4 h-4'
  };

  return (
    <div className={cn(
      "bg-current rounded-full animate-pulse",
      sizes[size]
    )} />
  );
};

// Get context message
const getContextMessage = (context: TypingContext, postTitle?: string): string => {
  switch (context) {
    case 'commenting':
      return postTitle 
        ? `commenting on "${truncateText(postTitle, 20)}"` 
        : 'commenting';
    case 'posting':
      return 'composing post';
    case 'editing':
      return 'editing';
    case 'general':
    default:
      return 'typing';
  }
};

// Get context icon
const getContextIcon = (context: TypingContext, size: 'sm' | 'md' | 'lg') => {
  const iconSizes = {
    sm: 'h-3 w-3',
    md: 'h-3.5 w-3.5',
    lg: 'h-4 w-4'
  };

  const iconClass = iconSizes[size];

  switch (context) {
    case 'commenting':
      return <MessageSquare className={iconClass} />;
    case 'posting':
      return <PenTool className={iconClass} />;
    case 'editing':
      return <Edit3 className={iconClass} />;
    case 'general':
    default:
      return <MessageSquare className={iconClass} />;
  }
};

export const TypingIndicator: React.FC<TypingIndicatorProps> = ({
  variant = 'dots',
  context = 'general',
  postTitle,
  className,
  size = 'md',
  showIcon = true
}) => {
  const message = getContextMessage(context, postTitle);
  
  const textSizes = {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-base'
  };

  const baseClasses = cn(
    "flex items-center space-x-1.5 text-amber-600 dark:text-amber-400 transition-all duration-200",
    textSizes[size],
    className
  );

  // Render based on variant
  switch (variant) {
    case 'pulse':
      return (
        <div className={baseClasses}>
          {showIcon && getContextIcon(context, size)}
          <PulseIndicator size={size} />
          <span className="font-medium">{message}</span>
        </div>
      );

    case 'minimal':
      return (
        <div className={baseClasses}>
          <div className={cn(
            "w-1.5 h-1.5 bg-current rounded-full animate-pulse",
            size === 'sm' && 'w-1 h-1',
            size === 'lg' && 'w-2 h-2'
          )} />
          <span className="font-medium">typing</span>
        </div>
      );

    case 'dots':
    default:
      return (
        <div className={baseClasses}>
          {showIcon && getContextIcon(context, size)}
          <AnimatedDots size={size} />
          <span className="font-medium">{message}</span>
        </div>
      );
  }
};

// Export components for reuse
export { AnimatedDots, PulseIndicator };

// Export types
export type { TypingContext, IndicatorVariant, TypingIndicatorProps }; 