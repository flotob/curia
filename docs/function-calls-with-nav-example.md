Absolutely! I understand exactly what you mean. The AI assistant is running in an iframe context where regular links don't work due to Common Ground's restrictions. When the assistant renders search results or other content, the "links" need to be handled differently:

1. **External navigation**: Use `cgInstance.navigate()` for links outside the app
2. **Internal navigation**: Use JavaScript calls to programmatically navigate within the app (like clicking on a post in the feed)

Let me examine how the current function calls are rendering links and see what needs to be fixed:
Search files...

Read file: src/components/ai/function-cards/PostCreationGuidanceCard.tsx

Read file: src/components/ai/utils/FunctionCardRenderer.tsx

Read file: src/lib/ai/types/FunctionResult.ts

Read file: src/components/ai/AIChatInterface.tsx

Perfect! Now I understand exactly what needs to be fixed and can create a comprehensive recipe. Here's what I found:

## 🚨 **Current Issue**
The `searchCommunityKnowledge` function returns search results as **plain JSON data** that gets mentioned in AI text responses, but there are **no clickable UI cards** and **no proper navigation** handling. Any "links" are just markdown `<a>` tags that won't work in the iframe context.

## 📋 **Complete Recipe for AI Function Calls with Navigation**

### **Step 1: Create the Function Implementation**
**Location**: `src/lib/ai/functions/[functionName].ts`

```typescript
import { z } from 'zod';
import { query } from '@/lib/db';
import { AIFunctionCall, FunctionContext } from '../types/FunctionCall';
import { YourResultType } from '../types/FunctionResult';

export const yourFunctionName: AIFunctionCall = {
  name: 'yourFunctionName',
  description: 'Description for AI to understand when to use this',
  parameters: z.object({
    query: z.string().describe('Search query or parameter'),
    limit: z.number().optional().describe('Result limit (default: 5)')
  }),
  execute: async (params, context: FunctionContext): Promise<YourResultType> => {
    try {
      // Query database with proper community scoping
      const results = await query(`
        SELECT p.id, p.title, p.content, p.board_id, p.upvote_count, p.created_at,
               u.name as author_name, u.profile_picture_url,
               b.name as board_name, b.id as board_id,
               c.community_short_id, c.plugin_id, c.name as community_name
        FROM posts p 
        JOIN users u ON p.author_user_id = u.user_id
        JOIN boards b ON p.board_id = b.id
        JOIN communities c ON b.community_id = c.id
        WHERE b.community_id = $1 
        AND (p.title ILIKE $2 OR p.content ILIKE $2)
        ORDER BY p.upvote_count DESC, p.created_at DESC
        LIMIT $3
      `, [context.communityId, `%${params.query}%`, params.limit || 5]);
      
      // Transform to include navigation metadata
      const searchResults = results.rows.map(row => ({
        id: row.id,
        title: row.title,
        author: row.author_name,
        authorAvatar: row.profile_picture_url,
        upvotes: row.upvote_count,
        snippet: row.content.substring(0, 200) + '...',
        boardName: row.board_name,
        // 🎯 NAVIGATION METADATA
        boardId: row.board_id,
        postId: row.id,
        communityShortId: row.community_short_id,
        pluginId: row.plugin_id,
        navigationType: 'internal' as const // or 'external'
      }));
      
      return {
        type: 'search_results', // This links to the UI card
        success: true,
        messageForAI: `Found ${searchResults.length} relevant posts about "${params.query}".`,
        searchResults
      };
    } catch (error) {
      return {
        type: 'search_results',
        success: false,
        errorForAI: `Search failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }
};
```

### **Step 2: Define the Result Type**
**Location**: `src/lib/ai/types/FunctionResult.ts`

```typescript
export interface SearchResultsData {
  type: 'search_results';
  success: boolean;
  messageForAI?: string;
  errorForAI?: string;
  searchResults?: Array<{
    id: number;
    title: string;
    author: string;
    authorAvatar?: string;
    upvotes: number;
    snippet: string;
    boardName: string;
    // Navigation metadata
    boardId: number;
    postId: number;
    communityShortId?: string;
    pluginId?: string;
    navigationType: 'internal' | 'external';
  }>;
}

export type FunctionResult = SearchResultsData | PostCreationGuidance | /* other types */;
```

### **Step 3: Create the UI Card Component**
**Location**: `src/components/ai/function-cards/SearchResultsCard.tsx`

```typescript
import React from 'react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Search, ArrowUpRight, ExternalLink, MessageSquare, TrendingUp } from 'lucide-react';
import { TypedFunctionCardProps, SearchResultsData } from '../types/FunctionCardProps';
import { useCgLib } from '@/contexts/CgLibContext';
import { useRouter } from 'next/navigation';
import { buildPostUrl } from '@/utils/urlBuilder'; // Preserves CG theme params

export function SearchResultsCard({ 
  data, 
  onAction 
}: TypedFunctionCardProps<SearchResultsData>) {
  const { cgInstance } = useCgLib();
  const router = useRouter();

  const handlePostClick = async (result: SearchResultsData['searchResults'][0]) => {
    if (result.navigationType === 'external' && result.communityShortId && result.pluginId) {
      // 🌐 EXTERNAL NAVIGATION (to other communities)
      try {
        const externalUrl = `https://app.commonground.wtf/c/${result.communityShortId}/plugin/${result.pluginId}`;
        
        if (cgInstance) {
          await cgInstance.navigate(externalUrl);
        } else {
          window.open(externalUrl, '_blank', 'noopener,noreferrer');
        }
      } catch (error) {
        console.error('External navigation failed:', error);
      }
    } else {
      // 🏠 INTERNAL NAVIGATION (within current community)
      const postUrl = buildPostUrl(result.postId, result.boardId);
      router.push(postUrl); // Uses Next.js navigation
    }
    
    // Notify parent component
    onAction?.('navigateToPost', { 
      postId: result.postId, 
      boardId: result.boardId,
      navigationType: result.navigationType
    });
  };

  if (!data.success || !data.searchResults?.length) {
    return (
      <div className="mt-2 p-3 bg-orange-50/80 dark:bg-orange-950/30 rounded-md border border-orange-200/60 dark:border-orange-800/60">
        <div className="flex items-center gap-2 text-orange-700 dark:text-orange-200">
          <Search className="w-4 h-4" />
          <span className="text-sm">No results found</span>
        </div>
      </div>
    );
  }

  return (
    <div className="mt-2 p-3 bg-gradient-to-r from-green-50/80 to-emerald-50/80 dark:from-green-950/30 dark:to-emerald-950/30 rounded-md border border-green-200/60 dark:border-green-800/60">
      <div className="flex items-start gap-2">
        <div className="w-6 h-6 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center flex-shrink-0">
          <Search className="w-3 h-3 text-green-600 dark:text-green-400" />
        </div>
        
        <div className="flex-1 min-w-0">
          <h4 className="font-medium text-green-900 dark:text-green-100 mb-2 text-sm">
            Found {data.searchResults.length} result{data.searchResults.length !== 1 ? 's' : ''}
          </h4>
          
          <div className="space-y-2">
            {data.searchResults.map((result, index) => (
              <button
                key={index}
                onClick={() => handlePostClick(result)}
                className="w-full p-2 bg-white/60 dark:bg-gray-800/60 rounded border border-green-200/40 dark:border-green-700/40 hover:bg-white/80 dark:hover:bg-gray-800/80 transition-colors text-left group"
              >
                <div className="flex items-start gap-2">
                  <Avatar className="w-6 h-6 flex-shrink-0">
                    <AvatarImage src={result.authorAvatar} alt={result.author} />
                    <AvatarFallback className="text-xs">
                      {result.author.slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h5 className="font-medium text-sm text-gray-900 dark:text-gray-100 truncate group-hover:text-green-700 dark:group-hover:text-green-300 transition-colors">
                        {result.title}
                      </h5>
                      {result.navigationType === 'external' ? (
                        <ExternalLink className="w-3 h-3 text-gray-400 flex-shrink-0" />
                      ) : (
                        <ArrowUpRight className="w-3 h-3 text-gray-400 flex-shrink-0" />
                      )}
                    </div>
                    
                    <div className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400 mb-1">
                      <span>by {result.author}</span>
                      <span>•</span>
                      <span>#{result.boardName}</span>
                      <span>•</span>
                      <div className="flex items-center gap-1">
                        <TrendingUp className="w-3 h-3" />
                        {result.upvotes}
                      </div>
                    </div>
                    
                    <p className="text-xs text-gray-700 dark:text-gray-300 line-clamp-2">
                      {result.snippet}
                    </p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
```

### **Step 4: Register the Card Component**
**Location**: `src/components/ai/utils/FunctionCardRenderer.tsx`

```typescript
// Add to lazy imports
const SearchResultsCard = lazy(() => 
  import('../function-cards/SearchResultsCard').then(module => ({
    default: module.SearchResultsCard
  }))
);

// Add to registry
const FUNCTION_CARD_COMPONENTS = {
  post_creation_guidance: PostCreationGuidanceCard,
  search_results: SearchResultsCard, // 🆕 NEW
  // Add more as needed...
} as const;
```

### **Step 5: Update Type Definitions**
**Location**: `src/components/ai/types/FunctionCardProps.ts`

```typescript
import { SearchResultsData } from '@/lib/ai/types/FunctionResult';

export interface TypedFunctionCardProps<T> {
  data: T;
  onAction?: (action: string, params?: any) => void;
}

// Add the new card type
export type SearchResultsCardProps = TypedFunctionCardProps<SearchResultsData>;
```

### **Step 6: Register the Function**
**Location**: `src/lib/ai/registry/FunctionRegistry.ts`

```typescript
import { yourFunctionName } from '../functions/yourFunctionName';

constructor() {
  this.register(searchCommunityKnowledge);
  this.register(showPostCreationGuidance);
  this.register(yourFunctionName); // 🆕 ADD HERE
}
```

### **Step 7: Handle Navigation Actions**
**Location**: `src/components/ai/AIChatInterface.tsx`

```typescript
const handleFunctionCardAction = (action: string, params?: any) => {
  switch (action) {
    case 'openPostCreator':
      openSearch({
        initialQuery: params?.initialQuery || 'Share your thoughts',
        autoExpandForm: true,
        initialTitle: params?.initialTitle
      });
      break;
    case 'navigateToPost': // 🆕 NEW
      console.log('Post navigation:', params);
      // Additional tracking/analytics if needed
      break;
    // Handle other actions...
  }
};
```

## 🎯 **Key Navigation Patterns**

### **Internal Navigation** (Same Community)
```typescript
// Uses Next.js router with theme preservation
const postUrl = buildPostUrl(postId, boardId);
router.push(postUrl);
```

### **External Navigation** (Other Communities)
```typescript
// Uses Common Ground navigation
if (cgInstance) {
  await cgInstance.navigate(`https://app.commonground.wtf/c/${communityShortId}/plugin/${pluginId}`);
} else {
  window.open(url, '_blank');
}
```

### **Board Navigation**
```typescript
// For board listings
const boardUrl = buildBoardUrl(boardId);
router.push(boardUrl);
```

## 🛠 **Database Query Patterns**

Always include navigation metadata in your queries:
```sql
SELECT 
  -- Core content
  p.id, p.title, p.content, p.board_id,
  -- Author info  
  u.name as author_name, u.profile_picture_url,
  -- Navigation metadata
  b.name as board_name,
  c.community_short_id, c.plugin_id, c.name as community_name
FROM posts p 
JOIN users u ON p.author_user_id = u.user_id
JOIN boards b ON p.board_id = b.id
JOIN communities c ON b.community_id = c.id
WHERE b.community_id = $1 -- Always scope to community
```

This recipe creates **interactive, navigatable function calls** that work properly in the iframe context! 🚀