# TipTap Poll Widget Implementation Research

**Created:** 2025-01-21  
**Status:** Research Phase  
**Priority:** Medium - User Engagement Feature  

## Executive Summary

This document outlines the research and implementation strategy for adding **interactive poll widgets** to TipTap editors in Curia2. Users will be able to insert polls directly into posts and comments via a toolbar button, creating rich interactive content for community engagement.

## Research Findings

### **TipTap Custom Extension Architecture**

Based on TipTap documentation and examples, polls can be implemented as **custom Node extensions** with React components:

#### **Node Extension Pattern**
```typescript
import { Node } from '@tiptap/core'
import { ReactNodeViewRenderer } from '@tiptap/react'
import PollComponent from './PollComponent.tsx'

export const PollExtension = Node.create({
  name: 'poll',
  group: 'block',
  atom: true,  // Prevents content inside
  
  addAttributes() {
    return {
      pollId: { default: null },
      question: { default: '' },
      options: { default: [] },
      allowMultiple: { default: false },
      expiresAt: { default: null },
    }
  },
  
  parseHTML() {
    return [{ tag: 'div[data-poll-id]' }]
  },
  
  renderHTML({ HTMLAttributes }) {
    return ['div', { 'data-poll-id': HTMLAttributes.pollId, class: 'poll-widget' }]
  },
  
  addNodeView() {
    return ReactNodeViewRenderer(PollComponent)
  },
  
  addCommands() {
    return {
      insertPoll: (attributes) => ({ commands }) => {
        return commands.insertContent({ type: this.name, attrs: attributes })
      }
    }
  }
})
```

#### **React Component Integration**
```tsx
import { NodeViewWrapper } from '@tiptap/react'

const PollComponent = ({ node, updateAttributes, editor }) => {
  const { pollId, question, options, allowMultiple } = node.attrs
  
  return (
    <NodeViewWrapper className="poll-widget">
      <div className="poll-container">
        <h3>{question}</h3>
        {options.map(option => (
          <PollOption 
            key={option.id} 
            option={option}
            allowMultiple={allowMultiple}
            onVote={handleVote}
          />
        ))}
      </div>
    </NodeViewWrapper>
  )
}
```

### **Existing React Poll Libraries Analysis**

| Library | Pros | Cons | Verdict |
|---------|------|------|---------|
| **react-polls** | Simple, lightweight, good for basic polls | Archived repo, limited features | ❌ Not maintained |
| **react-leaf-polls** | Multiple poll types, customizable | Limited documentation, small community | ⚠️ Consider for simple cases |
| **@react-poll-widget/ui** | Professional components, good UX | Complex, might be overkill | ⚠️ Worth investigating |
| **Custom Implementation** | Full control, fits our architecture perfectly | More development time | ✅ **Recommended** |

**Recommendation**: Build custom poll components that integrate seamlessly with our existing design system and authentication.

### **Database Schema Design**

Based on research, here's the optimal schema for our polls:

```sql
-- Core poll table
CREATE TABLE polls (
  id SERIAL PRIMARY KEY,
  creator_user_id TEXT NOT NULL REFERENCES users(user_id),
  question TEXT NOT NULL,
  description TEXT,
  poll_type VARCHAR(20) DEFAULT 'single_choice', -- 'single_choice', 'multiple_choice'
  anonymous BOOLEAN DEFAULT false,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Poll options
CREATE TABLE poll_options (
  id SERIAL PRIMARY KEY,
  poll_id INTEGER NOT NULL REFERENCES polls(id) ON DELETE CASCADE,
  option_text TEXT NOT NULL,
  option_order INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Poll votes
CREATE TABLE poll_votes (
  id SERIAL PRIMARY KEY,
  poll_id INTEGER NOT NULL REFERENCES polls(id) ON DELETE CASCADE,
  option_id INTEGER NOT NULL REFERENCES poll_options(id) ON DELETE CASCADE,
  voter_user_id TEXT NOT NULL REFERENCES users(user_id),
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  
  -- Prevent duplicate votes (unless multiple choice)
  UNIQUE(poll_id, option_id, voter_user_id)
);

-- Indexes for performance
CREATE INDEX idx_polls_creator ON polls(creator_user_id);
CREATE INDEX idx_poll_options_poll ON poll_options(poll_id, option_order);
CREATE INDEX idx_poll_votes_poll ON poll_votes(poll_id);
CREATE INDEX idx_poll_votes_user ON poll_votes(voter_user_id);
```

### **Integration with Existing Architecture**

#### **Markdown Storage Compatibility**
Since we now store content as Markdown, polls will be represented as:
```markdown
<!-- Poll Widget -->
<div data-poll-id="123" data-question="What's your favorite framework?" data-options='["React", "Vue", "Angular"]' data-type="single_choice"></div>
```

#### **Toolbar Integration**
Add poll button to `EditorToolbar.tsx`:
```tsx
import { BarChart3 } from 'lucide-react'

<ToolbarButton 
  onClick={handleCreatePoll} 
  isActive={false}
  icon={BarChart3} 
  ariaLabel='Insert poll'
  title='Create Poll'
/>
```

## Implementation Strategy

### **Phase 1: Core Infrastructure (Week 1)**

1. **Database Setup**
   - Create poll tables with migrations
   - Add API endpoints (`/api/polls`)
   - Implement CRUD operations

2. **TipTap Extension**
   - Create `PollExtension` node
   - Basic React component for display
   - Command for inserting polls

3. **Toolbar Integration**
   - Add poll button to EditorToolbar
   - Create poll creation modal

### **Phase 2: Poll Components (Week 2)**

1. **Poll Creation Modal**
   - Question input
   - Dynamic option management (add/remove)
   - Poll type selection (single/multiple choice)
   - Expiration settings

2. **Poll Display Component**
   - Real-time vote rendering
   - Progress bars with percentages
   - Vote buttons with loading states
   - Results visualization

3. **Vote Management**
   - API endpoints for voting
   - Real-time updates (Socket.IO integration)
   - Duplicate vote prevention

### **Phase 3: Advanced Features (Week 3)**

1. **Enhanced UX**
   - Anonymous voting option
   - Poll expiration handling
   - Edit/delete for poll creators
   - Vote count animations

2. **Integration Features**
   - Poll widgets in comments (not just posts)
   - Poll results in notifications
   - Export poll results
   - Poll analytics for creators

## Technical Specifications

### **API Endpoints**

```typescript
// Create poll
POST /api/polls
{
  question: string,
  description?: string,
  options: string[],
  type: 'single_choice' | 'multiple_choice',
  anonymous?: boolean,
  expiresAt?: string
}

// Vote on poll
POST /api/polls/{pollId}/vote
{
  optionIds: number[]  // Array for multiple choice support
}

// Get poll results
GET /api/polls/{pollId}/results
Response: {
  poll: Poll,
  options: PollOption[],
  votes: VoteCount[],
  userVoted: boolean,
  userVotes?: number[]
}
```

### **Component Props**

```typescript
interface PollWidgetProps {
  node: {
    attrs: {
      pollId: number
      question: string
      options: PollOption[]
      allowMultiple: boolean
      expiresAt?: string
    }
  }
  updateAttributes: (attrs: object) => void
  editor: Editor
}

interface PollOption {
  id: number
  text: string
  votes: number
  percentage: number
}
```

### **Styling Considerations**

- **Consistent Design**: Use existing shadcn/ui components
- **Dark Mode**: Support for theme switching
- **Mobile Responsive**: Touch-friendly voting interface
- **Accessibility**: ARIA labels, keyboard navigation
- **Common Ground Theming**: Inherit cg_theme parameters

## User Experience Flow

### **Creating a Poll**
1. User clicks poll button in toolbar
2. Modal opens with poll creation form
3. User enters question and 2+ options
4. Optional: Set poll type, expiration, anonymity
5. Poll widget inserted into editor at cursor
6. Content saves with poll metadata

### **Voting on a Poll**
1. User sees poll widget in post/comment
2. Clicks on desired option(s)
3. Real-time update shows vote registered
4. Vote counts and percentages update immediately
5. User's choice highlighted/disabled
6. Optional: Show who voted (if not anonymous)

### **Poll Results**
1. Vote percentages shown as progress bars
2. Real-time updates as new votes come in
3. Total vote count displayed
4. Expiration countdown if applicable
5. Creator can see detailed analytics

## Security & Performance Considerations

### **Security**
- Validate poll ownership for edits/deletes
- Rate limiting on vote submissions
- Sanitize poll questions and options
- Prevent vote manipulation

### **Performance**
- Cache poll results for 30 seconds
- Batch vote updates with Socket.IO
- Lazy load poll data on viewport entry
- Optimize database queries with proper indexes

### **Data Integrity**
- Soft delete for polls to preserve vote history
- Foreign key constraints prevent orphaned votes
- Atomic vote transactions

## Questions & Decisions Needed

### **Technical Questions**
1. **Real-time Updates**: Should we use Socket.IO for live vote updates or simple polling?
2. **Mobile UX**: Any specific mobile optimizations needed for poll interaction?
3. **Poll Limits**: Maximum number of options per poll? Maximum polls per post?
4. **Data Retention**: How long should we keep poll data? Any archival strategy?

### **Product Questions**
1. **Anonymous Polls**: Should this be enabled by default or require community admin approval?
2. **Poll Moderation**: Should community moderators be able to edit/delete polls?
3. **Notification Integration**: Should poll votes trigger notifications?
4. **Export Features**: Do we need CSV/JSON export for poll results?

### **Integration Questions**
1. **Board-Level Settings**: Should boards be able to disable polls entirely?
2. **Gating Integration**: Should polls respect the same gating requirements as comments?
3. **Search Integration**: Should poll questions be searchable in global search?

## Success Metrics

- **Engagement**: Measure increase in post interaction rates
- **Usage**: Track polls created per day/week
- **Completion**: Monitor poll participation rates
- **Performance**: Ensure voting response time < 200ms
- **Stability**: Zero data loss or duplicate votes

## Alternatives Considered

1. **Third-party Embeds**: Integrate existing poll services (Strawpoll, Typeform)
   - **Pros**: No development overhead
   - **Cons**: External dependencies, inconsistent UX, data privacy concerns

2. **Simple Voting**: Basic upvote/downvote on posts
   - **Pros**: Very simple implementation
   - **Cons**: Limited functionality, doesn't provide poll experience

3. **External Poll Links**: Users post links to external polls
   - **Pros**: Zero development required
   - **Cons**: Poor UX, breaks conversation flow, inconsistent styling

## Next Steps

1. **Get Approval**: Review this document and approve implementation approach
2. **Database Design**: Finalize schema and create migration files
3. **Start Phase 1**: Begin with core infrastructure implementation
4. **Design Review**: Create mockups for poll creation modal and widget display
5. **Testing Strategy**: Plan for automated tests and user acceptance testing

---

**Estimated Timeline**: 3 weeks  
**Risk Level**: Medium (new feature, real-time components)  
**Dependencies**: None (builds on existing TipTap infrastructure)  

This feature will significantly enhance user engagement by allowing rich interactive content creation within our existing editor framework. 