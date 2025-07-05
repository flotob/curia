import { diffLines, diffWordsWithSpace, Change } from 'diff';

// Interfaces for diff display components
export interface DiffLine {
  type: 'added' | 'removed' | 'unchanged' | 'modified';
  content: string;
  lineNumber: number;
  originalLineNumber?: number;
  improvedLineNumber?: number;
  wordDiff?: WordDiffSegment[]; // For modified lines
}

export interface WordDiffSegment {
  type: 'added' | 'removed' | 'unchanged';
  content: string;
}

export interface SideBySideDiff {
  leftLines: Array<{
    content: string;
    lineNumber: number;
    type: 'unchanged' | 'removed' | 'modified';
    isEmpty?: boolean;
    wordDiff?: WordDiffSegment[]; // For modified lines
  }>;
  rightLines: Array<{
    content: string; 
    lineNumber: number;
    type: 'unchanged' | 'added' | 'modified';
    isEmpty?: boolean;
    wordDiff?: WordDiffSegment[]; // For modified lines
  }>;
  stats: {
    additions: number;
    deletions: number;
    modifications: number;
    totalLines: number;
  };
}



/**
 * Calculate similarity between two strings (0-1 scale)
 */
function calculateSimilarity(str1: string, str2: string): number {
  if (str1 === str2) return 1;
  if (str1.length === 0 || str2.length === 0) return 0;
  
  // Simple similarity based on common characters
  const longer = str1.length > str2.length ? str1 : str2;
  const shorter = str1.length > str2.length ? str2 : str1;
  
  let matches = 0;
  for (let i = 0; i < shorter.length; i++) {
    if (longer.includes(shorter[i])) {
      matches++;
    }
  }
  
  return matches / longer.length;
}

/**
 * Find best matching line for modification detection
 */
function findBestMatch(targetLine: string, candidateLines: string[]): { index: number; similarity: number } {
  let bestMatch = { index: -1, similarity: 0 };
  
  candidateLines.forEach((line, index) => {
    const similarity = calculateSimilarity(targetLine, line);
    if (similarity > bestMatch.similarity && similarity > 0.3) { // 30% similarity threshold
      bestMatch = { index, similarity };
    }
  });
  
  return bestMatch;
}

/**
 * Generate word-level diff segments for two lines
 */
export function generateWordDiffForLines(originalLine: string, improvedLine: string): WordDiffSegment[] {
  const changes = diffWordsWithSpace(originalLine, improvedLine);
  
  return changes.map((change: Change) => ({
    type: change.added ? 'added' : change.removed ? 'removed' : 'unchanged',
    content: change.value
  }));
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
 * Generate side-by-side diff view (GitHub style) with word-level highlighting
 */
export function generateSideBySideDiff(original: string, improved: string): SideBySideDiff {
  const changes = diffLines(original, improved);
  
  const leftLines: SideBySideDiff['leftLines'] = [];
  const rightLines: SideBySideDiff['rightLines'] = [];
  
  let leftLineNumber = 1;
  let rightLineNumber = 1;
  let additions = 0;
  let deletions = 0;
  let modifications = 0;

  // Collect removed and added lines for modification detection
  const removedLines: Array<{ content: string; index: number }> = [];
  const addedLines: Array<{ content: string; index: number }> = [];

  // First pass: collect all changes
  changes.forEach((change: Change) => {
    const lines = change.value.split('\n');
    if (lines[lines.length - 1] === '') {
      lines.pop();
    }

    if (change.added) {
      lines.forEach(line => {
        addedLines.push({ content: line, index: rightLines.length });
        rightLines.push({
          content: line,
          lineNumber: rightLineNumber++,
          type: 'added'
        });
        leftLines.push({
          content: '',
          lineNumber: leftLineNumber,
          type: 'unchanged',
          isEmpty: true
        });
      });
    } else if (change.removed) {
      lines.forEach(line => {
        removedLines.push({ content: line, index: leftLines.length });
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

  // Second pass: detect modifications
  const processedRemoved = new Set<number>();
  const processedAdded = new Set<number>();

  removedLines.forEach(({ content: removedContent, index: removedIndex }) => {
    if (processedRemoved.has(removedIndex)) return;

    const addedCandidates = addedLines
      .filter(({ index }) => !processedAdded.has(index))
      .map(({ content }) => content);

    const match = findBestMatch(removedContent, addedCandidates);
    
    if (match.index !== -1) {
      const matchedAddedLine = addedLines.find(({ content }) => content === addedCandidates[match.index]);
      if (matchedAddedLine) {
        const addedIndex = matchedAddedLine.index;
        const wordDiff = generateWordDiffForLines(removedContent, matchedAddedLine.content);
        
        // Update left side (removed/modified)
        leftLines[removedIndex] = {
          ...leftLines[removedIndex],
          type: 'modified',
          wordDiff
        };
        
        // Update right side (added/modified)
        rightLines[addedIndex] = {
          ...rightLines[addedIndex],
          type: 'modified',
          wordDiff
        };
        
        processedRemoved.add(removedIndex);
        processedAdded.add(addedIndex);
        modifications++;
      }
    }
  });

  // Count final stats
  additions = rightLines.filter(line => line.type === 'added').length;
  deletions = leftLines.filter(line => line.type === 'removed').length;

  return {
    leftLines,
    rightLines,
    stats: {
      additions,
      deletions,
      modifications,
      totalLines: Math.max(leftLines.length, rightLines.length)
    }
  };
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