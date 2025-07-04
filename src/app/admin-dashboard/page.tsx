'use client';

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { useSearchParams } from 'next/navigation';
import { useEffectiveTheme } from '@/hooks/useEffectiveTheme';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  Users, 
  MessageSquare, 
  TrendingUp,
  Search,
  ChevronLeft,
  ChevronRight,
  Activity,
  BarChart3,
  ArrowLeft,
  Zap
} from 'lucide-react';
import { authFetchJson } from '@/utils/authFetch';
import { 
  AreaChart, 
  Area, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer
} from 'recharts';
import type { DashboardStats } from '@/app/api/admin/dashboard/stats/route';
import type { AdminUsersResponse } from '@/app/api/admin/users/route';
import Link from 'next/link';

export default function AdminDashboardPage() {
  const { user, token } = useAuth();
  const searchParams = useSearchParams();
  const [userSearch, setUserSearch] = useState('');
  const [userPage, setUserPage] = useState(1);
  
  // Use the effective theme from our theme orchestrator
  const theme = useEffectiveTheme();

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

  // Fetch dashboard statistics
  const { data: stats, isLoading: isLoadingStats, error: statsError } = useQuery<DashboardStats>({
    queryKey: ['dashboardStats'],
    queryFn: async () => {
      if (!token) throw new Error('No auth token');
      return authFetchJson<DashboardStats>('/api/admin/dashboard/stats', { token });
    },
    enabled: !!token && !!user?.isAdmin,
    refetchInterval: 5 * 60 * 1000, // Refresh every 5 minutes
  });

  // Fetch users with pagination
  const { data: usersData, isLoading: isLoadingUsers } = useQuery<AdminUsersResponse>({
    queryKey: ['adminUsers', userPage, userSearch],
    queryFn: async () => {
      if (!token) throw new Error('No auth token');
      const params = new URLSearchParams({
        page: userPage.toString(),
        limit: '10',
        ...(userSearch && { search: userSearch })
      });
      return authFetchJson<AdminUsersResponse>(`/api/admin/users?${params}`, { token });
    },
    enabled: !!token && !!user?.isAdmin,
  });

  // Admin access control
  if (user && !user.isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <h1 className="text-2xl font-semibold text-red-600 dark:text-red-400">
            Access Denied
          </h1>
          <p className="text-slate-600 dark:text-slate-400">
            You need admin permissions to access the dashboard.
          </p>
          <Link href={buildUrl('/')}>
            <Button variant="outline">
              <ArrowLeft size={16} className="mr-2" />
              Back to Home
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  if (isLoadingStats) {
    return (
      <div className="min-h-screen">
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-4xl mx-auto">
            <div className="animate-pulse space-y-6">
              <div className="h-8 w-64 rounded bg-slate-200 dark:bg-slate-700" />
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {[1, 2, 3, 4].map(i => (
                  <div key={i} className="h-32 rounded-xl bg-slate-200 dark:bg-slate-700" />
                ))}
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="h-80 rounded-xl bg-slate-200 dark:bg-slate-700" />
                <div className="h-80 rounded-xl bg-slate-200 dark:bg-slate-700" />
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (statsError) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="text-2xl font-semibold text-red-600 dark:text-red-400">
            Failed to load dashboard data
          </div>
          <p className="text-slate-600 dark:text-slate-400">
            {(statsError as Error).message}
          </p>
          <Link href={buildUrl('/')}>
            <Button variant="outline">
              <ArrowLeft size={16} className="mr-2" />
              Back to Home
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  if (!stats) return null;

  // Chart colors for consistent theming
  const chartColors = {
    primary: theme === 'dark' ? '#3b82f6' : '#2563eb',
    secondary: theme === 'dark' ? '#10b981' : '#059669',
    tertiary: theme === 'dark' ? '#f59e0b' : '#d97706',
    quaternary: theme === 'dark' ? '#ef4444' : '#dc2626',
    muted: theme === 'dark' ? '#6b7280' : '#9ca3af'
  };

  // Format number with commas
  const formatNumber = (num: number) => {
    return new Intl.NumberFormat().format(num);
  };

  // Format date for charts
  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  // Calculate growth percentages
  const userGrowthPercent = stats.totalUsers > 0 
    ? Math.round((stats.newUsersThisWeek / stats.totalUsers) * 100 * 100) / 100 
    : 0;
  
  const postGrowthPercent = stats.totalPosts > 0 
    ? Math.round((stats.postsThisWeek / stats.totalPosts) * 100 * 100) / 100 
    : 0;

  return (
    <div className="min-h-screen">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <Card variant="header" className="mb-8 p-6">
            <Link href={buildUrl('/')}>
              <Button variant="ghost" className="mb-4">
                <ArrowLeft size={16} className="mr-2" />
                Back to Home
              </Button>
            </Link>
            <div className="flex items-center gap-3 mb-2">
              <BarChart3 size={32} className="text-primary" />
              <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100">
                Admin Dashboard
              </h1>
            </div>
            <p className="text-slate-600 dark:text-slate-400">
              Community analytics and user management
            </p>
          </Card>

          {/* Key Metrics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {/* Total Users */}
            <Card className="relative overflow-hidden">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Users</CardTitle>
                <Users size={16} className="text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatNumber(stats.totalUsers)}</div>
                <p className="text-xs text-muted-foreground">
                  +{stats.newUsersThisWeek} this week ({userGrowthPercent}%)
                </p>
              </CardContent>
              <div className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 to-blue-600" />
            </Card>

            {/* Total Posts */}
            <Card className="relative overflow-hidden">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Posts</CardTitle>
                <MessageSquare size={16} className="text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatNumber(stats.totalPosts)}</div>
                <p className="text-xs text-muted-foreground">
                  +{stats.postsThisWeek} this week ({postGrowthPercent}%)
                </p>
              </CardContent>
              <div className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-green-500 to-green-600" />
            </Card>

            {/* Active Users */}
            <Card className="relative overflow-hidden">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Active This Week</CardTitle>
                <Activity size={16} className="text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatNumber(stats.activeUsersThisWeek)}</div>
                <p className="text-xs text-muted-foreground">
                  {stats.totalUsers > 0 
                    ? Math.round((stats.activeUsersThisWeek / stats.totalUsers) * 100)
                    : 0}% of total users
                </p>
              </CardContent>
              <div className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-orange-500 to-orange-600" />
            </Card>

            {/* Engagement Rate */}
            <Card className="relative overflow-hidden">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Avg Comments/Post</CardTitle>
                <Zap size={16} className="text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.averageCommentsPerPost.toFixed(1)}</div>
                <p className="text-xs text-muted-foreground">
                  {formatNumber(stats.totalComments)} total comments
                </p>
              </CardContent>
              <div className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-purple-500 to-purple-600" />
            </Card>
          </div>

          {/* Charts Section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            {/* User Growth Chart */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp size={20} />
                  User Growth (30 Days)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={stats.userGrowthData}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                    <XAxis 
                      dataKey="date" 
                      tickFormatter={formatDate}
                      fontSize={12}
                    />
                    <YAxis fontSize={12} />
                    <Tooltip 
                      labelFormatter={(value) => formatDate(value as string)}
                      formatter={(value: number, name: string) => [
                        formatNumber(value), 
                        name === 'users' ? 'Total Users' : 'New Users'
                      ]}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="users" 
                      stroke={chartColors.primary} 
                      fill={`${chartColors.primary}20`}
                      strokeWidth={2}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="newUsers" 
                      stroke={chartColors.secondary} 
                      fill={`${chartColors.secondary}20`}
                      strokeWidth={2}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Post Activity Chart */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 size={20} />
                  Content Activity (30 Days)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={stats.postActivityData}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                    <XAxis 
                      dataKey="date" 
                      tickFormatter={formatDate}
                      fontSize={12}
                    />
                    <YAxis fontSize={12} />
                    <Tooltip 
                      labelFormatter={(value) => formatDate(value as string)}
                      formatter={(value: number, name: string) => [
                        formatNumber(value), 
                        name === 'posts' ? 'Posts' : 'Comments'
                      ]}
                    />
                    <Bar 
                      dataKey="posts" 
                      fill={chartColors.tertiary}
                      radius={[2, 2, 0, 0]}
                    />
                    <Bar 
                      dataKey="comments" 
                      fill={chartColors.secondary}
                      radius={[2, 2, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Top Boards */}
          <Card className="mb-8">
            <CardHeader>
              <CardTitle>Most Active Boards</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {stats.topBoards.slice(0, 5).map((board, index) => (
                  <div key={board.id} className="flex items-center justify-between p-3 rounded-lg border">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-medium">
                        {index + 1}
                      </div>
                      <div>
                        <h3 className="font-medium">{board.name}</h3>
                        <p className="text-sm text-muted-foreground">
                          {formatNumber(board.postCount)} posts • {formatNumber(board.commentCount)} comments
                        </p>
                      </div>
                    </div>
                    <Badge variant="secondary">
                      {formatNumber(board.postCount + board.commentCount)} total
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* User Management Section */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Users size={20} />
                  User Management
                </CardTitle>
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <Search size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
                    <Input
                      placeholder="Search users..."
                      value={userSearch}
                      onChange={(e) => {
                        setUserSearch(e.target.value);
                        setUserPage(1); // Reset to first page on search
                      }}
                      className="pl-9 w-64"
                    />
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {isLoadingUsers ? (
                <div className="space-y-4">
                  {[1, 2, 3, 4, 5].map(i => (
                    <div key={i} className="flex items-center gap-4 p-4 rounded-lg border animate-pulse">
                      <div className="w-10 h-10 rounded-full bg-slate-200 dark:bg-slate-700" />
                      <div className="flex-1 space-y-2">
                        <div className="h-4 w-32 bg-slate-200 dark:bg-slate-700 rounded" />
                        <div className="h-3 w-48 bg-slate-200 dark:bg-slate-700 rounded" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : usersData ? (
                <>
                  <div className="space-y-4">
                    {usersData.users.map((user) => (
                      <div key={user.user_id} className="flex items-center justify-between p-4 rounded-lg border hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                        <div className="flex items-center gap-4">
                          <Avatar>
                            <AvatarImage src={user.profile_picture_url || ''} />
                            <AvatarFallback>
                              {user.name.charAt(0).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <div className="flex items-center gap-2">
                              <h3 className="font-medium">{user.name}</h3>
                              {user.isAdmin && (
                                <Badge variant="destructive" className="text-xs">Admin</Badge>
                              )}
                            </div>
                            <p className="text-sm text-muted-foreground">
                              Joined {new Date(user.created_at).toLocaleDateString()}
                              {user.last_active && (
                                <> • Last active {new Date(user.last_active).toLocaleDateString()}</>
                              )}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-medium">
                            {formatNumber(user.stats.posts_count)} posts
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {formatNumber(user.stats.comments_count)} comments
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Pagination */}
                  {usersData.pagination.totalPages > 1 && (
                    <div className="flex items-center justify-between mt-6 pt-6 border-t">
                      <div className="text-sm text-muted-foreground">
                        Showing {((usersData.pagination.page - 1) * usersData.pagination.limit) + 1} to{' '}
                        {Math.min(usersData.pagination.page * usersData.pagination.limit, usersData.pagination.total)} of{' '}
                        {formatNumber(usersData.pagination.total)} users
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setUserPage(prev => Math.max(1, prev - 1))}
                          disabled={!usersData.pagination.hasPrev}
                        >
                          <ChevronLeft size={16} />
                          Previous
                        </Button>
                        <span className="text-sm px-3 py-1 rounded border">
                          {usersData.pagination.page} of {usersData.pagination.totalPages}
                        </span>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setUserPage(prev => prev + 1)}
                          disabled={!usersData.pagination.hasNext}
                        >
                          Next
                          <ChevronRight size={16} />
                        </Button>
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  No users found
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}