'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { EnhancedPostMetadata } from '../api/posts/[postId]/metadata/route';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { formatDistanceToNow } from 'date-fns';
import { ChevronRight, Chrome, Search, Lock, Users, Heart, Share2 } from 'lucide-react';

interface BrowserInfo {
  name: string;
  isRecommendChrome: boolean;
}

export default function SharedPostPreview() {
  const searchParams = useSearchParams();
  const [metadata, setMetadata] = useState<EnhancedPostMetadata | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Extract parameters from URL (handle null searchParams)
  const postId = searchParams?.get('postId') || null;
  const token = searchParams?.get('token') || null;
  const communityShortId = searchParams?.get('communityShortId') || null;
  const pluginId = searchParams?.get('pluginId') || null;
  const browserType = searchParams?.get('browser') || 'unknown';
  
  const browserInfo: BrowserInfo = {
    name: browserType === 'safari' ? 'Safari' : browserType === 'firefox' ? 'Firefox' : 'your browser',
    isRecommendChrome: browserType === 'safari' || browserType === 'firefox'
  };

  // Fetch post metadata
  useEffect(() => {
    const fetchMetadata = async () => {
      if (!postId || !token) {
        setError('Missing post information');
        setLoading(false);
        return;
      }

      try {
        const response = await fetch(`/api/posts/${postId}/metadata?token=${token}`);
        if (!response.ok) {
          throw new Error('Failed to fetch post metadata');
        }
        
        const data = await response.json();
        setMetadata(data);
      } catch (err) {
        console.error('Error fetching metadata:', err);
        setError('Unable to load post preview');
      } finally {
        setLoading(false);
      }
    };

    fetchMetadata();
  }, [postId, token]);

  // Generate Common Ground URL for manual forward
  const getCommonGroundUrl = () => {
    if (!communityShortId || !pluginId) {
      return process.env.NEXT_PUBLIC_COMMON_GROUND_BASE_URL || 'https://app.commonground.wtf';
    }
    
    const baseUrl = process.env.NEXT_PUBLIC_COMMON_GROUND_BASE_URL || 'https://app.commonground.wtf';
    return `${baseUrl}/c/${communityShortId}/plugin/${pluginId}`;
  };

  const handleForwardToPost = () => {
    const url = getCommonGroundUrl();
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const renderGatingRequirements = () => {
    if (!metadata?.gatingContext?.postGated || !metadata.gatingContext.postRequirements) return null;

    const requirements = [];
    const postReqs = metadata.gatingContext.postRequirements;
    
    if (postReqs.lyxRequired) {
      requirements.push(postReqs.lyxRequired);
    }
    
    if (postReqs.tokensRequired && postReqs.tokensRequired.length > 0) {
      postReqs.tokensRequired.forEach(token => {
        requirements.push(`${token.amount} ${token.symbol}`);
      });
    }
    
    if (postReqs.followersRequired && postReqs.followersRequired.length > 0) {
      postReqs.followersRequired.forEach(follower => {
        requirements.push(follower.displayValue);
      });
    }

    return (
      <div className="space-y-2">
        <h4 className="text-sm font-medium text-gray-700 flex items-center gap-2">
          <Lock className="w-4 h-4" />
          Universal Profile Requirements:
        </h4>
        <div className="flex flex-wrap gap-2">
          {requirements.map((req, index) => (
            <Badge key={index} variant="secondary" className="text-xs">
              {req}
            </Badge>
          ))}
        </div>
      </div>
    );
  };

  const renderAccessRequirements = () => {
    if (!metadata) return null;

    const hasAnyGating = metadata.gatingContext?.communityGated || 
                         metadata.gatingContext?.boardGated || 
                         metadata.gatingContext?.postGated;

    if (!hasAnyGating) return null;

    return (
      <Card className="border-amber-200 bg-amber-50">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2 text-amber-800">
            <Lock className="w-5 h-5" />
            Access Requirements
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {metadata.gatingContext?.communityGated && (
            <div className="flex items-center gap-2 text-sm text-amber-700">
              <Users className="w-4 h-4" />
              <span>Community access required: <strong>{metadata.gatingContext.communityRoles?.join(', ') || 'Special Role'}</strong></span>
            </div>
          )}
          
          {metadata.gatingContext?.boardGated && (
            <div className="flex items-center gap-2 text-sm text-amber-700">
              <Users className="w-4 h-4" />
              <span>Board access required: <strong>{metadata.gatingContext.boardRoles?.join(', ') || 'Special Role'}</strong></span>
            </div>
          )}
          
          {metadata.gatingContext?.postGated && renderGatingRequirements()}
        </CardContent>
      </Card>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading post preview...</p>
        </div>
      </div>
    );
  }

  if (error || !metadata) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="text-red-500 text-4xl mb-4">⚠️</div>
              <h1 className="text-xl font-semibold mb-2">Unable to Load Post</h1>
              <p className="text-gray-600 mb-4">{error || 'Post not found'}</p>
              <Button onClick={() => window.close()} variant="outline">
                Close
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const isContentVisible = !metadata.gatingContext?.communityGated && 
                          !metadata.gatingContext?.boardGated && 
                          !metadata.gatingContext?.postGated;

  // Create excerpt from content (first 200 characters)
  const excerpt = metadata.content.length > 200 
    ? metadata.content.substring(0, 200) + '...'
    : metadata.content;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-2xl mx-auto p-4 space-y-6">
        
        {/* Browser Notice */}
        {browserInfo.isRecommendChrome && (
          <Card className="border-blue-200 bg-blue-50">
            <CardContent className="pt-4">
              <div className="flex items-start gap-3">
                <Chrome className="w-5 h-5 text-blue-600 mt-0.5" />
                <div className="flex-1">
                  <h3 className="font-medium text-blue-900">Limited Browser Support</h3>
                  <p className="text-sm text-blue-700 mt-1">
                    {browserInfo.name} doesn&apos;t support automatic forwarding. For the best experience, 
                    we recommend using <strong>Chrome</strong> which automatically takes you to the post.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Post Preview */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
              <span className="font-medium">{metadata.board_name}</span>
              <ChevronRight className="w-4 h-4" />
              <span>Shared Post</span>
            </div>
            <CardTitle className="text-xl">{metadata.title}</CardTitle>
            <div className="flex items-center gap-4 text-sm text-gray-500">
              <span>By {metadata.author_name}</span>
              <span>{formatDistanceToNow(new Date(metadata.created_at), { addSuffix: true })}</span>
            </div>
          </CardHeader>
          
          <CardContent className="space-y-4">
            {/* Access Requirements */}
            {renderAccessRequirements()}
            
            {/* Post Content */}
            {isContentVisible ? (
              <div className="prose prose-sm max-w-none">
                <p className="text-gray-700 leading-relaxed">{excerpt}</p>
                {excerpt !== metadata.content && (
                  <p className="text-gray-500 text-sm mt-2">
                    <em>Full content available in the forum...</em>
                  </p>
                )}
              </div>
            ) : (
              <div className="bg-gray-100 rounded-lg p-4 text-center">
                <Lock className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                <p className="text-gray-600 text-sm">
                  Content is private and requires access permissions to view.
                </p>
              </div>
            )}

            {/* Stats */}
            <div className="flex items-center gap-4 pt-2 border-t text-sm text-gray-500">
              <div className="flex items-center gap-1">
                <Heart className="w-4 h-4" />
                <span>{metadata.upvote_count || 0}</span>
              </div>
              <div className="flex items-center gap-1">
                <Share2 className="w-4 h-4" />
                <span>Shared post</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Forward Actions */}
        <Card>
          <CardContent className="pt-6">
            <div className="text-center space-y-4">
              <h3 className="font-semibold">Continue to Post</h3>
              <p className="text-sm text-gray-600">
                Click below to open the full discussion in Common Ground
              </p>
              
              <Button 
                onClick={handleForwardToPost}
                className="w-full bg-blue-600 hover:bg-blue-700"
              >
                🔗 Open in Common Ground
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
              
              <div className="text-xs text-gray-500 space-y-1">
                <p className="flex items-center justify-center gap-1">
                  <Search className="w-3 h-3" />
                  Once there, search for: &ldquo;<strong>{metadata.title}</strong>&rdquo;
                </p>
                <p>This will help you find the exact post in the forum</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="text-center text-xs text-gray-400 pb-8">
          <p>Powered by Curia Forum • Part of the Common Ground ecosystem</p>
        </div>
      </div>
    </div>
  );
} 