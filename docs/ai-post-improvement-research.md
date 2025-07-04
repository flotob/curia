# AI Post Improvement System - Research & Implementation Spec

## 📋 **Feature Overview**

**Goal**: Intercept post/comment submission flow to show AI-improved version in a GitHub-style diff modal before posting.

**User Flow**:
1. User writes post/comment and hits "Submit"
2. Instead of posting immediately, content is sent to AI for improvement
3. Split-screen modal opens showing:
   - **Left**: Original content 
   - **Right**: AI-improved version
   - **Diff highlighting**: Green additions, red deletions, synchronized line-by-line
4. User can accept, reject, or manually edit before final submission

**Inspiration**: GitHub diff view with line-by-line synchronization and color coding.

---

## 🏗️ **Current Architecture Analysis**

### **Post Creation Flow**
**Primary Components**:
- `NewPostForm.tsx` - Main post creation (expandable card)
- `ExpandedNewPostForm.tsx` - Full post creation modal
- `ModalContainer.tsx` - Manages post + lock creation modals

**Submit Handler Location**:
```typescript
// src/components/voting/NewPostForm.tsx:271
const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
  e.preventDefault();
  // ... validation logic
  createPostMutation.mutate({ title, content: currentContentJson, tags: tagsArray, boardId: selectedBoardId, settings });
};

// src/components/voting/ExpandedNewPostForm.tsx:241
const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
  e.preventDefault();
  // ... validation logic
  createPostMutation.mutate({ title, content: markdownContent, tags: tagsArray, boardId: selectedBoardId, settings, lockId });
};
```

### **Comment Creation Flow**
**Primary Components**:
- `NewCommentForm.tsx` - Main comment creation
- `InlineReplyForm.tsx` - Reply to specific comments

**Submit Handler Location**:
```typescript
// src/components/voting/NewCommentForm.tsx:175
const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
  e.preventDefault();
  // ... validation logic
  addCommentMutation.mutate({ content: markdownContent, parent_comment_id: parentCommentId });
};
```

### **Current AI Infrastructure**
**Existing Implementation**:
- `src/app/api/ai/chat/route.ts` - Chat-based AI endpoint with 4 tools
- AI SDK v4 with `streamText` and tool calling
- Database logging (`ai_conversations`, `ai_messages`, `ai_usage_logs`)

**Available Tools**:
1. `analyzeContent` - Currently mock analysis
2. `generateImprovements` - Currently mock improvements  
3. `searchCommunityKnowledge` - Real database search
4. `suggestContentStructure` - Currently mock structure

---

## 🎯 **Implementation Strategy**

### **Option A: Intercept Submit Flow**
**Pros**: Clean user experience, no new UI patterns
**Cons**: Complex state management, harder testing

### **Option B: Add "Improve with AI" Button** 
**Pros**: Simpler implementation, optional feature
**Cons**: Extra step for users, less seamless

**Recommendation**: **Option A** - Intercept submit flow for seamless UX

---

## 🔧 **Technical Implementation Plan**

### **Phase 1: AI Improvement API** (2-3 hours)

#### **1.1 New API Endpoint**
**Location**: `src/app/api/ai/improve/route.ts`

```typescript
export const POST = withAuthAndErrorHandling(async (request: EnhancedAuthRequest) => {
  const { content, type } = await request.json(); // type: 'post' | 'comment'
  
  const result = await streamText({
    model: openai('gpt-4o-mini'),
    messages: [
      { role: 'system', content: IMPROVEMENT_SYSTEM_PROMPT },
      { role: 'user', content: `Improve this ${type}:\n\n${content}` }
    ],
    tools: {
      generateImprovedContent: {
        description: 'Generate improved version of content with specific changes',
        parameters: z.object({
          improvedContent: z.string(),
          changes: z.array(z.object({
            type: z.enum(['addition', 'deletion', 'modification']),
            originalText: z.string(),
            improvedText: z.string(),
            startIndex: z.number(),
            endIndex: z.number(),
            reason: z.string()
          }))
        }),
        execute: async (params) => ({ success: true, ...params })
      }
    }
  });
  
  return result.toDataStreamResponse();
});
```

#### **1.2 Enhanced AI Prompting**
```typescript
const IMPROVEMENT_SYSTEM_PROMPT = `You are an expert content editor. Improve the provided content for:
- Grammar and spelling
- Clarity and readability  
- Engagement and tone
- Structure and flow

Return specific improvements with exact text positions for diff generation.`;
```

### **Phase 2: Diff Generation Library** (1-2 hours)

#### **2.1 Diff Utilities**
**Location**: `src/utils/diffUtils.ts`

```typescript
import { diffChars, diffWords, diffLines } from 'diff';

export interface DiffChange {
  type: 'added' | 'removed' | 'unchanged';
  content: string;
  lineNumber?: number;
}

export function generateDiff(original: string, improved: string): DiffChange[] {
  const changes = diffLines(original, improved);
  return changes.map((change, index) => ({
    type: change.added ? 'added' : change.removed ? 'removed' : 'unchanged',
    content: change.value,
    lineNumber: index + 1
  }));
}

export function generateSideBySideDiff(original: string, improved: string) {
  const originalLines = original.split('\n');
  const improvedLines = improved.split('\n');
  const diff = generateDiff(original, improved);
  
  // Generate synchronized line-by-line view
  return {
    leftLines: originalLines.map((line, i) => ({ content: line, lineNumber: i + 1 })),
    rightLines: improvedLines.map((line, i) => ({ content: line, lineNumber: i + 1 })),
    changes: diff
  };
}
```

#### **2.2 Diff Display Component**
**Location**: `src/components/ai/DiffViewer.tsx`

```typescript
interface DiffViewerProps {
  original: string;
  improved: string;
  onAccept: () => void;
  onReject: () => void;
  onEdit: (content: string) => void;
}

export function DiffViewer({ original, improved, onAccept, onReject, onEdit }: DiffViewerProps) {
  const { leftLines, rightLines, changes } = generateSideBySideDiff(original, improved);
  
  return (
    <div className="grid grid-cols-2 gap-4 h-full">
      {/* Left: Original */}
      <div className="border rounded-lg">
        <div className="bg-red-50 px-4 py-2 border-b">
          <h3 className="font-semibold text-red-800">Original</h3>
        </div>
        <div className="p-4 font-mono text-sm overflow-auto">
          {leftLines.map((line, i) => (
            <div key={i} className="flex">
              <span className="text-gray-400 mr-4">{line.lineNumber}</span>
              <span>{line.content}</span>
            </div>
          ))}
        </div>
      </div>
      
      {/* Right: Improved */}
      <div className="border rounded-lg">
        <div className="bg-green-50 px-4 py-2 border-b">
          <h3 className="font-semibold text-green-800">AI Improved</h3>
        </div>
        <div className="p-4 font-mono text-sm overflow-auto">
          {rightLines.map((line, i) => (
            <div key={i} className="flex">
              <span className="text-gray-400 mr-4">{line.lineNumber}</span>
              <span>{line.content}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
```

### **Phase 3: Improvement Modal** (2-3 hours)

#### **3.1 Modal Component**
**Location**: `src/components/ai/PostImprovementModal.tsx`

```typescript
interface PostImprovementModalProps {
  isOpen: boolean;
  onClose: () => void;
  originalContent: string;
  contentType: 'post' | 'comment';
  onSubmitOriginal: () => void;
  onSubmitImproved: (improvedContent: string) => void;
}

export function PostImprovementModal({
  isOpen,
  onClose,
  originalContent,
  contentType,
  onSubmitOriginal,
  onSubmitImproved
}: PostImprovementModalProps) {
  const [improvedContent, setImprovedContent] = useState<string>('');
  const [isImproving, setIsImproving] = useState(false);
  const [error, setError] = useState<string>('');

  const improveContent = async () => {
    setIsImproving(true);
    try {
      const response = await authFetch('/api/ai/improve', {
        method: 'POST',
        body: JSON.stringify({
          content: originalContent,
          type: contentType
        })
      });
      
      // Handle streaming response and extract improved content
      const improved = await extractImprovedContent(response);
      setImprovedContent(improved);
    } catch (err) {
      setError('Failed to improve content');
    } finally {
      setIsImproving(false);
    }
  };

  useEffect(() => {
    if (isOpen && originalContent) {
      improveContent();
    }
  }, [isOpen, originalContent]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl h-[80vh]">
        <DialogHeader>
          <DialogTitle>AI Content Improvement</DialogTitle>
          <DialogDescription>
            Review the AI suggestions and choose how to proceed
          </DialogDescription>
        </DialogHeader>
        
        <div className="flex-1 overflow-hidden">
          {isImproving ? (
            <div className="flex items-center justify-center h-full">
              <Loader2 className="animate-spin mr-2" />
              Analyzing and improving your content...
            </div>
          ) : improvedContent ? (
            <DiffViewer
              original={originalContent}
              improved={improvedContent}
              onAccept={() => onSubmitImproved(improvedContent)}
              onReject={onSubmitOriginal}
              onEdit={setImprovedContent}
            />
          ) : error ? (
            <div className="text-red-500 text-center">{error}</div>
          ) : null}
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={onSubmitOriginal}>
            Post Original
          </Button>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button 
            onClick={() => onSubmitImproved(improvedContent)}
            disabled={!improvedContent}
          >
            Post Improved Version
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

### **Phase 4: Submit Flow Integration** (3-4 hours)

#### **4.1 Modified Submit Handlers**

**Enhanced NewPostForm**:
```typescript
// src/components/voting/NewPostForm.tsx
const [showImprovementModal, setShowImprovementModal] = useState(false);
const [pendingSubmission, setPendingSubmission] = useState<CreatePostMutationPayload | null>(null);

const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
  e.preventDefault();
  
  // ... existing validation logic
  
  const submissionData = { title, content: currentContentJson, tags: tagsArray, boardId: selectedBoardId, settings };
  
  // Check if AI improvement is enabled (could be user preference)
  if (shouldUseAIImprovement()) {
    setPendingSubmission(submissionData);
    setShowImprovementModal(true);
  } else {
    createPostMutation.mutate(submissionData);
  }
};

const handleSubmitOriginal = () => {
  if (pendingSubmission) {
    createPostMutation.mutate(pendingSubmission);
    setShowImprovementModal(false);
    setPendingSubmission(null);
  }
};

const handleSubmitImproved = (improvedContent: string) => {
  if (pendingSubmission) {
    createPostMutation.mutate({
      ...pendingSubmission,
      content: improvedContent
    });
    setShowImprovementModal(false);
    setPendingSubmission(null);
  }
};

// Add to JSX
<PostImprovementModal
  isOpen={showImprovementModal}
  onClose={() => setShowImprovementModal(false)}
  originalContent={JSON.stringify(contentEditor?.getJSON())}
  contentType="post"
  onSubmitOriginal={handleSubmitOriginal}
  onSubmitImproved={handleSubmitImproved}
/>
```

#### **4.2 Similar Pattern for Comments**
Apply the same interceptor pattern to:
- `NewCommentForm.tsx`
- `InlineReplyForm.tsx`

### **Phase 5: User Preferences** (1 hour)

#### **5.1 Settings Integration**
**Location**: Add to user settings in database/UI

```typescript
interface UserAISettings {
  enablePostImprovement: boolean;
  enableCommentImprovement: boolean;
  autoApplyMinorFixes: boolean; // Auto-apply grammar/spelling
  showDiffView: boolean; // vs just show improved version
}
```

---

## 📊 **File Impact Analysis**

### **New Files**
- `src/app/api/ai/improve/route.ts` - AI improvement endpoint
- `src/utils/diffUtils.ts` - Diff generation utilities  
- `src/components/ai/DiffViewer.tsx` - Split-screen diff display
- `src/components/ai/PostImprovementModal.tsx` - Main improvement modal

### **Modified Files**
- `src/components/voting/NewPostForm.tsx` - Add submit interceptor
- `src/components/voting/ExpandedNewPostForm.tsx` - Add submit interceptor
- `src/components/voting/NewCommentForm.tsx` - Add submit interceptor
- `src/components/voting/InlineReplyForm.tsx` - Add submit interceptor
- `src/app/api/ai/chat/route.ts` - Enhance existing improvement tools

### **Dependencies to Add**
```json
{
  "diff": "^5.1.0",
  "@types/diff": "^5.0.3"
}
```

---

## 🚀 **Implementation Roadmap**

### **Step 1: Foundation** (2-3 hours)
1. Create AI improvement API endpoint
2. Build diff generation utilities
3. Install diff dependencies

### **Step 2: UI Components** (3-4 hours)  
1. Build DiffViewer component
2. Create PostImprovementModal
3. Style with GitHub-like diff appearance

### **Step 3: Integration** (3-4 hours)
1. Modify post creation submit handlers
2. Modify comment creation submit handlers  
3. Add modal state management

### **Step 4: Polish** (1-2 hours)
1. Add user preferences for AI improvement
2. Error handling and loading states
3. Testing across different content types

### **Step 5: Enhancement** (Optional - 2-3 hours)
1. Add "explain changes" feature
2. Batch apply/reject specific changes
3. Remember user preferences per content type

---

## 🎯 **Success Criteria**

### **Core Functionality**
- ✅ Intercepts post/comment submission seamlessly  
- ✅ Shows GitHub-style side-by-side diff view
- ✅ Line-by-line synchronization with proper highlighting
- ✅ User can accept, reject, or manually edit before posting

### **User Experience**
- ✅ Fast AI processing (< 3 seconds)
- ✅ Clear visual distinction between original/improved
- ✅ Obvious action buttons (Post Original vs Post Improved)
- ✅ Works on both desktop and mobile

### **Technical Quality**
- ✅ Proper error handling for AI failures
- ✅ Graceful fallback to original posting flow
- ✅ No breaking changes to existing functionality
- ✅ Efficient diff algorithm for large content

---

## ⚠️ **Potential Challenges**

### **Technical Challenges**
1. **Content Format**: Handling Tiptap JSON vs Markdown conversion
2. **Diff Complexity**: Large content with complex formatting
3. **State Management**: Modal state + pending submission coordination
4. **Mobile UX**: Diff view on small screens

### **User Experience Challenges**
1. **AI Latency**: 2-3 second delay before posting
2. **Diff Comprehension**: Users understanding what changed
3. **Choice Paralysis**: Too many options (original vs improved vs edit)
4. **Content Loss**: Users accidentally losing edits

### **Solutions**
1. **Progressive Enhancement**: Make AI improvement optional
2. **Clear Loading States**: Show progress during AI processing
3. **Smart Defaults**: Auto-apply obvious fixes (typos)
4. **Persistent Drafts**: Save content during improvement process

---

## 🔄 **Future Enhancements**

### **Phase 2 Features**
- **Selective Changes**: Apply/reject individual improvements
- **Change Explanations**: Show reasoning for each suggestion
- **Learning**: Improve based on user accept/reject patterns
- **Batch Operations**: "Accept all grammar fixes" buttons

### **Advanced Features**
- **Content Templates**: AI suggests structure improvements
- **Tone Adjustment**: Formal/casual/technical tone options
- **Community Style**: Learn from highly-voted community content
- **Real-time Suggestions**: As-you-type improvements (like Grammarly)

---

## 📝 **Implementation Notes**

### **Architecture Decisions**
- **API Design**: Separate `/api/ai/improve` endpoint for dedicated improvement logic
- **State Management**: Component-level state for modal management (not global)
- **Diff Library**: Use battle-tested `diff` library for reliable change detection
- **Streaming**: Consider streaming for real-time improvement display

### **Performance Considerations**
- **Caching**: Cache improvements for identical content
- **Debouncing**: Prevent rapid-fire API calls
- **Bundle Size**: Lazy load diff viewer components
- **Database**: Log improvements for analytics and learning

### **Accessibility**
- **Keyboard Navigation**: Full diff view keyboard controls
- **Screen Readers**: Proper diff content description
- **Color Blind**: Use patterns + colors for diff highlighting
- **Focus Management**: Proper focus handling in modal

---

This comprehensive plan provides a clear roadmap for implementing the AI post improvement feature with a GitHub-style diff interface, ensuring seamless integration with the existing codebase while maintaining high code quality and user experience standards. 