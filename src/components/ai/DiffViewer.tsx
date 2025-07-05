'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';

import { Badge } from '@/components/ui/badge';
import { Copy, Check, Plus, Minus, FileText } from 'lucide-react';
import { generateSideBySideDiff, generateInlineDiff, type SideBySideDiff, type InlineDiff } from '@/utils/diffUtils';
import { cn } from '@/lib/utils';

interface DiffViewerProps {
  original: string;
  improved: string;
  onAccept: () => void;
  onReject: () => void;
  onEdit?: (content: string) => void;
  onCancel?: () => void;
  className?: string;
}

export function DiffViewer({ 
  original, 
  improved, 
  onAccept, 
  onReject, 
  onEdit,
  onCancel,
  className 
}: DiffViewerProps) {
  const [viewMode, setViewMode] = useState<'split' | 'inline'>('split');
  const [copiedSide, setCopiedSide] = useState<'original' | 'improved' | null>(null);

  const sideBySideDiff = generateSideBySideDiff(original, improved);
  const inlineDiff = generateInlineDiff(original, improved);

  const handleCopy = async (content: string, side: 'original' | 'improved') => {
    try {
      await navigator.clipboard.writeText(content);
      setCopiedSide(side);
      setTimeout(() => setCopiedSide(null), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

  const renderSideBySideView = (diff: SideBySideDiff) => (
    <div className="grid grid-cols-2 h-full min-h-0">
      {/* Left: Original */}
      <div className="border-r border-border flex flex-col h-full min-h-0">
        <div className="flex items-center justify-between px-4 py-2 bg-red-50 dark:bg-red-950/20 border-b border-border flex-shrink-0">
          <div className="flex items-center gap-2">
            <Minus className="w-4 h-4 text-red-600" />
            <span className="font-semibold text-red-800 dark:text-red-300">Original</span>
            <Badge variant="outline" className="text-red-600 border-red-200">
              -{diff.stats.deletions}
            </Badge>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleCopy(original, 'original')}
            className="h-6 w-6 p-0"
          >
            {copiedSide === 'original' ? (
              <Check className="w-3 h-3 text-green-600" />
            ) : (
              <Copy className="w-3 h-3" />
            )}
          </Button>
        </div>
        <div className="flex-1 overflow-auto min-h-0">
          <div className="font-mono text-sm">
            {diff.leftLines.map((line, i) => (
              <div
                key={i}
                className={cn(
                  'flex hover:bg-muted/50',
                  line.type === 'removed' && 'bg-red-50 dark:bg-red-950/10'
                )}
              >
                <span className="inline-block w-12 px-2 py-1 text-right text-muted-foreground bg-muted/30 border-r border-border">
                  {line.isEmpty ? '' : line.lineNumber}
                </span>
                <span className="flex-1 px-3 py-1 whitespace-pre-wrap break-words">
                  {line.content}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right: Improved */}
      <div className="flex flex-col h-full min-h-0">
        <div className="flex items-center justify-between px-4 py-2 bg-green-50 dark:bg-green-950/20 border-b border-border flex-shrink-0">
          <div className="flex items-center gap-2">
            <Plus className="w-4 h-4 text-green-600" />
            <span className="font-semibold text-green-800 dark:text-green-300">AI Improved</span>
            <Badge variant="outline" className="text-green-600 border-green-200">
              +{diff.stats.additions}
            </Badge>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleCopy(improved, 'improved')}
            className="h-6 w-6 p-0"
          >
            {copiedSide === 'improved' ? (
              <Check className="w-3 h-3 text-green-600" />
            ) : (
              <Copy className="w-3 h-3" />
            )}
          </Button>
        </div>
        <div className="flex-1 overflow-auto min-h-0">
          <div className="font-mono text-sm">
            {diff.rightLines.map((line, i) => (
              <div
                key={i}
                className={cn(
                  'flex hover:bg-muted/50',
                  line.type === 'added' && 'bg-green-50 dark:bg-green-950/10'
                )}
              >
                <span className="inline-block w-12 px-2 py-1 text-right text-muted-foreground bg-muted/30 border-r border-border">
                  {line.isEmpty ? '' : line.lineNumber}
                </span>
                <span className="flex-1 px-3 py-1 whitespace-pre-wrap break-words">
                  {line.content}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );

  const renderInlineView = (diff: InlineDiff) => (
    <div className="h-full overflow-auto min-h-0">
      <div className="font-mono text-sm">
        {diff.lines.map((line, i) => (
          <div
            key={i}
            className={cn(
              'flex hover:bg-muted/50',
              line.type === 'added' && 'bg-green-50 dark:bg-green-950/10',
              line.type === 'removed' && 'bg-red-50 dark:bg-red-950/10'
            )}
          >
            <span className="inline-block w-8 px-2 py-1 text-center text-muted-foreground bg-muted/30 border-r border-border">
              {line.type === 'added' && <Plus className="w-3 h-3 text-green-600" />}
              {line.type === 'removed' && <Minus className="w-3 h-3 text-red-600" />}
            </span>
            <span className="inline-block w-12 px-2 py-1 text-right text-muted-foreground bg-muted/30 border-r border-border">
              {line.lineNumber}
            </span>
            <span className="flex-1 px-3 py-1 whitespace-pre-wrap break-words">
              {line.content}
            </span>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div className={cn('flex flex-col h-full', className)}>
      {/* Header with stats and view toggle */}
      <div className="flex items-center justify-between p-4 border-b border-border bg-muted/30">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm font-medium">Content Comparison</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            {sideBySideDiff.stats.additions > 0 && (
              <Badge variant="outline" className="text-green-600">
                +{sideBySideDiff.stats.additions}
              </Badge>
            )}
            {sideBySideDiff.stats.deletions > 0 && (
              <Badge variant="outline" className="text-red-600">
                -{sideBySideDiff.stats.deletions}
              </Badge>
            )}
            <span>·</span>
            <span>{sideBySideDiff.stats.totalLines} lines</span>
          </div>
        </div>

        <Tabs value={viewMode} onValueChange={(value) => setViewMode(value as 'split' | 'inline')}>
          <TabsList className="grid w-fit grid-cols-2">
            <TabsTrigger value="split" className="text-xs">Split</TabsTrigger>
            <TabsTrigger value="inline" className="text-xs">Inline</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Diff content */}
      <div className="flex-1 overflow-hidden">
        {viewMode === 'split' && renderSideBySideView(sideBySideDiff)}
        {viewMode === 'inline' && renderInlineView(inlineDiff)}
      </div>

      {/* Action buttons */}
      <div className="flex items-center justify-between p-4 border-t border-border bg-muted/30">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span>Review the changes and choose how to proceed</span>
        </div>
        <div className="flex items-center gap-2">
          {onCancel && (
            <Button variant="outline" onClick={onCancel}>
              Cancel
            </Button>
          )}
          <Button variant="outline" onClick={onReject}>
            Use Original
          </Button>
          {onEdit && (
            <Button variant="outline" onClick={() => onEdit(improved)}>
              Edit Improved
            </Button>
          )}
          <Button onClick={onAccept} className="bg-green-600 hover:bg-green-700 text-white">
            Use Improved
          </Button>
        </div>
      </div>
    </div>
  );
} 