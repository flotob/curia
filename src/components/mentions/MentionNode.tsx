import React, { useState } from 'react';
import { NodeViewWrapper, ReactNodeViewProps } from '@tiptap/react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { UserProfilePopover } from './UserProfilePopover';

export const MentionNode: React.FC<ReactNodeViewProps> = ({ node }) => {
  const { id, label } = node.attrs as { id: string; label: string };
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);

  const handleMentionClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsPopoverOpen(true);
  };

  return (
    <NodeViewWrapper className="mention-wrapper inline">
      <UserProfilePopover
        userId={id}
        username={label}
        open={isPopoverOpen}
        onOpenChange={setIsPopoverOpen}
      >
        <Badge 
          variant="secondary" 
          className={cn(
            "mention-badge inline-flex items-center",
            "bg-primary/10 text-primary hover:bg-primary/15",
            "border border-primary/20 hover:border-primary/40",
            "cursor-pointer transition-all duration-200",
            "px-2 py-0.5 text-sm font-medium",
            "hover:shadow-sm hover:scale-[1.02]",
            "focus:outline-none focus:ring-2 focus:ring-primary/20",
            // Active state for when popover is open
            isPopoverOpen && "bg-primary/20 border-primary/50 shadow-sm"
          )}
          data-mention-id={id}
          data-mention-label={label}
          onClick={handleMentionClick}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              handleMentionClick(e as any);
            }
          }}
        >
          @{label}
        </Badge>
      </UserProfilePopover>
    </NodeViewWrapper>
  );
}; 