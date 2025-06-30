import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import {
  Shield,
  CheckCircle,
  AlertCircle,
  Clock,
  Zap,
  Lock,
  Key,
  Users,
  Coins,
  Star,
  ArrowRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface RequirementProgress {
  id: string;
  name: string;
  type: 'token' | 'social' | 'identity' | 'balance';
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  progress: number; // 0-100
  description: string;
  metadata?: {
    current?: string | number;
    required?: string | number;
    unit?: string;
    icon?: string;
  };
}

interface GatingProgressIndicatorProps {
  requirements: RequirementProgress[];
  overallProgress: number;
  fulfillmentMode: 'any' | 'all';
  isVerified: boolean;
  isLoading: boolean;
  onStartVerification?: () => void;
  onRetry?: (requirementId: string) => void;
  className?: string;
}

const REQUIREMENT_ICONS = {
  token: Coins,
  social: Users,
  identity: Key,
  balance: Star,
};

const STATUS_COLORS = {
  pending: 'text-muted-foreground bg-muted',
  in_progress: 'text-blue-600 bg-blue-50 dark:bg-blue-950',
  completed: 'text-green-600 bg-green-50 dark:bg-green-950',
  failed: 'text-red-600 bg-red-50 dark:bg-red-950',
};

export const GatingProgressIndicator: React.FC<GatingProgressIndicatorProps> = ({
  requirements,
  overallProgress,
  fulfillmentMode,
  isVerified,
  isLoading,
  onStartVerification,
  onRetry,
  className,
}) => {
  const completedCount = requirements.filter(req => req.status === 'completed').length;
  const failedCount = requirements.filter(req => req.status === 'failed').length;
  const inProgressCount = requirements.filter(req => req.status === 'in_progress').length;

  // const getProgressColor = () => {
  //   if (isVerified) return 'bg-green-500';
  //   if (failedCount > 0) return 'bg-red-500';
  //   if (inProgressCount > 0) return 'bg-blue-500';
  //   return 'bg-muted-foreground';
  // };

  const getStatusIcon = (status: RequirementProgress['status']) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'failed':
        return <AlertCircle className="h-4 w-4 text-red-600" />;
      case 'in_progress':
        return <Clock className="h-4 w-4 text-blue-600 animate-spin" />;
      default:
        return <Shield className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getOverallStatusText = () => {
    if (isVerified) {
      return fulfillmentMode === 'any'
        ? `Access granted! (${completedCount}/${requirements.length} requirements met)`
        : `Full access granted! (${completedCount}/${requirements.length} requirements completed)`;
    }

    if (failedCount > 0) {
      return `${failedCount} requirement${failedCount > 1 ? 's' : ''} failed. Please retry.`;
    }

    if (inProgressCount > 0) {
      return `Verifying ${inProgressCount} requirement${inProgressCount > 1 ? 's' : ''}...`;
    }

    if (fulfillmentMode === 'any') {
      return `Need any 1 of ${requirements.length} requirements to access`;
    }

    return `Need all ${requirements.length} requirements to access`;
  };

  const getOverallStatusColor = () => {
    if (isVerified) return 'text-green-600';
    if (failedCount > 0) return 'text-red-600';
    if (inProgressCount > 0) return 'text-blue-600';
    return 'text-muted-foreground';
  };

  return (
    <Card className={cn('border-l-4', isVerified ? 'border-l-green-500' : 'border-l-blue-500', className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Lock className="h-5 w-5" />
            Gated Content Access
            {isVerified && <CheckCircle className="h-5 w-5 text-green-600" />}
          </CardTitle>
          <Badge 
            variant={isVerified ? 'default' : 'outline'}
            className={cn(
              'font-medium',
              isVerified && 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100'
            )}
          >
            {fulfillmentMode === 'any' ? 'ANY' : 'ALL'} Mode
          </Badge>
        </div>
        
        {/* Overall Progress */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className={getOverallStatusColor()}>
              {getOverallStatusText()}
            </span>
            <span className="text-muted-foreground">
              {Math.round(overallProgress)}%
            </span>
          </div>
          <Progress 
            value={overallProgress} 
            className="h-2"
          />
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Requirements List */}
        <div className="space-y-3">
          {requirements.map((requirement, index) => {
            const Icon = REQUIREMENT_ICONS[requirement.type] || Shield;
            const isActive = requirement.status === 'in_progress';
            const isCompleted = requirement.status === 'completed';
            const isFailed = requirement.status === 'failed';

            return (
              <div
                key={requirement.id}
                className={cn(
                  'p-3 rounded-lg border transition-all duration-300',
                  STATUS_COLORS[requirement.status],
                  isActive && 'ring-2 ring-blue-200 dark:ring-blue-800',
                  'hover:shadow-sm'
                )}
                style={{
                  animationDelay: `${index * 100}ms`,
                  animation: isActive ? 'pulse 2s infinite' : undefined,
                }}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="flex-shrink-0">
                      {getStatusIcon(requirement.status)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <Icon className="h-4 w-4 flex-shrink-0" />
                        <span className="font-medium truncate">{requirement.name}</span>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        {requirement.description}
                      </p>
                      
                      {/* Progress for individual requirement */}
                      {requirement.progress > 0 && requirement.progress < 100 && (
                        <div className="mt-2">
                          <Progress value={requirement.progress} className="h-1" />
                        </div>
                      )}
                      
                      {/* Metadata display */}
                      {requirement.metadata && (
                        <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                          {requirement.metadata.current !== undefined && requirement.metadata.required !== undefined && (
                            <span>
                              {requirement.metadata.current} / {requirement.metadata.required}
                              {requirement.metadata.unit && ` ${requirement.metadata.unit}`}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {/* Action buttons */}
                  <div className="flex items-center gap-2">
                    {isFailed && onRetry && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => onRetry(requirement.id)}
                        className="text-xs"
                      >
                        Retry
                      </Button>
                    )}
                    {isCompleted && (
                      <CheckCircle className="h-5 w-5 text-green-600" />
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Action buttons */}
        {!isVerified && (
          <div className="pt-4 border-t">
            <Button
              onClick={onStartVerification}
              disabled={isLoading}
              className="w-full"
              size="lg"
            >
              {isLoading ? (
                <>
                  <Clock className="h-4 w-4 mr-2 animate-spin" />
                  Verifying...
                </>
              ) : (
                <>
                  <Zap className="h-4 w-4 mr-2" />
                  Start Verification
                  <ArrowRight className="h-4 w-4 ml-2" />
                </>
              )}
            </Button>
          </div>
        )}

        {/* Success state */}
        {isVerified && (
          <div className="pt-4 border-t">
            <div className="flex items-center justify-center gap-2 text-green-600 font-medium">
              <CheckCircle className="h-5 w-5" />
              <span>Access granted! You can now interact with this content.</span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};