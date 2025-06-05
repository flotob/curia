import React, { useEffect, useRef } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Copy, Share2, ExternalLink } from 'lucide-react';

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  shareUrl: string;
  postTitle: string;
}

export const ShareModal: React.FC<ShareModalProps> = ({
  isOpen,
  onClose,
  shareUrl,
  postTitle,
}) => {
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-select the URL when modal opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      // Small delay to ensure modal is fully rendered
      setTimeout(() => {
        inputRef.current?.select();
        inputRef.current?.focus();
      }, 100);
    }
  }, [isOpen]);

  // Handle manual copy attempt (might work in some contexts)
  const handleCopyClick = async () => {
    if (inputRef.current) {
      try {
        // First try to select and use document.execCommand as fallback
        inputRef.current.select();
        inputRef.current.setSelectionRange(0, shareUrl.length);
        
        // Try modern clipboard API first
        if (navigator.clipboard && window.isSecureContext) {
          await navigator.clipboard.writeText(shareUrl);
          console.log('[ShareModal] URL copied via Clipboard API');
        } else {
          // Fallback to execCommand
          const success = document.execCommand('copy');
          if (success) {
            console.log('[ShareModal] URL copied via execCommand');
          } else {
            console.log('[ShareModal] Copy failed, but text is selected for manual copy');
          }
        }
              } catch {
          console.log('[ShareModal] Copy not available, but text is selected for manual copy');
          // The text is still selected, so user can manually copy with Ctrl+C
        }
    }
  };

  // Handle input click to select all
  const handleInputClick = () => {
    if (inputRef.current) {
      inputRef.current.select();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md mx-4 max-w-[calc(100vw-2rem)]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Share2 size={20} />
            Share Post
          </DialogTitle>
          <DialogDescription>
            Share this discussion: <span className="font-medium">&ldquo;{postTitle}&rdquo;</span>
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="share-url" className="text-sm font-medium">
              Shareable Link
            </Label>
            <div className="flex gap-2">
              <Input
                id="share-url"
                ref={inputRef}
                value={shareUrl}
                readOnly
                onClick={handleInputClick}
                className="font-mono text-sm"
                placeholder="Generating share link..."
              />
              <Button
                size="sm"
                variant="outline"
                onClick={handleCopyClick}
                className="px-3"
                title="Copy to clipboard"
              >
                <Copy size={16} />
              </Button>
            </div>
          </div>
          
          <div className="flex flex-col gap-2 text-xs text-muted-foreground bg-muted/30 p-3 rounded-lg">
            <div className="flex items-start gap-2">
              <ExternalLink size={14} className="mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-medium mb-1">How to share:</p>
                <ul className="space-y-1">
                  <li>• The URL above is selected - press <kbd className="px-1 py-0.5 bg-background rounded text-xs">Ctrl+C</kbd> (or <kbd className="px-1 py-0.5 bg-background rounded text-xs">⌘+C</kbd>) to copy</li>
                  <li>• Share this link anywhere - social media, messaging apps, email, etc.</li>
                  <li>• Recipients will be taken directly to this discussion</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
        
        <div className="flex justify-end">
          <Button variant="outline" onClick={onClose}>
            Done
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}; 