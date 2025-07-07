I'll study the function call system in your chat assistant to understand the pattern and create a recipe for adding new database query functions. Let me explore the current implementation:
Search files...

Ran tool

Read file: src/lib/ai/functions/showPostCreationGuidance.ts

Read file: src/app/api/ai/chat/route.ts

Search files...

Based on my analysis of your function call system, here's a comprehensive **recipe for adding new database query function calls** to your AI chat assistant:

## 📋 **Current Function Call Architecture**

You have a **modular, well-structured system** with 2 function calls:
1. **`searchCommunityKnowledge`** - Database query for posts search
2. **`showPostCreationGuidance`** - UI interaction for post creation

## 🎯 **Recipe for Adding New Function Calls**

### **Step 1: Create the Function Implementation**

**Location**: `src/lib/ai/functions/[functionName].ts`

```typescript
import { z } from 'zod';
import { query } from '@/lib/db';
import { AIFunctionCall, FunctionContext } from '../types/FunctionCall';
import { YourResultType } from '../types/FunctionResult';

export const yourFunctionName: AIFunctionCall = {
  name: 'yourFunctionName',
  description: 'Clear description for AI model to understand when to use this',
  parameters: z.object({
    param1: z.string().describe('Description for AI model'),
    param2: z.number().optional().describe('Optional parameter with default'),
    // Add more parameters as needed
  }),
  execute: async (params: { param1: string; param2?: number }, context: FunctionContext): Promise<YourResultType> => {
    try {
      // Your database query using available context
      const queryResult = await query(
        `SELECT * FROM your_table 
         WHERE community_id = $1 AND your_condition = $2
         ORDER BY some_field DESC
         LIMIT $3`,
        [context.communityId, params.param1, params.param2 || 5]
      );
      
      // Process results
      const processedResults = queryResult.rows.map(row => ({
        // Transform database row to UI-friendly format
      }));
      
      return {
        type: 'your_result_type', // Must match UI component type
        success: true,
        results: processedResults,
        messageForAI: `Found ${processedResults.length} items about "${params.param1}".`
      };
    } catch (error) {
      return {
        type: 'your_result_type',
        success: false,
        errorForAI: `Query failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }
};
```

### **Step 2: Define Result Types**

**Location**: `src/lib/ai/types/FunctionResult.ts`

```typescript
// Add your new result type
export interface YourResultType {
  type: 'your_result_type';
  success: boolean;
  results?: Array<{
    // Define the structure of your result items
    id: number;
    title: string;
    description: string;
    metadata?: any;
  }>;
  messageForAI?: string;
  errorForAI?: string;
}

// Add to the union type
export type FunctionResult = SearchResults | PostCreationGuidance | YourResultType;
```

### **Step 3: Register the Function**

**Location**: `src/lib/ai/registry/FunctionRegistry.ts`

```typescript
import { yourFunctionName } from '../functions/yourFunctionName';

export class FunctionRegistry {
  constructor() {
    // Add your function to the registry
    this.register(searchCommunityKnowledge);
    this.register(showPostCreationGuidance);
    this.register(yourFunctionName); // 👈 Add this line
  }
  // ... rest of the class
}
```

### **Step 4: Create UI Component** 

**Location**: `src/components/ai/function-cards/YourComponentCard.tsx`

```typescript
import React from 'react';
import { Button } from '@/components/ui/button';
import { SomeIcon, ArrowRight } from 'lucide-react';
import { TypedFunctionCardProps, YourResultData } from '../types/FunctionCardProps';

export interface YourResultData {
  type: 'your_result_type';
  success: boolean;
  results: Array<{
    id: number;
    title: string;
    description: string;
  }>;
}

export function YourComponentCard({ 
  data, 
  onAction 
}: TypedFunctionCardProps<YourResultData>) {
  const handleViewItem = (itemId: number) => {
    onAction?.('navigateToItem', { itemId });
  };

  if (!data.success || !data.results?.length) {
    return (
      <div className="mt-2 p-3 bg-muted rounded-md">
        <p className="text-sm text-muted-foreground">No results found.</p>
      </div>
    );
  }

  return (
    <div className="mt-2 p-3 bg-gradient-to-r from-emerald-50/80 to-teal-50/80 dark:from-emerald-950/30 dark:to-teal-950/30 rounded-md border border-emerald-200/60 dark:border-emerald-800/60">
      <div className="flex items-start gap-2">
        <div className="w-6 h-6 rounded-full bg-emerald-100 dark:bg-emerald-900 flex items-center justify-center flex-shrink-0">
          <SomeIcon className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
        </div>
        
        <div className="flex-1 min-w-0">
          <h4 className="font-medium text-emerald-900 dark:text-emerald-100 mb-2 text-sm">
            Found {data.results.length} Results
          </h4>
          
          <div className="space-y-2">
            {data.results.map((item) => (
              <div key={item.id} className="flex items-center justify-between p-2 bg-white/60 dark:bg-black/20 rounded border">
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm text-emerald-900 dark:text-emerald-100 truncate">
                    {item.title}
                  </p>
                  <p className="text-xs text-emerald-700 dark:text-emerald-200 truncate">
                    {item.description}
                  </p>
                </div>
                <Button 
                  onClick={() => handleViewItem(item.id)}
                  size="sm"
                  variant="outline"
                  className="ml-2 flex-shrink-0"
                >
                  View <ArrowRight className="w-3 h-3 ml-1" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
```

### **Step 5: Register UI Component**

**Location**: `src/components/ai/utils/FunctionCardRenderer.tsx`

```typescript
// Import your component
const YourComponentCard = lazy(() => 
  import('../function-cards/YourComponentCard').then(module => ({
    default: module.YourComponentCard
  }))
);

// Add to registry
const FUNCTION_CARD_COMPONENTS = {
  post_creation_guidance: PostCreationGuidanceCard,
  your_result_type: YourComponentCard, // 👈 Add this line
} as const;
```

### **Step 6: Add Action Handler**

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
    case 'navigateToItem': // 👈 Add your action handler
      // Navigate to the specific item
      router.push(`/your-route/${params?.itemId}`);
      break;
    // Handle other actions as we add more function cards
  }
};
```

### **Step 7: Update Type Definitions**

**Location**: `src/components/ai/types/FunctionCardProps.ts`

```typescript
// Add your data type
export interface YourResultData {
  type: 'your_result_type';
  success: boolean;
  results: Array<{
    id: number;
    title: string;
    description: string;
  }>;
}

// Add to union type
export type FunctionCardData = PostCreationGuidanceData | YourResultData;
```

## 🗄️ **Available Database Tables & Patterns**

Based on your schema, here are **common query patterns** for new function calls:

### **Posts & Content Queries**
```sql
-- Trending posts by upvotes
SELECT p.*, u.name as author_name, b.name as board_name
FROM posts p 
JOIN users u ON p.author_user_id = u.user_id
JOIN boards b ON p.board_id = b.id
WHERE b.community_id = $1 
ORDER BY p.upvote_count DESC, p.created_at DESC
LIMIT $2

-- Recent activity by user
SELECT p.*, u.name as author_name 
FROM posts p 
JOIN users u ON p.author_user_id = u.user_id
JOIN boards b ON p.board_id = b.id
WHERE b.community_id = $1 AND p.author_user_id = $2
ORDER BY p.created_at DESC
LIMIT $3
```

### **User & Social Queries**
```sql
-- Community active users
SELECT u.user_id, u.name, COUNT(p.id) as post_count
FROM users u
JOIN posts p ON u.user_id = p.author_user_id  
JOIN boards b ON p.board_id = b.id
WHERE b.community_id = $1
GROUP BY u.user_id, u.name
ORDER BY post_count DESC
LIMIT $2

-- User's friends in community
SELECT uf.friend_user_id, uf.friend_name, uf.friend_image_url
FROM user_friends uf
WHERE uf.user_id = $1 AND uf.friendship_status = 'active'
LIMIT $2
```

### **Community Analytics Queries**
```sql
-- Board activity stats
SELECT b.id, b.name, COUNT(p.id) as post_count, 
       MAX(p.created_at) as last_activity
FROM boards b
LEFT JOIN posts p ON b.id = p.board_id
WHERE b.community_id = $1
GROUP BY b.id, b.name
ORDER BY post_count DESC

-- Tag trends
SELECT unnest(p.tags) as tag, COUNT(*) as frequency
FROM posts p
JOIN boards b ON p.board_id = b.id  
WHERE b.community_id = $1 AND p.created_at > NOW() - INTERVAL '30 days'
GROUP BY tag
ORDER BY frequency DESC
LIMIT $2
```

## 🚀 **Example Function Call Ideas**

Based on your database, here are some **high-value function calls** you could implement:

1. **`getTrendingPosts`** - Recent popular posts in community
2. **`getUserActivity`** - User's recent posts/comments  
3. **`getBoardStats`** - Activity stats for each board
4. **`getTagTrends`** - Popular tags in community
5. **`findActiveUsers`** - Most active community members
6. **`getMyBookmarks`** - User's bookmarked posts
7. **`getMyFriends`** - User's friends in the community
8. **`getRecentComments`** - Latest comment activity
9. **`getLockStats`** - Popular/trending locks
10. **`getCommunityPartnerships`** - Partner communities

## 🎯 **Best Practices**

1. **Always scope by `community_id`** to keep results relevant
2. **Use LIMIT** to prevent overwhelming results  
3. **Include meaningful metadata** (author names, timestamps, counts)
4. **Handle errors gracefully** with `errorForAI` messages
5. **Make UI components reusable** with proper TypeScript interfaces
6. **Add loading states** in UI components for better UX
7. **Use semantic colors** in gradients (blue for search, green for stats, etc.)

This architecture will scale beautifully as you add more function calls! 🎯