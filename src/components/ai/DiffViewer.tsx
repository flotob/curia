'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';

import { Badge } from '@/components/ui/badge';
import { Copy, Check, Plus, Minus, FileText } from 'lucide-react';
import { generateSideBySideDiff, type SideBySideDiff, type WordDiffSegment } from '@/utils/diffUtils';
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
  const [mobileView, setMobileView] = useState<'original' | 'improved'>('original');
  const [copiedSide, setCopiedSide] = useState<'original' | 'improved' | null>(null);

  const sideBySideDiff = generateSideBySideDiff(original, improved);

  const handleCopy = async (content: string, side: 'original' | 'improved') => {
    try {
      await navigator.clipboard.writeText(content);
      setCopiedSide(side);
      setTimeout(() => setCopiedSide(null), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

  const renderWordDiff = (segments: WordDiffSegment[], type: 'original' | 'improved') => {
    if (!segments || segments.length === 0) return null;
    
    return segments.map((segment, index) => {
      if (segment.type === 'unchanged') {
        return <span key={index}>{segment.content}</span>;
      }
      
      // For original side, highlight removed segments, show added as plain text
      if (type === 'original') {
        if (segment.type === 'removed') {
          return (
            <span key={index} className="bg-red-200 dark:bg-red-900/50 text-red-800 dark:text-red-200 px-0.5 rounded">
              {segment.content}
            </span>
          );
        }
        // Don't show added segments on original side
        return null;
      }
      
      // For improved side, highlight added segments, show removed as plain text
      if (type === 'improved') {
        if (segment.type === 'added') {
          return (
            <span key={index} className="bg-green-200 dark:bg-green-900/50 text-green-800 dark:text-green-200 px-0.5 rounded">
              {segment.content}
            </span>
          );
        }
        // Don't show removed segments on improved side
        return null;
      }
      
      return null;
    });
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
                  line.type === 'removed' && 'bg-red-50 dark:bg-red-950/10',
                  line.type === 'modified' && 'bg-red-50 dark:bg-red-950/10'
                )}
              >
                <span className="inline-block w-12 px-2 py-1 text-right text-muted-foreground bg-muted/30 border-r border-border">
                  {line.isEmpty ? '' : line.lineNumber}
                </span>
                <span className="flex-1 px-3 py-1 whitespace-pre-wrap break-words">
                  {line.type === 'modified' && line.wordDiff 
                    ? renderWordDiff(line.wordDiff, 'original')
                    : line.content
                  }
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
                  line.type === 'added' && 'bg-green-50 dark:bg-green-950/10',
                  line.type === 'modified' && 'bg-green-50 dark:bg-green-950/10'
                )}
              >
                <span className="inline-block w-12 px-2 py-1 text-right text-muted-foreground bg-muted/30 border-r border-border">
                  {line.isEmpty ? '' : line.lineNumber}
                </span>
                <span className="flex-1 px-3 py-1 whitespace-pre-wrap break-words">
                  {line.type === 'modified' && line.wordDiff 
                    ? renderWordDiff(line.wordDiff, 'improved')
                    : line.content
                  }
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );

  const renderMobileView = (diff: SideBySideDiff) => {
    const currentSide = mobileView === 'original' ? diff.leftLines : diff.rightLines;
    const contentToCopy = mobileView === 'original' ? original : improved;
    const sideType = mobileView === 'original' ? 'original' : 'improved';
    
    return (
      <div className="flex flex-col h-full min-h-0">
        {/* Mobile Header */}
        <div className={cn(
          "flex items-center justify-between px-3 py-2 border-b border-border flex-shrink-0",
          mobileView === 'original' 
            ? "bg-red-50 dark:bg-red-950/20" 
            : "bg-green-50 dark:bg-green-950/20"
        )}>
          <div className="flex items-center gap-2">
            {mobileView === 'original' ? (
              <>
                <Minus className="w-4 h-4 text-red-600" />
                <span className="font-semibold text-red-800 dark:text-red-300 text-sm">Original</span>
              </>
            ) : (
              <>
                <Plus className="w-4 h-4 text-green-600" />
                <span className="font-semibold text-green-800 dark:text-green-300 text-sm">AI Improved</span>
              </>
            )}
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleCopy(contentToCopy, sideType)}
            className="h-6 w-6 p-0"
          >
            {copiedSide === sideType ? (
              <Check className="w-3 h-3 text-green-600" />
            ) : (
              <Copy className="w-3 h-3" />
            )}
          </Button>
        </div>
        
        {/* Mobile Content */}
        <div className="flex-1 overflow-auto min-h-0">
          <div className="font-mono text-base"> {/* Larger text for mobile */}
            {currentSide.map((line, i) => (
              <div
                key={i}
                className={cn(
                  'flex hover:bg-muted/50',
                  line.type === 'removed' && 'bg-red-50 dark:bg-red-950/10',
                  line.type === 'added' && 'bg-green-50 dark:bg-green-950/10',
                  line.type === 'modified' && (mobileView === 'original' 
                    ? 'bg-red-50 dark:bg-red-950/10' 
                    : 'bg-green-50 dark:bg-green-950/10')
                )}
              >
                <span className="inline-block w-8 px-1 py-1 text-right text-muted-foreground bg-muted/30 border-r border-border text-xs">
                  {line.isEmpty ? '' : line.lineNumber}
                </span>
                <span className="flex-1 px-2 py-1 whitespace-pre-wrap break-words">
                  {line.type === 'modified' && line.wordDiff 
                    ? renderWordDiff(line.wordDiff, sideType)
                    : line.content
                  }
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className={cn('flex flex-col h-full', className)}>
      {/* Desktop Header */}
      <div className="hidden md:flex items-center justify-between p-4 border-b border-border bg-muted/30">
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
            {sideBySideDiff.stats.modifications > 0 && (
              <Badge variant="outline" className="text-orange-600">
                ~{sideBySideDiff.stats.modifications}
              </Badge>
            )}
            <span>·</span>
            <span>{sideBySideDiff.stats.totalLines} lines</span>
          </div>
        </div>
      </div>

      {/* Mobile Header with Tabs */}
      <div className="flex md:hidden items-center justify-between p-3 border-b border-border bg-muted/30">
        <div className="flex items-center gap-2">
          <FileText className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm font-medium">Comparison</span>
        </div>
        <Tabs value={mobileView} onValueChange={(value) => setMobileView(value as 'original' | 'improved')}>
          <TabsList className="grid w-fit grid-cols-2">
            <TabsTrigger value="original" className="text-xs">Original</TabsTrigger>
            <TabsTrigger value="improved" className="text-xs">Improved</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Responsive Diff content */}
      <div className="flex-1 overflow-hidden">
        {/* Desktop: Side-by-side */}
        <div className="hidden md:block h-full">
          {renderSideBySideView(sideBySideDiff)}
        </div>
        
        {/* Mobile: Tabbed view */}
        <div className="block md:hidden h-full">
          {renderMobileView(sideBySideDiff)}
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex flex-col sm:flex-row items-center justify-between p-4 border-t border-border bg-muted/30 gap-3">
        <div className="hidden sm:flex items-center gap-2 text-sm text-muted-foreground">
          <span>Review the changes and choose how to proceed</span>
        </div>
        <div className="flex flex-col sm:flex-row items-center gap-2 w-full sm:w-auto">
          <div className="flex gap-2 w-full sm:w-auto">
            {onCancel && (
              <Button variant="outline" onClick={onCancel} className="flex-1 sm:flex-none">
                Cancel
              </Button>
            )}
            <Button variant="outline" onClick={onReject} className="flex-1 sm:flex-none">
              Use Original
            </Button>
          </div>
          <div className="flex gap-2 w-full sm:w-auto">
            {onEdit && (
              <Button variant="outline" onClick={() => onEdit(improved)} className="flex-1 sm:flex-none">
                Edit Improved
              </Button>
            )}
            <Button onClick={onAccept} className="bg-green-600 hover:bg-green-700 text-white flex-1 sm:flex-none">
              Use Improved
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
} 