'use client';

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { authFetchJson } from '@/utils/authFetch';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus, Search, Handshake } from 'lucide-react';
import PartnershipCard from './PartnershipCard';
import CreatePartnershipModal from './CreatePartnershipModal';
import { PartnershipListResponse, PartnershipStatus } from '@/types/partnerships';

interface PartnershipManagerProps {
  mode?: 'page' | 'embedded' | 'widget';
  showCreateButton?: boolean;
  maxItems?: number;
  className?: string;
}

export default function PartnershipManager({ 
  mode = 'page', 
  showCreateButton = true, 
  maxItems,
  className = '' 
}: PartnershipManagerProps) {
  const { token } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<PartnershipStatus | 'all'>('all');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  // Fetch partnerships
  const { data: partnershipsData, isLoading, error, refetch } = useQuery({
    queryKey: ['partnerships', statusFilter, searchQuery],
    queryFn: async (): Promise<PartnershipListResponse> => {
      const params = new URLSearchParams();
      if (statusFilter !== 'all') params.set('status', statusFilter);
      if (searchQuery.trim()) params.set('search', searchQuery.trim());
      if (maxItems) params.set('limit', maxItems.toString());
      
      return authFetchJson<PartnershipListResponse>(`/api/communities/partnerships?${params}`, { 
        token 
      });
    },
    enabled: !!token
  });

  const partnerships = partnershipsData?.data || [];
  const pendingCount = partnerships.filter(p => p.status === 'pending' && p.canRespond).length;

  // Filter partnerships for search (client-side for now)
  const filteredPartnerships = partnerships.filter(partnership => {
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      return (
        partnership.sourceCommunityName?.toLowerCase().includes(query) ||
        partnership.targetCommunityName?.toLowerCase().includes(query) ||
        partnership.inviteMessage?.toLowerCase().includes(query)
      );
    }
    return true;
  });

  const getDisplayTitle = () => {
    switch (mode) {
      case 'widget': return 'Recent Partnerships';
      case 'embedded': return 'Partnerships';
      case 'page':
      default: return null; // Title handled by page component
    }
  };

  const getStatusCounts = () => {
    return {
      all: partnerships.length,
      pending: partnerships.filter(p => p.status === 'pending').length,
      accepted: partnerships.filter(p => p.status === 'accepted').length,
      rejected: partnerships.filter(p => p.status === 'rejected').length,
      suspended: partnerships.filter(p => p.status === 'suspended').length
    };
  };

  const statusCounts = getStatusCounts();

  if (error) {
    return (
      <Card className={`border-red-200 dark:border-red-800 ${className}`}>
        <CardContent className="p-6">
          <div className="text-center text-red-600 dark:text-red-400">
            <Handshake className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <h3 className="text-lg font-semibold mb-2">Failed to load partnerships</h3>
            <p className="text-sm mb-4">There was an error loading your community partnerships.</p>
            <Button onClick={() => refetch()} variant="outline" size="sm">
              Try Again
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Widget mode - compact display
  if (mode === 'widget') {
    return (
      <Card className={className}>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">{getDisplayTitle()}</CardTitle>
            {pendingCount > 0 && (
              <Badge variant="secondary">{pendingCount} pending</Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {isLoading ? (
            <div className="space-y-2">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-16 bg-gray-100 dark:bg-gray-800 rounded animate-pulse" />
              ))}
            </div>
          ) : filteredPartnerships.length === 0 ? (
            <div className="text-center py-6 text-gray-500 dark:text-gray-400">
              <Handshake className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No partnerships yet</p>
            </div>
          ) : (
            <>
              {filteredPartnerships.slice(0, maxItems || 3).map((partnership) => (
                <PartnershipCard 
                  key={partnership.id} 
                  partnership={partnership} 
                  mode="compact"
                  onUpdate={refetch}
                />
              ))}
              {partnerships.length > (maxItems || 3) && (
                <div className="pt-2">
                  <Button variant="ghost" size="sm" className="w-full">
                    View all {partnerships.length} partnerships
                  </Button>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    );
  }

  // Full display mode (page and embedded)
  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header for embedded mode */}
      {mode === 'embedded' && (
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold">{getDisplayTitle()}</h2>
          {showCreateButton && (
            <Button onClick={() => setIsCreateModalOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              New Partnership
            </Button>
          )}
        </div>
      )}

      {/* Header controls for page mode */}
      {mode === 'page' && (
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          <div className="flex items-center gap-4 flex-1">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search communities..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
          
          {showCreateButton && (
            <Button onClick={() => setIsCreateModalOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              New Partnership
            </Button>
          )}
        </div>
      )}

      {/* Status filter tabs */}
      <Tabs value={statusFilter} onValueChange={(value) => setStatusFilter(value as PartnershipStatus | 'all')}>
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="all" className="relative">
            All
            {statusCounts.all > 0 && (
              <Badge variant="secondary" className="ml-1 h-5 text-xs">
                {statusCounts.all}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="pending" className="relative">
            Pending
            {statusCounts.pending > 0 && (
              <Badge variant="secondary" className="ml-1 h-5 text-xs">
                {statusCounts.pending}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="accepted">
            Active
            {statusCounts.accepted > 0 && (
              <Badge variant="secondary" className="ml-1 h-5 text-xs">
                {statusCounts.accepted}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="suspended">
            Suspended
            {statusCounts.suspended > 0 && (
              <Badge variant="secondary" className="ml-1 h-5 text-xs">
                {statusCounts.suspended}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="rejected">
            Rejected
            {statusCounts.rejected > 0 && (
              <Badge variant="secondary" className="ml-1 h-5 text-xs">
                {statusCounts.rejected}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value={statusFilter} className="space-y-4">
          {isLoading ? (
            <div className="space-y-4">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-32 bg-gray-100 dark:bg-gray-800 rounded-lg animate-pulse" />
              ))}
            </div>
          ) : filteredPartnerships.length === 0 ? (
            <Card>
              <CardContent className="p-12">
                <div className="text-center text-gray-500 dark:text-gray-400">
                  <Handshake className="h-16 w-16 mx-auto mb-4 opacity-50" />
                  <h3 className="text-lg font-semibold mb-2">
                    {statusFilter === 'all' 
                      ? 'No partnerships yet' 
                      : `No ${statusFilter} partnerships`
                    }
                  </h3>
                  <p className="text-sm max-w-md mx-auto mb-6">
                    {statusFilter === 'all'
                      ? 'Start building relationships with other communities by creating your first partnership.'
                      : `You don't have any partnerships with ${statusFilter} status.`
                    }
                  </p>
                  {statusFilter === 'all' && showCreateButton && (
                    <Button onClick={() => setIsCreateModalOpen(true)}>
                      <Plus className="h-4 w-4 mr-2" />
                      Create First Partnership
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {filteredPartnerships.map((partnership) => (
                <PartnershipCard 
                  key={partnership.id} 
                  partnership={partnership} 
                  mode="full"
                  onUpdate={refetch}
                />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Create Partnership Modal */}
      <CreatePartnershipModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSuccess={() => {
          setIsCreateModalOpen(false);
          refetch();
        }}
      />
    </div>
  );
} 