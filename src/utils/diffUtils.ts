import { diffLines, diffWordsWithSpace, Change } from 'diff';

// Interfaces for diff display components
export interface DiffLine {
  type: 'added' | 'removed' | 'unchanged';
  content: string;
  lineNumber: number;
  originalLineNumber?: number;
  improvedLineNumber?: number;
}

export interface SideBySideDiff {
  leftLines: Array<{
    content: string;
    lineNumber: number;
    type: 'unchanged' | 'removed';
    isEmpty?: boolean;
  }>;
  rightLines: Array<{
    content: string; 
    lineNumber: number;
    type: 'unchanged' | 'added';
    isEmpty?: boolean;
  }>;
  stats: {
    additions: number;
    deletions: number;
    modifications: number;
    totalLines: number;
  };
}

export interface InlineDiff {
  lines: DiffLine[];
  stats: {
    additions: number;
    deletions: number;
    modifications: number;
  };
}

/**
 * Generate line-by-line diff between original and improved content
 */
export function generateLineDiff(original: string, improved: string): DiffLine[] {
  const changes = diffLines(original, improved);
  const result: DiffLine[] = [];
  let lineNumber = 1;

  changes.forEach((change: Change) => {
    const lines = change.value.split('\n');
    // Remove last empty line if it exists (diffLines adds trailing newline)
    if (lines[lines.length - 1] === '') {
      lines.pop();
    }

    lines.forEach((line) => {
      if (change.added) {
        result.push({
          type: 'added',
          content: line,
          lineNumber: lineNumber++
        });
      } else if (change.removed) {
        result.push({
          type: 'removed', 
          content: line,
          lineNumber: lineNumber++
        });
      } else {
        result.push({
          type: 'unchanged',
          content: line,
          lineNumber: lineNumber++
        });
      }
    });
  });

  return result;
}

/**
 * Generate side-by-side diff view (GitHub style)
 */
export function generateSideBySideDiff(original: string, improved: string): SideBySideDiff {
  const changes = diffLines(original, improved);
  
  const leftLines: SideBySideDiff['leftLines'] = [];
  const rightLines: SideBySideDiff['rightLines'] = [];
  
  let leftLineNumber = 1;
  let rightLineNumber = 1;
  let additions = 0;
  let deletions = 0;

  changes.forEach((change: Change) => {
    const lines = change.value.split('\n');
    if (lines[lines.length - 1] === '') {
      lines.pop();
    }

    if (change.added) {
      // Added lines - show only on right side
      lines.forEach(line => {
        leftLines.push({
          content: '',
          lineNumber: leftLineNumber,
          type: 'unchanged',
          isEmpty: true
        });
        rightLines.push({
          content: line,
          lineNumber: rightLineNumber++,
          type: 'added'
        });
        additions++;
      });
    } else if (change.removed) {
      // Removed lines - show only on left side  
      lines.forEach(line => {
        leftLines.push({
          content: line,
          lineNumber: leftLineNumber++,
          type: 'removed'
        });
        rightLines.push({
          content: '',
          lineNumber: rightLineNumber,
          type: 'unchanged',
          isEmpty: true
        });
        deletions++;
      });
    } else {
      // Unchanged lines - show on both sides
      lines.forEach(line => {
        leftLines.push({
          content: line,
          lineNumber: leftLineNumber++,
          type: 'unchanged'
        });
        rightLines.push({
          content: line,
          lineNumber: rightLineNumber++,
          type: 'unchanged'
        });
      });
    }
  });

  return {
    leftLines,
    rightLines,
    stats: {
      additions,
      deletions,
      modifications: Math.min(additions, deletions),
      totalLines: Math.max(leftLines.length, rightLines.length)
    }
  };
}

/**
 * Generate inline diff view with word-level highlighting
 */
export function generateInlineDiff(original: string, improved: string): InlineDiff {
  const lines = generateLineDiff(original, improved);
  const stats = {
    additions: lines.filter(l => l.type === 'added').length,
    deletions: lines.filter(l => l.type === 'removed').length,
    modifications: 0
  };
  
  stats.modifications = Math.min(stats.additions, stats.deletions);

  return { lines, stats };
}

/**
 * Generate word-level diff for inline display
 */
export function generateWordDiff(original: string, improved: string): Array<{
  type: 'added' | 'removed' | 'unchanged';
  content: string;
}> {
  const changes = diffWordsWithSpace(original, improved);
  
  return changes.map((change: Change) => ({
    type: change.added ? 'added' : change.removed ? 'removed' : 'unchanged',
    content: change.value
  }));
}

/**
 * Utility to calculate diff statistics
 */
export function calculateDiffStats(original: string, improved: string) {
  const diff = generateSideBySideDiff(original, improved);
  const originalLength = original.length;
  const improvedLength = improved.length;
  
  return {
    ...diff.stats,
    originalLength,
    improvedLength,
    lengthDelta: improvedLength - originalLength,
    changePercentage: Math.round((diff.stats.additions + diff.stats.deletions) / diff.stats.totalLines * 100)
  };
}

/**
 * Utility to check if content has meaningful changes
 */
export function hasMeaningfulChanges(original: string, improved: string): boolean {
  const stats = calculateDiffStats(original, improved);
  
  // Consider changes meaningful if:
  // - More than 1 line changed OR
  // - Length difference > 5% OR  
  // - More than 10 characters different
  return (
    stats.additions + stats.deletions > 1 ||
    Math.abs(stats.lengthDelta) > Math.max(10, stats.originalLength * 0.05) ||
    stats.changePercentage > 5
  );
} 