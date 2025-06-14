'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Check, 
  ChevronRight
} from 'lucide-react';
import { LockBuilderStep } from '@/types/locks';
import { cn } from '@/lib/utils';

export interface StepInfo {
  key: LockBuilderStep;
  title: string;
  isActive: boolean;
  isComplete: boolean;
  isRequired: boolean;
}

interface LockCreationStepperProps {
  steps: StepInfo[];
  onStepClick: (step: LockBuilderStep) => void;
  className?: string;
}

export const LockCreationStepper: React.FC<LockCreationStepperProps> = ({
  steps,
  onStepClick,
  className = ''
}) => {
  return (
    <div className={cn('overflow-x-auto', className)}>
      <div className="flex items-center space-x-2 min-w-max pb-2">
        {steps.map((step, index) => {
          const isLast = index === steps.length - 1;
          
          return (
            <React.Fragment key={step.key}>
              {/* Step */}
              <div className="flex items-center">
                <Button
                  variant="ghost"
                  onClick={() => onStepClick(step.key)}
                  className={cn(
                    'flex items-center space-x-2 px-3 py-2 h-auto whitespace-nowrap',
                    'hover:bg-muted/50 transition-colors',
                    step.isActive && 'bg-primary/10 text-primary',
                    step.isComplete && !step.isActive && 'text-muted-foreground'
                  )}
                >
                  {/* Step Icon */}
                  <div className={cn(
                    'flex items-center justify-center w-6 h-6 rounded-full border-2 transition-all flex-shrink-0',
                    step.isComplete 
                      ? 'bg-green-500 border-green-500 text-white'
                      : step.isActive 
                        ? 'border-primary bg-primary text-white'
                        : 'border-muted-foreground/30 bg-background'
                  )}>
                    {step.isComplete ? (
                      <Check className="h-3 w-3" />
                    ) : (
                      <span className="text-xs font-medium">
                        {index + 1}
                      </span>
                    )}
                  </div>
                  
                  {/* Step Label - hidden on small screens to save space */}
                  <div className="hidden sm:flex flex-col items-start">
                    <span className={cn(
                      'text-sm font-medium',
                      step.isActive ? 'text-primary' : 'text-foreground'
                    )}>
                      {step.title}
                    </span>
                    
                    {/* Required badge */}
                    {step.isRequired && !step.isComplete && (
                      <Badge variant="outline" className="text-xs mt-1">
                        Required
                      </Badge>
                    )}
                  </div>
                </Button>
              </div>
              
              {/* Separator */}
              {!isLast && (
                <div className="flex items-center px-1">
                  <ChevronRight className={cn(
                    'h-4 w-4 transition-colors flex-shrink-0',
                    step.isComplete 
                      ? 'text-green-500'
                      : 'text-muted-foreground/50'
                  )} />
                </div>
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
}; 