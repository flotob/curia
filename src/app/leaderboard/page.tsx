'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { useSearchParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

import { 
  Trophy, 
  Crown, 
  Medal, 
  Star,
  MessageSquare, 
  FileText, 
  Heart, 
  Lock, 
  CheckCircle,
  TrendingUp,
  Zap,
  ArrowLeft,
  RefreshCw
} from 'lucide-react';
import { authFetchJson } from '@/utils/authFetch';
import { formatTimeSinceLastVisit } from '@/utils/dateUtils';
import Link from 'next/link';

export interface LeaderboardUser {
  user_id: string;
  name: string;
  profile_picture_url?: string;
  score: number;
  rank: number;
  change_from_last_week?: number; // Position change
  badge?: 'winner' | 'runner_up' | 'third_place';
  additional_stats?: Record<string, number>;
}

export interface LeaderboardCategory {
  id: string;
  name: string;
  description: string;
  icon: string;
  users: LeaderboardUser[];
  metric_name: string;
  period: 'all_time' | 'this_month' | 'this_week';
}

export interface LeaderboardResponse {
  categories: LeaderboardCategory[];
  community_id: string;
  community_name: string;
  updated_at: string;
  current_user_rankings?: Record<string, { rank: number; score: number }>;
}

export default function LeaderboardPage() {
  const { user, token } = useAuth();
  const searchParams = useSearchParams();
  const [selectedPeriod, setSelectedPeriod] = useState<'all_time' | 'this_month' | 'this_week'>('this_month');

  // Helper function to preserve existing URL params
  const buildUrl = (path: string, additionalParams: Record<string, string> = {}) => {
    const params = new URLSearchParams();
    
    // Preserve existing params
    if (searchParams) {
      searchParams.forEach((value, key) => {
        params.set(key, value);
      });
    }
    
    // Add/override with new params
    Object.entries(additionalParams).forEach(([key, value]) => {
      params.set(key, value);
    });
    
    return `${path}?${params.toString()}`;
  };

  // Fetch leaderboard data
  const { data: leaderboard, isLoading, error, refetch } = useQuery<LeaderboardResponse>({
    queryKey: ['leaderboard', selectedPeriod],
    queryFn: async () => {
      if (!token) throw new Error('Authentication required');
      return authFetchJson<LeaderboardResponse>(`/api/leaderboard?period=${selectedPeriod}`, { token });
    },
    enabled: !!token,
    refetchInterval: 5 * 60 * 1000, // Refresh every 5 minutes
    staleTime: 2 * 60 * 1000, // Consider data stale after 2 minutes
  });

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat().format(num);
  };

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return <Crown className="w-5 h-5 text-yellow-500" />;
      case 2:
        return <Medal className="w-5 h-5 text-gray-400" />;
      case 3:
        return <Medal className="w-5 h-5 text-amber-600" />;
      default:
        return <span className="w-5 h-5 flex items-center justify-center text-sm font-medium text-muted-foreground">#{rank}</span>;
    }
  };

  const getCategoryIcon = (iconName: string) => {
    const iconMap: Record<string, React.ReactNode> = {
      'file-text': <FileText className="w-5 h-5" />,
      'message-square': <MessageSquare className="w-5 h-5" />,
      'heart': <Heart className="w-5 h-5" />,
      'lock': <Lock className="w-5 h-5" />,
      'check-circle': <CheckCircle className="w-5 h-5" />,
      'zap': <Zap className="w-5 h-5" />,
      'trending-up': <TrendingUp className="w-5 h-5" />,
    };
    return iconMap[iconName] || <Star className="w-5 h-5" />;
  };

  const getChangeIndicator = (change?: number) => {
    if (change === undefined || change === 0) return null;
    
    const isImprovement = change > 0; // Positive change means rank improved (lower number)
    const absChange = Math.abs(change);
    
    return (
      <Badge 
        variant={isImprovement ? "default" : "secondary"} 
        className={`ml-2 text-xs ${isImprovement ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'}`}
      >
        {isImprovement ? '↑' : '↓'} {absChange}
      </Badge>
    );
  };

  if (isLoading) {
    return (
      <div className="min-h-screen">
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-6xl mx-auto">
            <div className="animate-pulse space-y-6">
              <div className="h-8 w-64 rounded bg-slate-200 dark:bg-slate-700" />
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[1, 2, 3, 4, 5, 6].map(i => (
                  <div key={i} className="h-96 rounded-xl bg-slate-200 dark:bg-slate-700" />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="text-2xl font-semibold text-red-600 dark:text-red-400">
            Failed to load leaderboard
          </div>
          <p className="text-slate-600 dark:text-slate-400">
            {(error as Error).message}
          </p>
          <div className="flex gap-4 justify-center">
            <Button onClick={() => refetch()} variant="outline">
              <RefreshCw size={16} className="mr-2" />
              Try Again
            </Button>
            <Link href={buildUrl('/')}>
              <Button variant="outline">
                <ArrowLeft size={16} className="mr-2" />
                Back to Home
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (!leaderboard) return null;

  return (
    <div className="min-h-screen">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <Link href={buildUrl('/')}>
              <Button variant="ghost" className="mb-4">
                <ArrowLeft size={16} className="mr-2" />
                Back to Home
              </Button>
            </Link>
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 rounded-lg bg-gradient-to-br from-yellow-400 to-orange-500">
                <Trophy size={32} className="text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100">
                  Community Champions
                </h1>
                <p className="text-slate-600 dark:text-slate-400">
                  Top contributors in {leaderboard.community_name} • Updated {formatTimeSinceLastVisit(leaderboard.updated_at)}
                </p>
              </div>
            </div>

            {/* Period Selector */}
            <div className="flex items-center gap-2 mb-6">
              <span className="text-sm font-medium text-muted-foreground">Time Period:</span>
              <div className="flex bg-muted rounded-lg p-1">
                {[
                  { key: 'this_week' as const, label: 'This Week' },
                  { key: 'this_month' as const, label: 'This Month' },
                  { key: 'all_time' as const, label: 'All Time' }
                ].map(period => (
                  <Button
                    key={period.key}
                    variant={selectedPeriod === period.key ? "default" : "ghost"}
                    size="sm"
                    onClick={() => setSelectedPeriod(period.key)}
                    className="text-xs"
                  >
                    {period.label}
                  </Button>
                ))}
              </div>
            </div>
          </div>

          {/* Current User Rankings Summary */}
          {leaderboard.current_user_rankings && user && (
            <Card className="mb-8 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border-blue-200 dark:border-blue-800">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-blue-900 dark:text-blue-100">
                  <Star className="w-5 h-5" />
                  Your Rankings
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {Object.entries(leaderboard.current_user_rankings).map(([categoryId, ranking]) => {
                    const category = leaderboard.categories.find(c => c.id === categoryId);
                    if (!category) return null;
                    
                    return (
                      <div key={categoryId} className="text-center">
                        <div className="text-2xl font-bold text-blue-900 dark:text-blue-100">
                          #{ranking.rank}
                        </div>
                        <div className="text-sm text-blue-700 dark:text-blue-300">
                          {category.name}
                        </div>
                        <div className="text-xs text-blue-600 dark:text-blue-400">
                          {formatNumber(ranking.score)} {category.metric_name}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Categories Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {leaderboard.categories.map((category) => (
              <Card key={category.id} className="overflow-hidden">
                <CardHeader className="bg-gradient-to-r from-slate-50 to-slate-100 dark:from-slate-800 dark:to-slate-700">
                  <CardTitle className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-white dark:bg-slate-600 shadow-sm">
                      {getCategoryIcon(category.icon)}
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold">{category.name}</h3>
                      <p className="text-sm text-muted-foreground font-normal">
                        {category.description}
                      </p>
                    </div>
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="space-y-1">
                    {category.users.slice(0, 10).map((user, index) => (
                      <div key={user.user_id} className={`flex items-center justify-between p-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors ${index === 0 ? 'bg-gradient-to-r from-yellow-50 to-amber-50 dark:from-yellow-900/20 dark:to-amber-900/20' : ''}`}>
                        <div className="flex items-center gap-3">
                          <div className="flex items-center justify-center w-8 h-8">
                            {getRankIcon(user.rank)}
                          </div>
                          <Avatar className={index === 0 ? 'ring-2 ring-yellow-400' : ''}>
                            <AvatarImage src={user.profile_picture_url || ''} />
                            <AvatarFallback className={index === 0 ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' : ''}>
                              {user.name.charAt(0).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <div className="flex items-center gap-1">
                              <span className={`font-medium ${index === 0 ? 'text-yellow-800 dark:text-yellow-200' : ''}`}>
                                {user.name}
                              </span>
                              {index === 0 && (
                                <Crown className="w-4 h-4 text-yellow-500 ml-1" />
                              )}
                              {getChangeIndicator(user.change_from_last_week)}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {formatNumber(user.score)} {category.metric_name}
                            </div>
                          </div>
                        </div>
                        
                        {index === 0 && (
                          <Badge className="bg-gradient-to-r from-yellow-400 to-orange-500 text-white border-0">
                            Champion
                          </Badge>
                        )}
                      </div>
                    ))}
                    
                    {category.users.length === 0 && (
                      <div className="p-8 text-center text-muted-foreground">
                        <div className="text-4xl mb-2">🏆</div>
                        <p>No champions yet!</p>
                        <p className="text-sm">Be the first to claim this title.</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Footer */}
          <div className="mt-12 text-center text-sm text-muted-foreground">
            <p>
              Rankings are updated every hour. Keep engaging to climb the leaderboards! 🚀
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}