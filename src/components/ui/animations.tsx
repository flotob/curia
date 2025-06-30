import React from 'react';
import { cn } from '@/lib/utils';

// Smooth entrance animations
export const FadeIn: React.FC<{
  children: React.ReactNode;
  delay?: number;
  duration?: number;
  className?: string;
}> = ({ children, delay = 0, duration = 300, className }) => {
  return (
    <div
      className={cn(
        'animate-in fade-in-0 slide-in-from-bottom-4',
        className
      )}
      style={{
        animationDelay: `${delay}ms`,
        animationDuration: `${duration}ms`,
        animationFillMode: 'both',
      }}
    >
      {children}
    </div>
  );
};

// Scale animations for interactions
export const ScaleIn: React.FC<{
  children: React.ReactNode;
  delay?: number;
  className?: string;
}> = ({ children, delay = 0, className }) => {
  return (
    <div
      className={cn(
        'animate-in zoom-in-95 fade-in-0',
        className
      )}
      style={{
        animationDelay: `${delay}ms`,
        animationDuration: '200ms',
        animationFillMode: 'both',
      }}
    >
      {children}
    </div>
  );
};

// Slide animations for navigation
export const SlideInFromLeft: React.FC<{
  children: React.ReactNode;
  delay?: number;
  className?: string;
}> = ({ children, delay = 0, className }) => {
  return (
    <div
      className={cn(
        'animate-in slide-in-from-left-5 fade-in-0',
        className
      )}
      style={{
        animationDelay: `${delay}ms`,
        animationDuration: '300ms',
        animationFillMode: 'both',
      }}
    >
      {children}
    </div>
  );
};

export const SlideInFromRight: React.FC<{
  children: React.ReactNode;
  delay?: number;
  className?: string;
}> = ({ children, delay = 0, className }) => {
  return (
    <div
      className={cn(
        'animate-in slide-in-from-right-5 fade-in-0',
        className
      )}
      style={{
        animationDelay: `${delay}ms`,
        animationDuration: '300ms',
        animationFillMode: 'both',
      }}
    >
      {children}
    </div>
  );
};

// Stagger animation for lists
export const StaggerChildren: React.FC<{
  children: React.ReactNode;
  staggerDelay?: number;
  className?: string;
}> = ({ children, staggerDelay = 100, className }) => {
  const childrenArray = React.Children.toArray(children);
  
  return (
    <div className={className}>
      {childrenArray.map((child, index) => (
        <FadeIn key={index} delay={index * staggerDelay}>
          {child}
        </FadeIn>
      ))}
    </div>
  );
};

// Bouncy button animation
export const BounceButton: React.FC<{
  children: React.ReactNode;
  onClick?: () => void;
  className?: string;
  disabled?: boolean;
}> = ({ children, onClick, className, disabled }) => {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'transition-all duration-200 ease-out',
        'hover:scale-105 active:scale-95',
        'disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none',
        className
      )}
    >
      {children}
    </button>
  );
};

// Ripple effect component
export const RippleEffect: React.FC<{
  children: React.ReactNode;
  className?: string;
  color?: string;
}> = ({ children, className, color = 'bg-white/30' }) => {
  const [ripples, setRipples] = React.useState<Array<{ x: number; y: number; id: number }>>([]);

  const addRipple = (event: React.MouseEvent<HTMLDivElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const size = Math.max(rect.width, rect.height);
    const x = event.clientX - rect.left - size / 2;
    const y = event.clientY - rect.top - size / 2;
    
    const newRipple = {
      x,
      y,
      id: Date.now(),
    };

    setRipples(prev => [...prev, newRipple]);

    // Remove ripple after animation
    setTimeout(() => {
      setRipples(prev => prev.filter(ripple => ripple.id !== newRipple.id));
    }, 600);
  };

  return (
    <div
      className={cn('relative overflow-hidden', className)}
      onClick={addRipple}
    >
      {children}
      {ripples.map(ripple => (
        <span
          key={ripple.id}
          className={cn(
            'absolute rounded-full animate-ping pointer-events-none',
            color
          )}
          style={{
            left: ripple.x,
            top: ripple.y,
            width: '100px',
            height: '100px',
            animationDuration: '600ms',
            animationIterationCount: 1,
          }}
        />
      ))}
    </div>
  );
};

// Floating animation for decorative elements
export const Float: React.FC<{
  children: React.ReactNode;
  duration?: number;
  delay?: number;
  className?: string;
}> = ({ children, duration = 3000, delay = 0, className }) => {
  return (
    <div
      className={cn('animate-bounce', className)}
      style={{
        animationDuration: `${duration}ms`,
        animationDelay: `${delay}ms`,
        animationIterationCount: 'infinite',
        animationDirection: 'alternate',
      }}
    >
      {children}
    </div>
  );
};

// Glow effect for highlights
export const GlowEffect: React.FC<{
  children: React.ReactNode;
  isActive?: boolean;
  color?: string;
  className?: string;
}> = ({ children, isActive = false, color = 'blue', className }) => {
  return (
    <div
      className={cn(
        'transition-all duration-300',
        isActive && [
          `ring-2 ring-${color}-200 dark:ring-${color}-800`,
          `shadow-lg shadow-${color}-100 dark:shadow-${color}-900/30`,
          'scale-[1.02]',
        ],
        className
      )}
    >
      {children}
    </div>
  );
};

// Shimmer loading effect
export const ShimmerLoading: React.FC<{
  className?: string;
  lines?: number;
}> = ({ className, lines = 3 }) => {
  return (
    <div className={cn('animate-pulse space-y-2', className)}>
      {Array.from({ length: lines }).map((_, i) => (
        <div
          key={i}
          className={cn(
            'h-4 bg-muted rounded',
            i === lines - 1 && 'w-3/4', // Last line shorter
            i === 0 && 'w-1/4', // First line shorter for variety
          )}
        />
      ))}
    </div>
  );
};

// Typing indicator
export const TypingIndicator: React.FC<{
  className?: string;
}> = ({ className }) => {
  return (
    <div className={cn('flex items-center space-x-1', className)}>
      <div className="flex space-x-1">
        <div className="w-2 h-2 bg-current rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
        <div className="w-2 h-2 bg-current rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
        <div className="w-2 h-2 bg-current rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
      </div>
    </div>
  );
};

// Success checkmark animation
export const SuccessCheck: React.FC<{
  isVisible?: boolean;
  size?: number;
  className?: string;
}> = ({ isVisible = true, size = 20, className }) => {
  return (
    <div
      className={cn(
        'transition-all duration-500',
        isVisible ? 'opacity-100 scale-100' : 'opacity-0 scale-0',
        className
      )}
    >
      <svg
        width={size}
        height={size}
        viewBox="0 0 20 20"
        fill="none"
        className="text-green-600"
      >
        <circle
          cx="10"
          cy="10"
          r="9"
          stroke="currentColor"
          strokeWidth="2"
          className="animate-in zoom-in-75 fade-in duration-300"
        />
        <path
          d="6 10l3 3 5-6"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="animate-in draw-in duration-500"
          style={{ animationDelay: '200ms' }}
        />
      </svg>
    </div>
  );
};

// Progress circle animation
export const ProgressCircle: React.FC<{
  progress: number; // 0-100
  size?: number;
  strokeWidth?: number;
  className?: string;
}> = ({ progress, size = 40, strokeWidth = 3, className }) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const strokeDasharray = circumference;
  const strokeDashoffset = circumference - (progress / 100) * circumference;

  return (
    <div className={cn('relative', className)}>
      <svg width={size} height={size} className="transform -rotate-90">
        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="currentColor"
          strokeWidth={strokeWidth}
          fill="none"
          className="text-muted opacity-20"
        />
        {/* Progress circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="currentColor"
          strokeWidth={strokeWidth}
          fill="none"
          strokeLinecap="round"
          style={{
            strokeDasharray,
            strokeDashoffset,
            transition: 'stroke-dashoffset 0.5s ease-in-out',
          }}
          className="text-primary"
        />
      </svg>
      {/* Progress text */}
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-xs font-medium">{Math.round(progress)}%</span>
      </div>
    </div>
  );
};