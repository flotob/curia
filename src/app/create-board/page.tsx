'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { authFetchJson } from '@/utils/authFetch';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { ArrowLeft, Plus, Loader2 } from 'lucide-react';
import Link from 'next/link';

export default function CreateBoardPage() {
  const { user, token } = useAuth();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [boardName, setBoardName] = useState('');
  const [boardDescription, setBoardDescription] = useState('');

  const createBoardMutation = useMutation({
    mutationFn: async (data: { name: string; description: string }) => {
      if (!token || !user?.cid) throw new Error('Authentication required');
      
      const response = await authFetchJson(`/api/communities/${user.cid}/boards`, {
        method: 'POST',
        token,
        body: JSON.stringify(data),
      });
      return response;
    },
    onSuccess: () => {
      // Invalidate boards list to refresh sidebar
      queryClient.invalidateQueries({ queryKey: ['boards'] });
      // Redirect to home
      router.push('/');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!boardName.trim()) return;
    
    createBoardMutation.mutate({
      name: boardName.trim(),
      description: boardDescription.trim() || '',
    });
  };

  // Redirect if not admin
  if (!user?.isAdmin && user?.userId !== process.env.NEXT_PUBLIC_SUPERADMIN_ID) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <h1 className="text-2xl font-semibold text-red-600">Access Denied</h1>
          <p className="text-slate-600">You need admin permissions to create boards.</p>
          <Link href="/">
            <Button variant="outline">
              <ArrowLeft size={16} className="mr-2" />
              Back to Home
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <Link href="/">
              <Button variant="ghost" className="mb-4">
                <ArrowLeft size={16} className="mr-2" />
                Back to Home
              </Button>
            </Link>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100">
              Create New Board
            </h1>
            <p className="text-slate-600 dark:text-slate-400 mt-2">
              Create a new discussion board for your community
            </p>
          </div>

          {/* Form */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Plus size={20} className="mr-2" />
                Board Details
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="boardName">Board Name</Label>
                  <Input
                    id="boardName"
                    placeholder="e.g., General Discussion, Announcements, Support"
                    value={boardName}
                    onChange={(e) => setBoardName(e.target.value)}
                    required
                    disabled={createBoardMutation.isPending}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="boardDescription">Description (Optional)</Label>
                  <Textarea
                    id="boardDescription"
                    placeholder="Briefly describe what this board is for..."
                    value={boardDescription}
                    onChange={(e) => setBoardDescription(e.target.value)}
                    rows={3}
                    disabled={createBoardMutation.isPending}
                  />
                </div>

                {createBoardMutation.error && (
                  <div className="p-4 bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-lg">
                    <p className="text-red-600 dark:text-red-400 text-sm">
                      Error: {createBoardMutation.error.message}
                    </p>
                  </div>
                )}

                <div className="flex gap-3 pt-4">
                  <Button
                    type="submit"
                    disabled={!boardName.trim() || createBoardMutation.isPending}
                    className="flex-1"
                  >
                    {createBoardMutation.isPending ? (
                      <>
                        <Loader2 size={16} className="mr-2 animate-spin" />
                        Creating...
                      </>
                    ) : (
                      <>
                        <Plus size={16} className="mr-2" />
                        Create Board
                      </>
                    )}
                  </Button>
                  <Link href="/">
                    <Button variant="outline" disabled={createBoardMutation.isPending}>
                      Cancel
                    </Button>
                  </Link>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
} 