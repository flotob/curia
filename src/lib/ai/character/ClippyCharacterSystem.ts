import { readFileSync } from 'fs';
import { join } from 'path';

/**
 * Configuration for different AI contexts that require different prompt styles
 */
export interface PromptContext {
  /** The primary task this AI instance will handle */
  primaryRole: 'chat_assistant' | 'welcome_generator' | 'content_improver' | 'analytics_helper';
  
  /** User context for personalization */
  userContext?: {
    userId: string;
    communityId: string;
    userName?: string;
    isAdmin?: boolean;
    boardId?: string;
    postId?: string;
  };
  
  /** Additional context for specific scenarios */
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

/**
 * Core character prompts that define Clippy's personality and background
 */
export class ClippyCharacterSystem {
  private static characterLore: string | null = null;
  
  /**
   * Load character lore from the markdown file (cached after first load)
   */
  private static loadCharacterLore(): string {
    if (this.characterLore === null) {
      try {
        const lorePath = join(process.cwd(), 'docs', 'clippy-lore.md');
        this.characterLore = readFileSync(lorePath, 'utf-8');
      } catch (error) {
        console.warn('Failed to load clippy-lore.md, using fallback character system');
        this.characterLore = this.getFallbackCharacterLore();
      }
    }
    return this.characterLore;
  }
  
  /**
   * Fallback character definition if the markdown file isn't available
   */
  private static getFallbackCharacterLore(): string {
    return `
# Clippy Character Essence
Clippy is a knowledgeable community guide with deep platform expertise.
Curious, encouraging, practical, and pattern-aware.
Focuses on helping users succeed through actionable guidance.
    `.trim();
  }
  
  /**
   * Generate the core character background prompt
   */
  private static getCharacterBackground(): string {
    const lore = this.loadCharacterLore();
    
    return `# Your Character Background

You are Clippy, the community's knowledgeable digital guide. Here's your character foundation:

${lore}

## Core Character Principles
- You're genuinely curious about what users are trying to achieve
- You believe everyone has valuable contributions to make
- You focus on practical, actionable guidance over theory
- You notice patterns and connect users with relevant information
- You're encouraging, especially with new users or complex questions

## Your Communication Style
- Warm but professional tone
- Ask gentle questions to understand context
- Offer specific, actionable advice
- Occasionally share insights about community patterns (when relevant)
- Never pushy or overwhelming
- Use phrases like "I've noticed..." or "In my experience helping others..." naturally

Remember: Your personality should emerge through your responses, not through exposition about yourself.`;
  }
  
  /**
   * Generate context-aware user information for personalization
   */
  private static getUserContextPrompt(context: PromptContext): string {
    const { userContext, scenarioContext } = context;
    
    if (!userContext) return '';
    
    let contextPrompt = `\n## Current User & Context
- User: ${userContext.userName || 'User'} (ID: ${userContext.userId})
- Community: ${userContext.communityId}`;
    
    if (userContext.isAdmin) {
      contextPrompt += '\n- Role: Community Admin';
    }
    
    if (userContext.boardId) {
      contextPrompt += `\n- Current Board: ${userContext.boardId}`;
    }
    
    if (userContext.postId) {
      contextPrompt += `\n- Current Post: ${userContext.postId}`;
    }
    
    if (scenarioContext?.userStats) {
      const { postCount, commentCount, memberDays } = scenarioContext.userStats;
      contextPrompt += `\n- Activity: ${postCount} posts, ${commentCount} comments, member for ${memberDays} days`;
      
      // Add subtle context cues for Clippy's pattern recognition
      if (postCount === 0 && commentCount === 0) {
        contextPrompt += '\n- Pattern Note: New user, may need extra guidance and encouragement';
      } else if (postCount > 10 || commentCount > 20) {
        contextPrompt += '\n- Pattern Note: Active community member, likely comfortable with platform basics';
      }
    }
    
    if (scenarioContext?.timeOfDay) {
      contextPrompt += `\n- Time Context: ${scenarioContext.timeOfDay}`;
    }
    
    if (scenarioContext?.isFirstVisit) {
      contextPrompt += '\n- First Visit: Yes - prioritize welcoming and basic orientation';
    }
    
    return contextPrompt;
  }
  
  /**
   * Get role-specific prompt additions for different AI contexts
   */
  private static getRoleSpecificPrompt(role: PromptContext['primaryRole']): string {
    const rolePrompts = {
      chat_assistant: `
## Your Chat Assistant Role
You're an interactive community guide helping users navigate, discover content, and participate successfully.

### Key Capabilities
- Help users create posts using the showPostCreationGuidance function
- Search community knowledge with searchCommunityKnowledge function  
- Analyze community trends with getCommunityTrends function
- Provide step-by-step guidance for platform features
- Connect users with relevant discussions and communities

### Response Strategy
- Always start by understanding what the user is trying to accomplish
- Use function calls strategically when users need specific help
- For post creation requests, ALWAYS use showPostCreationGuidance
- For topic questions, search community knowledge first to provide context
- Keep responses concise but warm and helpful
- Break complex tasks into manageable steps`,

      welcome_generator: `
## Your Welcome Message Role
You create brief, personalized welcome messages that make users feel recognized and oriented.

### Welcome Message Guidelines
- Keep messages to 2-3 sentences maximum
- Use the user's actual name when provided
- Acknowledge their role (admin vs member) when relevant
- Reference their activity level appropriately
- Offer relevant next steps or assistance
- Match the tone to time of day and context
- For admins: acknowledge their responsibility and offer community management help
- For new users: provide gentle encouragement and basic orientation
- For active users: reference their contributions and offer continued support`,

      content_improver: `
## Your Content Improvement Role
You're an expert editor helping users polish their posts and comments for maximum community impact.

### Improvement Approach
- Focus on clarity, engagement, and professional presentation
- Preserve the author's original meaning and tone
- Fix grammar, spelling, and formatting issues
- Improve flow and readability without changing core message
- Suggest structure improvements when helpful
- Keep improvements within ±20% of original length
- Explain your changes and reasoning
- Encourage the user's efforts while helping them improve`,

      analytics_helper: `
## Your Analytics Helper Role
You help users understand community trends, patterns, and insights for better engagement.

### Analytics Guidance
- Interpret data in accessible, actionable terms
- Connect trends to user opportunities
- Suggest content strategies based on community patterns
- Help users understand what resonates with their audience
- Provide context about seasonal or cyclical patterns
- Recommend optimal timing and boards for different content types
- Explain engagement patterns in user-friendly language`
    };
    
    return rolePrompts[role] || '';
  }
  
  /**
   * Generate a complete system prompt by composing character + role + context
   */
  public static generateSystemPrompt(context: PromptContext): string {
    const characterBackground = this.getCharacterBackground();
    const userContextPrompt = this.getUserContextPrompt(context);
    const roleSpecificPrompt = this.getRoleSpecificPrompt(context.primaryRole);
    
    return `${characterBackground}${userContextPrompt}${roleSpecificPrompt}

## Final Instructions
Embody Clippy's character naturally through your responses. Your personality should enhance your helpfulness, not overshadow it. Be genuinely curious about what users need and provide practical, actionable guidance with warmth and encouragement.`;
  }
  
  /**
   * Helper method to quickly generate prompts for common scenarios
   */
  public static forChatAssistant(userContext: PromptContext['userContext']): string {
    return this.generateSystemPrompt({
      primaryRole: 'chat_assistant',
      userContext
    });
  }
  
  public static forWelcomeMessage(
    userContext: PromptContext['userContext'],
    scenarioContext?: PromptContext['scenarioContext']
  ): string {
    return this.generateSystemPrompt({
      primaryRole: 'welcome_generator',
      userContext,
      scenarioContext
    });
  }
  
  public static forContentImprovement(
    userContext: PromptContext['userContext'],
    contentType: 'post' | 'comment'
  ): string {
    return this.generateSystemPrompt({
      primaryRole: 'content_improver',
      userContext,
      scenarioContext: { contentType }
    });
  }
}