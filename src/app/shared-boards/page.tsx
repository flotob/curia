'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { useSearchParams } from 'next/navigation';
import { authFetchJson } from '@/utils/authFetch';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  ArrowLeft, 
  Search, 
  Download, 
  CheckCircle, 
  Clock, 
  MessageSquare,
  AlertCircle,
  Loader2,
  RefreshCw,
  X
} from 'lucide-react';
import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';
import { toast } from '@/hooks/use-toast';
import type { ImportableBoardsData, ImportableBoard, ImportBoardRequest, ImportedBoard } from '@/types/sharedBoards';

export default function SharedBoardsPage() {
  const { token, user } = useAuth();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCommunity, setSelectedCommunity] = useState<string>('all');

  // Get community ID from URL params or auth context
  const communityId = searchParams?.get('communityId') || user?.cid;

  // Fetch importable boards
  const { data: importableData, isLoading, error, refetch } = useQuery({
    queryKey: ['importable-boards', communityId],
    queryFn: async (): Promise<ImportableBoardsData> => {
      if (!communityId) throw new Error('Community ID is required');
      return authFetchJson<ImportableBoardsData>(`/api/communities/${communityId}/importable-boards`, { token });
    },
    enabled: !!token && !!communityId
  });

  // Fetch currently imported boards
  const { data: importedBoards, isLoading: importedBoardsLoading } = useQuery({
    queryKey: ['imported-boards', communityId],
    queryFn: async (): Promise<ImportedBoard[]> => {
      if (!communityId) throw new Error('Community ID is required');
      return authFetchJson<ImportedBoard[]>(`/api/communities/${communityId}/shared-boards`, { token });
    },
    enabled: !!token && !!communityId
  });

  // Import board mutation
  const importBoardMutation = useMutation({
    mutationFn: async (data: ImportBoardRequest) => {
      if (!communityId) throw new Error('Community ID is required');
      return authFetchJson(`/api/communities/${communityId}/import-board`, {
        method: 'POST',
        token,
        body: JSON.stringify(data)
      });
    },
    onSuccess: () => {
      toast({
        title: 'Board Added Successfully',
        description: `The shared board has been added to your sidebar.`
      });
      // Invalidate and refetch relevant queries
      queryClient.invalidateQueries({ queryKey: ['importable-boards', communityId] });
      queryClient.invalidateQueries({ queryKey: ['imported-boards', communityId] });
    },
    onError: (error: Error) => {
      toast({
        title: 'Failed to Add Board',
        description: error.message,
        variant: 'destructive'
      });
    }
  });

  // Undo import mutation
  const undoImportMutation = useMutation({
    mutationFn: async (importedBoardId: number): Promise<{ boardName: string; sourceCommunity: string }> => {
      if (!communityId) throw new Error('Community ID is required');
      return authFetchJson<{ boardName: string; sourceCommunity: string }>(`/api/communities/${communityId}/imported-boards/${importedBoardId}`, {
        method: 'DELETE',
        token
      });
    },
    onSuccess: (data: { boardName: string; sourceCommunity: string }) => {
      toast({
        title: 'Board Removed Successfully',
        description: `"${data.boardName}" has been removed from your sidebar.`
      });
      // Invalidate and refetch relevant queries
      queryClient.invalidateQueries({ queryKey: ['importable-boards', communityId] });
      queryClient.invalidateQueries({ queryKey: ['imported-boards', communityId] });
    },
    onError: (error: Error) => {
      toast({
        title: 'Failed to Remove Board',
        description: error.message,
        variant: 'destructive'
      });
    }
  });

  const partnerships = importableData?.partnerships || [];
  const boards = importableData?.boards || [];

  // Filter boards based on search and community selection
  const filteredBoards = boards.filter(board => {
    const matchesSearch = !searchQuery || 
      board.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      board.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      board.source_community_name.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesCommunity = selectedCommunity === 'all' || 
      board.source_community_id === selectedCommunity;
    
    return matchesSearch && matchesCommunity;
  });

  const handleImportBoard = (board: ImportableBoard) => {
    if (board.is_already_imported) return;
    
    importBoardMutation.mutate({
      sourceBoardId: board.id,
      sourceCommunityId: board.source_community_id
    });
  };

  const handleUndoImport = (importedBoard: ImportedBoard) => {
    undoImportMutation.mutate(importedBoard.id);
  };

  // Show error if no community ID is available
  if (!communityId) {
    return (
      <div className="container mx-auto px-4 py-6 max-w-4xl">
        <Card className="border-yellow-200 dark:border-yellow-800">
          <CardContent className="p-6">
            <div className="text-center text-yellow-600 dark:text-yellow-400">
              <AlertCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <h3 className="text-lg font-semibold mb-2">Community context required</h3>
              <p className="text-sm mb-4">Please access this page from within a community context.</p>
              <Button asChild variant="outline" size="sm">
                <Link href="/">
                  Go Home
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Show error if API call failed
  if (error) {
    return (
      <div className="container mx-auto px-4 py-6 max-w-4xl">
        <Card className="border-red-200 dark:border-red-800">
          <CardContent className="p-6">
            <div className="text-center text-red-600 dark:text-red-400">
              <AlertCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <h3 className="text-lg font-semibold mb-2">Failed to load shared boards</h3>
              <p className="text-sm mb-4">There was an error loading available boards to share.</p>
              <Button onClick={() => refetch()} variant="outline" size="sm">
                Try Again
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-6 max-w-4xl">
      <div className="mb-6">
        <Link href="/partnerships" className="inline-flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 mb-4">
          <ArrowLeft className="h-4 w-4" />
          Back to Partnerships
        </Link>
        
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
              Shared Boards
            </h1>
            <p className="text-gray-600 dark:text-gray-400 text-lg">
              Add boards from partner communities to your sidebar
            </p>
          </div>
          
          {/* Refresh Button */}
          <Button
            onClick={() => {
              refetch();
              queryClient.invalidateQueries({ queryKey: ['imported-boards', communityId] });
            }}
            variant="outline"
            size="sm"
            disabled={isLoading || importedBoardsLoading}
            className="flex items-center gap-2 flex-shrink-0"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading || importedBoardsLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Search and filters */}
      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search boards..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            
            <select
              value={selectedCommunity}
              onChange={(e) => setSelectedCommunity(e.target.value)}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-sm min-w-[200px]"
            >
              <option value="all">All Communities</option>
              {partnerships.map(partnership => (
                <option key={partnership.target_community_id} value={partnership.target_community_id}>
                  {partnership.target_community_name}
                </option>
              ))}
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Currently Imported Boards Section */}
      {importedBoards && importedBoards.length > 0 && (
        <Card className="mb-6 border-green-200 bg-green-50/30 dark:border-green-800 dark:bg-green-900/10">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2 text-green-700 dark:text-green-300">
              <CheckCircle className="h-5 w-5" />
              Currently Added Boards ({importedBoards.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {importedBoards.map((importedBoard) => (
              <div key={importedBoard.id} className="flex items-center justify-between p-3 bg-white dark:bg-gray-800 rounded-lg border">
                <div className="flex items-center gap-3">
                  <Avatar className="h-8 w-8">
                    {importedBoard.source_community_logo_url && (
                      <AvatarImage 
                        src={importedBoard.source_community_logo_url} 
                        alt={importedBoard.source_community_name}
                        className="object-cover"
                      />
                    )}
                    <AvatarFallback className="text-xs">
                      {importedBoard.source_community_name.substring(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="font-medium text-sm">{importedBoard.board_name}</div>
                    <div className="text-xs text-gray-600 dark:text-gray-400">
                      from {importedBoard.source_community_name} • Added {formatDistanceToNow(new Date(importedBoard.imported_at), { addSuffix: true })}
                    </div>
                  </div>
                </div>
                <Button
                  onClick={() => handleUndoImport(importedBoard)}
                  disabled={undoImportMutation.isPending}
                  variant="outline"
                  size="sm"
                  className="text-red-600 border-red-300 hover:bg-red-50 dark:text-red-400 dark:border-red-600 dark:hover:bg-red-900/20"
                >
                  {undoImportMutation.isPending ? (
                    <>
                      <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                      Removing...
                    </>
                  ) : (
                    <>
                      <X className="h-3 w-3 mr-1" />
                      Remove
                    </>
                  )}
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Available Boards Section */}
      <div className="mb-4">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
          Available Boards to Add
        </h2>
        <p className="text-gray-600 dark:text-gray-400 text-sm">
          Boards from partner communities that you can add to your sidebar
        </p>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-32 bg-gray-100 dark:bg-gray-800 rounded-lg animate-pulse" />
          ))}
        </div>
      ) : partnerships.length === 0 ? (
        <Card>
          <CardContent className="p-12">
            <div className="text-center text-gray-500 dark:text-gray-400">
              <Download className="h-16 w-16 mx-auto mb-4 opacity-50" />
              <h3 className="text-lg font-semibold mb-2">No partner communities found</h3>
              <p className="text-sm max-w-md mx-auto mb-6">
                You need partnerships with board sharing enabled to add shared boards. 
                Create partnerships and enable board sharing permission.
              </p>
              <Button asChild>
                <Link href="/partnerships">
                  Manage Partnerships
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : filteredBoards.length === 0 ? (
        <Card>
          <CardContent className="p-12">
            <div className="text-center text-gray-500 dark:text-gray-400">
              <Search className="h-16 w-16 mx-auto mb-4 opacity-50" />
              <h3 className="text-lg font-semibold mb-2">No boards found</h3>
              <p className="text-sm max-w-md mx-auto">
                {searchQuery || selectedCommunity !== 'all'
                  ? 'No boards match your search criteria.'
                  : 'Partner communities have no shareable boards available.'
                }
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredBoards.map((board) => (
            <Card key={`${board.source_community_id}-${board.id}`} className="overflow-hidden">
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-3">
                      <div>
                        <h3 className="text-lg font-semibold">{board.name}</h3>
                        <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                          <Avatar className="h-4 w-4">
                            {board.source_community_logo_url && (
                              <AvatarImage 
                                src={board.source_community_logo_url} 
                                alt={board.source_community_name}
                                className="object-cover"
                              />
                            )}
                            <AvatarFallback className="text-xs">
                              {board.source_community_name.substring(0, 2).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <span>from {board.source_community_name}</span>
                        </div>
                      </div>
                    </div>
                    
                    {board.description && (
                      <p className="text-gray-600 dark:text-gray-400 mb-3">{board.description}</p>
                    )}
                    
                    <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
                      <div className="flex items-center gap-1">
                        <MessageSquare className="h-4 w-4" />
                        <span>{board.post_count} posts</span>
                      </div>
                      
                      <div className="flex items-center gap-1">
                        <Clock className="h-4 w-4" />
                        <span>
                          {board.last_activity 
                            ? `Active ${formatDistanceToNow(new Date(board.last_activity), { addSuffix: true })}`
                            : `Created ${formatDistanceToNow(new Date(board.created_at), { addSuffix: true })}`
                          }
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    {board.is_already_imported ? (
                      <Badge variant="secondary" className="gap-1">
                        <CheckCircle className="h-3 w-3" />
                        Added to Sidebar
                      </Badge>
                    ) : (
                      <Button
                        onClick={() => handleImportBoard(board)}
                        disabled={importBoardMutation.isPending}
                        size="sm"
                      >
                        {importBoardMutation.isPending ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Adding...
                          </>
                        ) : (
                          <>
                            <Download className="h-4 w-4 mr-2" />
                            Add to Sidebar
                          </>
                        )}
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Partnership status summary */}
      {partnerships.length > 0 && (
        <Card className="mt-8 border-blue-200 bg-blue-50/30 dark:border-blue-800 dark:bg-blue-900/10">
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2 text-blue-700 dark:text-blue-300">
              <span>ℹ️</span>
              Partnership Summary
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-blue-600 dark:text-blue-400">
            <p>
              You have board sharing partnerships with {partnerships.length} {partnerships.length === 1 ? 'community' : 'communities'}: {' '}
              {partnerships.map(p => p.target_community_name).join(', ')}.
            </p>
            <p className="mt-2">
              {boards.filter(b => !b.is_already_imported).length} boards available to add, {' '}
              {boards.filter(b => b.is_already_imported).length} already added, {' '}
              {importedBoards?.length || 0} currently in your sidebar.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
} 