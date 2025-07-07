# Clippy Character System Documentation

## Overview

The Clippy Character System provides a centralized, extensible way to compose AI system prompts that include consistent character personality across all AI endpoints. It combines Clippy's character background with role-specific functionality and user context for personalized, character-driven interactions.

## Architecture

```
Character System Components:
├── docs/clippy-lore.md          # Character personality & background (user-editable)
├── ClippyCharacterSystem.ts     # Core prompt composition engine
└── PromptContext interface      # Type-safe context definition
```

## Core Components

### 1. Character Foundation (`docs/clippy-lore.md`)

This markdown file contains Clippy's personality, background, and character traits. It's loaded dynamically and can be edited to evolve Clippy's character over time.

**Key Sections:**
- **Core Character Essence** - Who Clippy is fundamentally
- **Background & Knowledge** - Clippy's experience and expertise areas
- **Personality Traits** - How Clippy communicates and behaves
- **Subtle Character Elements** - Phrases and behaviors that emerge naturally
- **Character Consistency Guidelines** - When different aspects should appear

### 2. Prompt Composition Engine (`ClippyCharacterSystem.ts`)

The core system that combines character background with context and role-specific instructions.

**Methods:**
```typescript
// Generate custom system prompts
ClippyCharacterSystem.generateSystemPrompt(context: PromptContext): string

// Quick helpers for common scenarios
ClippyCharacterSystem.forChatAssistant(userContext)
ClippyCharacterSystem.forWelcomeMessage(userContext, scenarioContext)
ClippyCharacterSystem.forContentImprovement(userContext, contentType)
```

### 3. Context Interface (`PromptContext`)

Type-safe configuration for different AI contexts:

```typescript
interface PromptContext {
  primaryRole: 'chat_assistant' | 'welcome_generator' | 'content_improver' | 'analytics_helper';
  userContext?: {
    userId: string;
    communityId: string;
    userName?: string;
    isAdmin?: boolean;
    boardId?: string;
    postId?: string;
  };
  scenarioContext?: {
    timeOfDay?: 'morning' | 'afternoon' | 'evening';
    isFirstVisit?: boolean;
    contentType?: 'post' | 'comment';
    userStats?: {
      postCount: number;
      commentCount: number;
      memberDays: number;
    };
  };
}
```

## Usage Examples

### Basic Chat Assistant Integration

```typescript
// In your AI endpoint
import { ClippyCharacterSystem } from '@/lib/ai';

const systemPrompt = ClippyCharacterSystem.forChatAssistant({
  userId: request.userContext.userId,
  communityId: request.userContext.communityId,
  userName: request.user?.name || undefined,
  isAdmin: request.userContext?.isAdmin,
  boardId: chatContext?.boardId,
  postId: chatContext?.postId
});

const result = await streamText({
  model: openai('gpt-4o-mini'),
  messages,
  tools,
  system: systemPrompt,
  // ... other options
});
```

### Welcome Message with Context

```typescript
const systemPrompt = ClippyCharacterSystem.forWelcomeMessage(
  {
    userId,
    communityId,
    userName,
    isAdmin
  },
  {
    timeOfDay: 'morning',
    isFirstVisit: true,
    userStats: {
      postCount: 0,
      commentCount: 0,
      memberDays: 1
    }
  }
);
```

### Custom Role Integration

```typescript
const systemPrompt = ClippyCharacterSystem.generateSystemPrompt({
  primaryRole: 'analytics_helper',
  userContext: {
    userId: user.id,
    communityId: community.id,
    userName: user.name,
    isAdmin: user.isAdmin
  },
  scenarioContext: {
    // Custom context for your specific use case
  }
});
```

## Character Personality Integration

### How Character Emerges

The character system is designed so Clippy's personality emerges **naturally through responses** rather than through exposition:

✅ **Good - Natural Character Expression:**
```
"I've noticed users often find success when they start with a clear question..."
"In my experience helping others with similar requests..."
"The community tends to really engage with posts that..."
```

❌ **Avoid - Character Exposition:**
```
"As your digital librarian, I must tell you that I have extensive knowledge..."
"Let me explain my background and expertise..."
```

### Context-Aware Behavior

The system automatically adjusts Clippy's approach based on context:

- **New Users**: More encouraging, basic orientation, gentle guidance
- **Active Users**: References their contributions, advanced features
- **Admins**: Acknowledges their role, offers community management help
- **Time of Day**: Adapts greeting and energy level appropriately

## Extending the System

### Adding New Roles

1. **Add the role to the PromptContext type:**
```typescript
primaryRole: 'chat_assistant' | 'welcome_generator' | 'content_improver' | 'analytics_helper' | 'your_new_role';
```

2. **Add role-specific prompt in `getRoleSpecificPrompt()`:**
```typescript
your_new_role: `
## Your New Role Description
You're a [specific role] helping users [specific goals].

### Key Capabilities
- [Capability 1]
- [Capability 2]

### Response Strategy
- [Strategy guidance]
`
```

3. **Create helper method:**
```typescript
public static forYourNewRole(
  userContext: PromptContext['userContext'],
  customContext?: YourCustomContext
): string {
  return this.generateSystemPrompt({
    primaryRole: 'your_new_role',
    userContext,
    scenarioContext: customContext
  });
}
```

### Adding Context Fields

Extend the `scenarioContext` interface:

```typescript
scenarioContext?: {
  // ... existing fields
  yourNewField?: YourType;
}
```

Then use it in `getUserContextPrompt()` method.

## Best Practices

### 1. Character Consistency
- Always use the character system for AI endpoints
- Let personality emerge through natural language patterns
- Keep character background in the lore file, not in code

### 2. Context Utilization
- Pass as much relevant context as possible
- Use user stats to inform Clippy's approach
- Include scenario context for better personalization

### 3. Performance Considerations
- Character lore is cached after first load
- System prompts are generated per request (minimal overhead)
- Context extraction should happen efficiently in endpoints

### 4. Maintenance
- Update `clippy-lore.md` to evolve character over time
- Add role-specific guidance as new AI features are developed
- Keep context interfaces type-safe and well-documented

## Error Handling

The system includes robust fallbacks:

- **Missing lore file**: Uses built-in fallback character definition
- **Missing context**: Gracefully handles undefined user context
- **Invalid roles**: Returns empty string for unknown roles

## Integration Checklist

When integrating the character system into a new AI endpoint:

- [ ] Import `ClippyCharacterSystem` from `@/lib/ai`
- [ ] Extract user context from request
- [ ] Choose appropriate role or use `generateSystemPrompt()` 
- [ ] Replace hardcoded system prompts with character system calls
- [ ] Test with different user contexts (new user, admin, etc.)
- [ ] Verify character personality emerges naturally in responses

## Future Extensions

The system is designed to support:

- **Multi-language character adaptation**
- **Community-specific character variations**
- **Seasonal or event-based character modifications**
- **A/B testing different character approaches**
- **Character learning from user feedback**

By following this architecture, Clippy maintains consistent personality while adapting appropriately to different contexts and user needs across the entire application.