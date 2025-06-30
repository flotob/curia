import React, { useState, useEffect, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Copy,
  Share2,
  Twitter,
  Linkedin,
  Facebook,
  Mail,
  MessageSquare,
  ExternalLink,
  Check,
  Clock,
  User,
  Hash,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface SocialPreview {
  platform: string;
  title: string;
  description: string;
  image?: string;
  url: string;
  siteName: string;
}

interface ShareData {
  url: string;
  title: string;
  description: string;
  author?: string;
  authorAvatar?: string;
  boardName?: string;
  commentCount?: number;
  createdAt?: string;
  tags?: string[];
  isGated?: boolean;
}

interface EnhancedShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  shareData: ShareData;
  isGenerating?: boolean;
  className?: string;
}

const SOCIAL_PLATFORMS = [
  {
    name: 'Twitter',
    icon: Twitter,
    color: 'text-blue-400',
    bgColor: 'hover:bg-blue-50 dark:hover:bg-blue-950',
    getShareUrl: (data: ShareData) => 
      `https://twitter.com/intent/tweet?text=${encodeURIComponent(`${data.title}\n\n${data.description}`)}&url=${encodeURIComponent(data.url)}`,
  },
  {
    name: 'LinkedIn',
    icon: Linkedin,
    color: 'text-blue-600',
    bgColor: 'hover:bg-blue-50 dark:hover:bg-blue-950',
    getShareUrl: (data: ShareData) => 
      `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(data.url)}`,
  },
  {
    name: 'Facebook',
    icon: Facebook,
    color: 'text-blue-700',
    bgColor: 'hover:bg-blue-50 dark:hover:bg-blue-950',
    getShareUrl: (data: ShareData) => 
      `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(data.url)}`,
  },
  {
    name: 'Email',
    icon: Mail,
    color: 'text-gray-600',
    bgColor: 'hover:bg-gray-50 dark:hover:bg-gray-800',
    getShareUrl: (data: ShareData) => 
      `mailto:?subject=${encodeURIComponent(data.title)}&body=${encodeURIComponent(`${data.description}\n\n${data.url}`)}`,
  },
];

export const EnhancedShareModal: React.FC<EnhancedShareModalProps> = ({
  isOpen,
  onClose,
  shareData,
  isGenerating = false,
  className,
}) => {
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState('link');
  const [customMessage, setCustomMessage] = useState('');

  // Generate social previews
  const socialPreviews: SocialPreview[] = [
    {
      platform: 'Twitter',
      title: shareData.title,
      description: shareData.description.slice(0, 200) + (shareData.description.length > 200 ? '...' : ''),
      url: shareData.url,
      siteName: 'Curia Forum',
    },
    {
      platform: 'LinkedIn',
      title: shareData.title,
      description: shareData.description,
      url: shareData.url,
      siteName: 'Curia Forum',
    },
    {
      platform: 'Facebook',
      title: shareData.title,
      description: shareData.description.slice(0, 300) + (shareData.description.length > 300 ? '...' : ''),
      url: shareData.url,
      siteName: 'Curia Forum',
    },
  ];

  const handleCopyLink = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(shareData.url);
      setCopied(true);
      toast({
        title: 'Link Copied!',
        description: 'Share link copied to clipboard',
        duration: 2000,
      });
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      toast({
        title: 'Copy Failed',
        description: 'Failed to copy link to clipboard',
        variant: 'destructive',
      });
    }
  }, [shareData.url, toast]);

  const handleSocialShare = useCallback((platform: typeof SOCIAL_PLATFORMS[0]) => {
    const shareUrl = platform.getShareUrl(shareData);
    window.open(shareUrl, '_blank', 'width=600,height=400,scrollbars=yes,resizable=yes');
  }, [shareData]);

  const handleNativeShare = useCallback(async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: shareData.title,
          text: shareData.description,
          url: shareData.url,
        });
             } catch {
         // User cancelled share or error occurred
         console.log('Share cancelled or failed');
       }
    } else {
      // Fallback to copy link
      handleCopyLink();
    }
  }, [shareData, handleCopyLink]);

  // Reset state when modal opens/closes
  useEffect(() => {
    if (!isOpen) {
      setCopied(false);
      setCustomMessage('');
      setActiveTab('link');
    }
  }, [isOpen]);

  // Keyboard shortcuts
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      } else if ((e.metaKey || e.ctrlKey) && e.key === 'c') {
        e.preventDefault();
        handleCopyLink();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose, handleCopyLink]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent 
        className={cn("sm:max-w-2xl w-full max-h-[90vh] overflow-y-auto", className)}
        role="dialog"
        aria-labelledby="share-modal-title"
        aria-describedby="share-modal-description"
      >
        <DialogHeader>
          <DialogTitle id="share-modal-title" className="flex items-center gap-2">
            <Share2 className="h-5 w-5" />
            Share Post
          </DialogTitle>
          <p id="share-modal-description" className="text-sm text-muted-foreground">
            Share this discussion with others
          </p>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="link">Quick Share</TabsTrigger>
            <TabsTrigger value="social">Social Media</TabsTrigger>
            <TabsTrigger value="preview">Preview</TabsTrigger>
          </TabsList>

          {/* Quick Share Tab */}
          <TabsContent value="link" className="space-y-4">
            <div className="space-y-3">
              <div className="flex gap-2">
                <Input
                  value={shareData.url}
                  readOnly
                  className="flex-1 font-mono text-sm"
                  aria-label="Share URL"
                />
                <Button
                  onClick={handleCopyLink}
                  variant="outline"
                  size="sm"
                  className="flex items-center gap-2 min-w-[100px]"
                  disabled={isGenerating}
                >
                  {copied ? (
                    <Check className="h-4 w-4 text-green-600" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                  {copied ? 'Copied!' : 'Copy'}
                </Button>
              </div>

                             {/* Native Share (if supported) */}
               {typeof navigator !== 'undefined' && 'share' in navigator && (
                 <Button
                   onClick={handleNativeShare}
                   className="w-full"
                   variant="default"
                   size="lg"
                 >
                   <Share2 className="h-4 w-4 mr-2" />
                   Share via System
                 </Button>
               )}

              {/* Quick Actions */}
              <div className="grid grid-cols-2 gap-2">
                {SOCIAL_PLATFORMS.slice(0, 4).map((platform) => {
                  const Icon = platform.icon;
                  return (
                    <Button
                      key={platform.name}
                      onClick={() => handleSocialShare(platform)}
                      variant="outline"
                      size="sm"
                      className={cn(
                        "flex items-center gap-2 justify-start",
                        platform.bgColor
                      )}
                    >
                      <Icon className={cn("h-4 w-4", platform.color)} />
                      {platform.name}
                    </Button>
                  );
                })}
              </div>
            </div>
          </TabsContent>

          {/* Social Media Tab */}
          <TabsContent value="social" className="space-y-4">
            <div className="space-y-3">
              <div className="space-y-2">
                <label htmlFor="custom-message" className="text-sm font-medium">
                  Custom Message (Optional)
                </label>
                <textarea
                  id="custom-message"
                  value={customMessage}
                  onChange={(e) => setCustomMessage(e.target.value)}
                  placeholder="Add a personal message..."
                  className="w-full h-20 px-3 py-2 border rounded-md resize-none text-sm"
                  maxLength={280}
                />
                <div className="text-xs text-muted-foreground text-right">
                  {customMessage.length}/280
                </div>
              </div>

              <div className="grid gap-3">
                {SOCIAL_PLATFORMS.map((platform) => {
                  const Icon = platform.icon;
                  return (
                    <Card
                      key={platform.name}
                      className={cn(
                        "cursor-pointer transition-all hover:shadow-md",
                        platform.bgColor
                      )}
                      onClick={() => handleSocialShare(platform)}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-center gap-3">
                          <Icon className={cn("h-6 w-6", platform.color)} />
                          <div className="flex-1">
                            <div className="font-medium">Share on {platform.name}</div>
                            <div className="text-sm text-muted-foreground">
                              {platform.name === 'Twitter' && 'Share as a tweet'}
                              {platform.name === 'LinkedIn' && 'Share with your professional network'}
                              {platform.name === 'Facebook' && 'Share with friends and family'}
                              {platform.name === 'Email' && 'Send via email'}
                            </div>
                          </div>
                          <ExternalLink className="h-4 w-4 text-muted-foreground" />
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          </TabsContent>

          {/* Preview Tab */}
          <TabsContent value="preview" className="space-y-4">
            <div className="space-y-4">
              <div className="text-sm font-medium">How it appears when shared:</div>
              
              <div className="space-y-3">
                {socialPreviews.map((preview) => (
                  <Card key={preview.platform} className="overflow-hidden">
                    <CardContent className="p-0">
                      <div className="p-3 border-b bg-muted/30">
                        <div className="text-xs font-medium text-muted-foreground">
                          {preview.platform}
                        </div>
                      </div>
                      <div className="p-4 space-y-2">
                        <div className="font-semibold text-sm line-clamp-2">
                          {preview.title}
                        </div>
                        <div className="text-sm text-muted-foreground line-clamp-3">
                          {preview.description}
                        </div>
                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <User className="h-3 w-3" />
                            {shareData.author || 'Community Member'}
                          </div>
                          {shareData.boardName && (
                            <div className="flex items-center gap-1">
                              <Hash className="h-3 w-3" />
                              {shareData.boardName}
                            </div>
                          )}
                          {shareData.commentCount !== undefined && (
                            <div className="flex items-center gap-1">
                              <MessageSquare className="h-3 w-3" />
                              {shareData.commentCount} comments
                            </div>
                          )}
                          {shareData.createdAt && (
                            <div className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {new Date(shareData.createdAt).toLocaleDateString()}
                            </div>
                          )}
                        </div>
                        {shareData.tags && shareData.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {shareData.tags.slice(0, 3).map((tag) => (
                              <Badge key={tag} variant="secondary" className="text-xs">
                                #{tag}
                              </Badge>
                            ))}
                            {shareData.tags.length > 3 && (
                              <Badge variant="outline" className="text-xs">
                                +{shareData.tags.length - 3} more
                              </Badge>
                            )}
                          </div>
                        )}
                        {shareData.isGated && (
                          <Badge variant="outline" className="text-xs border-blue-200 text-blue-700">
                            Gated Content
                          </Badge>
                        )}
                        <div className="text-xs text-muted-foreground mt-2 font-mono truncate">
                          {preview.url}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </TabsContent>
        </Tabs>

        {/* Loading State */}
        {isGenerating && (
          <div className="flex items-center justify-center py-8">
            <div className="flex items-center gap-2 text-muted-foreground">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current" />
              <span className="text-sm">Generating share link...</span>
            </div>
          </div>
        )}

        {/* Keyboard Shortcuts Help */}
        <div className="flex items-center justify-between text-xs text-muted-foreground pt-2 border-t">
          <span>Share this discussion</span>
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-muted rounded border">⌘C</kbd>
              <span>copy link</span>
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-muted rounded border">ESC</kbd>
              <span>close</span>
            </span>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};