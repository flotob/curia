import { ApiComment } from '@/app/api/posts/[postId]/comments/route';

/**
 * Represents a comment in a hierarchical tree structure
 */
export interface CommentTree {
  comment: ApiComment;
  children: CommentTree[];
  depth: number;
}

/**
 * Configuration options for comment tree building
 */
export interface CommentTreeOptions {
  maxDepth?: number; // Maximum nesting depth (default: 5)
  sortChildren?: boolean; // Whether to sort children by created_at (default: true)
}

/**
 * Build hierarchical comment tree from flat comment array
 * 
 * @param comments - Flat array of comments
 * @param options - Configuration options
 * @returns Array of root-level comment trees
 */
export function buildCommentTree(
  comments: ApiComment[], 
  options: CommentTreeOptions = {}
): CommentTree[] {
  const { maxDepth = 5, sortChildren = true } = options;
  
  // Handle empty array
  if (!comments || comments.length === 0) {
    return [];
  }

  const commentMap = new Map<number, CommentTree>();
  const rootComments: CommentTree[] = [];
  
  // Sort comments for consistent tree building
  const sortedComments = sortChildren 
    ? [...comments].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
    : comments;
  
  // First pass: create all tree nodes
  sortedComments.forEach(comment => {
    commentMap.set(comment.id, {
      comment,
      children: [],
      depth: 0
    });
  });
  
  // Second pass: build parent-child relationships
  sortedComments.forEach(comment => {
    const node = commentMap.get(comment.id)!;
    
    if (comment.parent_comment_id) {
      const parent = commentMap.get(comment.parent_comment_id);
      if (parent && parent.depth < maxDepth) {
        // Valid parent found and within depth limit
        parent.children.push(node);
        node.depth = parent.depth + 1;
      } else {
        // Parent not found or exceeds depth limit, treat as root
        console.warn(`Comment ${comment.id} parent ${comment.parent_comment_id} not found or exceeds max depth, treating as root`);
        rootComments.push(node);
      }
    } else {
      // Top-level comment
      rootComments.push(node);
    }
  });
  
  // Sort children recursively if requested
  if (sortChildren) {
    sortTreeChildren(rootComments);
  }
  
  return rootComments;
}

/**
 * Recursively sort comment tree children by created_at
 */
function sortTreeChildren(trees: CommentTree[]): void {
  trees.forEach(tree => {
    if (tree.children.length > 0) {
      tree.children.sort((a, b) => 
        new Date(a.comment.created_at).getTime() - new Date(b.comment.created_at).getTime()
      );
      sortTreeChildren(tree.children);
    }
  });
}

/**
 * Get total comment count from comment tree (including nested)
 */
export function getCommentTreeCount(trees: CommentTree[]): number {
  return trees.reduce((count, tree) => {
    return count + 1 + getCommentTreeCount(tree.children);
  }, 0);
}

/**
 * Find a specific comment in the tree by ID
 */
export function findCommentInTree(trees: CommentTree[], commentId: number): CommentTree | null {
  for (const tree of trees) {
    if (tree.comment.id === commentId) {
      return tree;
    }
    
    const found = findCommentInTree(tree.children, commentId);
    if (found) {
      return found;
    }
  }
  
  return null;
}

/**
 * Get all comment IDs in the tree (flattened)
 */
export function flattenCommentIds(trees: CommentTree[]): number[] {
  const ids: number[] = [];
  
  function collectIds(trees: CommentTree[]) {
    trees.forEach(tree => {
      ids.push(tree.comment.id);
      collectIds(tree.children);
    });
  }
  
  collectIds(trees);
  return ids;
}

/**
 * Calculate CSS class name for comment depth indentation
 */
export function getDepthClassName(depth: number): string {
  const maxDisplayDepth = 5;
  const clampedDepth = Math.min(depth, maxDisplayDepth);
  return `comment-depth-${clampedDepth}`;
}

/**
 * Calculate inline style for comment indentation (fallback)
 */
export function getDepthStyle(depth: number): React.CSSProperties {
  const maxDisplayDepth = 5;
  const clampedDepth = Math.min(depth, maxDisplayDepth);
  const indentPx = clampedDepth * 16; // 1rem = 16px
  
  return {
    paddingLeft: `${indentPx}px`
  };
} 