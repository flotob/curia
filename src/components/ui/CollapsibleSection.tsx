import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CollapsibleSectionProps {
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
  defaultExpanded?: boolean;
  summary?: React.ReactNode; // Content to show when collapsed
  children: React.ReactNode; // Content to show when expanded
  className?: string;
  headerClassName?: string;
  contentClassName?: string;
}

export const CollapsibleSection: React.FC<CollapsibleSectionProps> = ({
  title,
  subtitle,
  icon,
  defaultExpanded = false,
  summary,
  children,
  className = '',
  headerClassName = '',
  contentClassName = ''
}) => {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  return (
    <Card className={className} data-collapsible-section>
      <CardHeader 
        className={cn(
          'cursor-pointer hover:bg-muted/50 transition-colors',
          !isExpanded && 'pb-6', // More padding when collapsed
          headerClassName
        )}
        onClick={() => setIsExpanded(!isExpanded)}
        data-collapsible-trigger
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            {icon && (
              <div className="flex-shrink-0">
                {icon}
              </div>
            )}
            <div>
              <CardTitle className="text-base font-semibold">
                {title}
              </CardTitle>
              {subtitle && (
                <p className="text-sm text-muted-foreground mt-1">
                  {subtitle}
                </p>
              )}
            </div>
          </div>
          
          <div className="flex items-center space-x-3">
            {/* Summary content when collapsed */}
            {!isExpanded && summary && (
              <div className="text-sm text-muted-foreground">
                {summary}
              </div>
            )}
            
            {/* Expand/Collapse button */}
            <Button
              variant="ghost"
              size="sm"
              className="p-1 h-auto"
              onClick={(e) => {
                e.stopPropagation();
                setIsExpanded(!isExpanded);
              }}
            >
              {isExpanded ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>
      </CardHeader>
      
      {isExpanded && (
        <CardContent className={cn('pt-0', contentClassName)}>
          {children}
        </CardContent>
      )}
    </Card>
  );
}; 