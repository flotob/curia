import React from 'react';
import { NodeViewWrapper, ReactNodeViewProps } from '@tiptap/react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

export const MentionNode: React.FC<ReactNodeViewProps> = ({ node }) => {
  const { id, label } = node.attrs as { id: string; label: string };

  return (
    <NodeViewWrapper className="mention-wrapper inline">
      <Badge 
        variant="secondary" 
        className={cn(
          "mention-badge inline-flex items-center",
          "bg-primary/10 text-primary hover:bg-primary/20",
          "border border-primary/20 hover:border-primary/30",
          "cursor-pointer transition-colors",
          "px-2 py-0.5 text-sm font-medium"
        )}
        data-mention-id={id}
        data-mention-label={label}
      >
        @{label}
      </Badge>
    </NodeViewWrapper>
  );
}; 