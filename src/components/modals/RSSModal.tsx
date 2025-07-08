'use client';

import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Copy, Check, Rss, Lock, Eye } from 'lucide-react';
import { getRSSFeedUrl } from '@/lib/rss';
import { cn } from '@/lib/utils';

interface RSSModalProps {
  isOpen: boolean;
  onClose: () => void;
  boardId: number;
  boardName: string;
  isRSSEligible: boolean;
  theme?: 'light' | 'dark';
  privacyReason?: string;
}

export const RSSModal: React.FC<RSSModalProps> = ({
  isOpen,
  onClose,
  boardId,
  boardName,
  isRSSEligible,
  theme = 'light',
  privacyReason = 'This board is private'
}) => {
  const [isCopied, setIsCopied] = useState(false);
  const rssUrl = getRSSFeedUrl(boardId);

  const handleCopyUrl = async () => {
    try {
      await navigator.clipboard.writeText(rssUrl);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy RSS URL:', error);
    }
  };

  const handleInputClick = (e: React.MouseEvent<HTMLInputElement>) => {
    e.currentTarget.select();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className={cn(
        "sm:max-w-md",
        theme === 'dark' ? 'bg-slate-800 text-slate-100' : 'bg-white text-slate-900'
      )}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Rss size={20} className="text-orange-500" />
            RSS Feed
          </DialogTitle>
          <DialogDescription className={cn(
            theme === 'dark' ? 'text-slate-300' : 'text-slate-600'
          )}>
            {isRSSEligible 
              ? `Subscribe to updates from "${boardName}" board`
              : `RSS feed availability for "${boardName}" board`
            }
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {isRSSEligible ? (
            <>
              {/* RSS Feed Available */}
              <div className="space-y-3">
                <Alert className={cn(
                  "border-green-200",
                  theme === 'dark' 
                    ? 'bg-green-900/20 border-green-700' 
                    : 'bg-green-50 border-green-200'
                )}>
                  <Eye className="h-4 w-4" />
                  <AlertDescription className={cn(
                    theme === 'dark' ? 'text-green-300' : 'text-green-800'
                  )}>
                    This board is publicly accessible and provides an RSS feed.
                  </AlertDescription>
                </Alert>

                <div className="space-y-2">
                  <label className={cn(
                    "text-sm font-medium",
                    theme === 'dark' ? 'text-slate-200' : 'text-slate-700'
                  )}>
                    RSS Feed URL
                  </label>
                  <div className="flex gap-2">
                    <Input
                      value={rssUrl}
                      readOnly
                      onClick={handleInputClick}
                      className={cn(
                        "flex-1 font-mono text-sm",
                        theme === 'dark' 
                          ? 'bg-slate-700 border-slate-600 text-slate-100' 
                          : 'bg-slate-50 border-slate-300 text-slate-900'
                      )}
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleCopyUrl}
                      className={cn(
                        "shrink-0",
                        theme === 'dark' 
                          ? 'border-slate-600 hover:bg-slate-700' 
                          : 'border-slate-300 hover:bg-slate-50'
                      )}
                    >
                      {isCopied ? (
                        <>
                          <Check size={16} className="mr-1 text-green-500" />
                          Copied
                        </>
                      ) : (
                        <>
                          <Copy size={16} className="mr-1" />
                          Copy
                        </>
                      )}
                    </Button>
                  </div>
                </div>

                <div className={cn(
                  "text-sm space-y-1",
                  theme === 'dark' ? 'text-slate-400' : 'text-slate-500'
                )}>
                  <p>
                    <strong>How to use:</strong>
                  </p>
                  <ul className="ml-4 space-y-1 list-disc">
                    <li>Copy the URL above and add it to your RSS reader</li>
                    <li>Your RSS reader will automatically fetch new posts</li>
                    <li>The feed includes the 50 most recent posts from this board</li>
                  </ul>
                </div>
              </div>
            </>
          ) : (
            <>
              {/* RSS Feed Not Available */}
              <Alert className={cn(
                "border-yellow-200",
                theme === 'dark' 
                  ? 'bg-yellow-900/20 border-yellow-700' 
                  : 'bg-yellow-50 border-yellow-200'
              )}>
                <Lock className="h-4 w-4" />
                <AlertDescription className={cn(
                  theme === 'dark' ? 'text-yellow-300' : 'text-yellow-800'
                )}>
                  {privacyReason}
                </AlertDescription>
              </Alert>

              <div className={cn(
                "text-sm space-y-2",
                theme === 'dark' ? 'text-slate-400' : 'text-slate-500'
              )}>
                <p>
                  RSS feeds are only available for boards that are publicly accessible. 
                  This board has privacy restrictions that prevent RSS feed generation.
                </p>
                <p>
                  <strong>Common reasons:</strong>
                </p>
                <ul className="ml-4 space-y-1 list-disc">
                  <li>The community is private (role-gated)</li>
                  <li>The board is private (role-gated)</li>
                  <li>The board has read access restrictions</li>
                </ul>
              </div>
            </>
          )}
        </div>

        <div className="flex justify-end">
          <Button
            variant="outline"
            onClick={onClose}
            className={cn(
              theme === 'dark' 
                ? 'border-slate-600 hover:bg-slate-700' 
                : 'border-slate-300 hover:bg-slate-50'
            )}
          >
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};