import { openai } from '@ai-sdk/openai';
import { streamText } from 'ai';
import { z } from 'zod';
import { NextRequest, NextResponse } from 'next/server';
import { withEnhancedAuth, EnhancedAuthRequest } from '@/lib/middleware/authEnhanced';
import { query } from '@/lib/db';
import { 
  CreateConversationRequest, 
  SendMessageRequest, 
  AIConversation, 
  AIMessage,
  QuizProgress,
  QuizCompletion 
} from '@/types/ai-chat';

// Onboarding quiz logic
const ONBOARDING_STEPS = [
  {
    id: 'welcome',
    title: 'Welcome to Common Ground',
    description: 'Understanding the platform basics',
    questions: [
      'What brings you to Common Ground today?',
      'What are you hoping to achieve in this community?',
    ],
  },
  {
    id: 'community_exploration',
    title: 'Community Exploration',
    description: 'Learning about community features',
    questions: [
      'Have you explored any boards or posts yet?',
      'What topics are you most interested in discussing?',
    ],
  },
  {
    id: 'engagement_preferences',
    title: 'Engagement Preferences',
    description: 'Setting up your interaction style',
    questions: [
      'Do you prefer to post content, comment on others\' posts, or both?',
      'How often would you like to receive notifications?',
    ],
  },
  {
    id: 'goals_and_interests',
    title: 'Goals and Interests',
    description: 'Personalizing your experience',
    questions: [
      'What are your main goals for participating in this community?',
      'Are there specific people or topics you\'d like to follow?',
    ],
  },
  {
    id: 'completion',
    title: 'Onboarding Complete',
    description: 'Ready to participate fully',
    questions: [],
  },
];

// Quiz completion detection
function detectQuizCompletion(messages: AIMessage[], metadata: any): QuizCompletion {
  const userMessages = messages.filter(msg => msg.role === 'user');
  const progress = metadata.quiz_progress as QuizProgress;
  
  if (!progress) {
    return {
      completed: false,
      recommendations: ['Continue with the onboarding questions'],
      next_steps: ['Answer the welcome questions to proceed'],
    };
  }

  const isCompleted = progress.current_step >= ONBOARDING_STEPS.length - 1;
  const answeredQuestions = userMessages.length;
  
  if (isCompleted) {
    return {
      completed: true,
      score: Math.min(100, (answeredQuestions / 8) * 100), // 8 total questions across steps
      recommendations: [
        'Explore the community boards to find interesting discussions',
        'Create your first post to introduce yourself',
        'Follow topics and users that interest you',
        'Set up your notification preferences',
      ],
      next_steps: [
        'Visit the main community page',
        'Browse different boards to see what\'s being discussed',
        'Consider making your first post or comment',
        'Update your profile with your interests',
      ],
    };
  }

  return {
    completed: false,
    recommendations: [`Continue with the ${ONBOARDING_STEPS[progress.current_step]?.title || 'next step'}`],
    next_steps: [
      `Answer the remaining questions in the ${ONBOARDING_STEPS[progress.current_step]?.title || 'current section'}`,
    ],
  };
}

// Update quiz progress based on conversation
function updateQuizProgress(messages: AIMessage[], currentProgress?: QuizProgress): QuizProgress {
  const userMessages = messages.filter(msg => msg.role === 'user');
  const answeredQuestions = userMessages.length;
  
  // Determine current step based on answered questions
  let currentStep = 0;
  let totalAnswered = 0;
  
  for (let i = 0; i < ONBOARDING_STEPS.length - 1; i++) {
    const step = ONBOARDING_STEPS[i];
    if (totalAnswered + step.questions.length <= answeredQuestions) {
      totalAnswered += step.questions.length;
      currentStep = i + 1;
    } else {
      break;
    }
  }

  const completedSteps = ONBOARDING_STEPS.slice(0, currentStep).map(step => step.id);
  
  return {
    current_step: currentStep,
    total_steps: ONBOARDING_STEPS.length,
    completed_steps: completedSteps,
    quiz_data: {
      answered_questions: answeredQuestions,
      last_update: new Date().toISOString(),
      user_responses: userMessages.map(msg => ({
        content: msg.content,
        timestamp: msg.created_at,
      })),
    },
  };
}

// Generate next question based on progress
function getNextQuestion(progress: QuizProgress): string | null {
  if (progress.current_step >= ONBOARDING_STEPS.length - 1) {
    return null; // Quiz completed
  }

  const currentStepData = ONBOARDING_STEPS[progress.current_step];
  const questionsInCurrentStep = currentStepData.questions.length;
  const answeredInCurrentStep = progress.quiz_data.answered_questions - 
    ONBOARDING_STEPS.slice(0, progress.current_step)
      .reduce((sum, step) => sum + step.questions.length, 0);

  if (answeredInCurrentStep < questionsInCurrentStep) {
    return currentStepData.questions[answeredInCurrentStep];
  }

  // Move to next step
  const nextStep = ONBOARDING_STEPS[progress.current_step + 1];
  return nextStep?.questions[0] || null;
}

// Main handler
async function handler(req: EnhancedAuthRequest) {
  try {
    const { message, conversation_id } = await req.json() as SendMessageRequest;

    if (!message) {
      return NextResponse.json(
        { success: false, error: 'Message is required' },
        { status: 400 }
      );
    }

    // Get or create conversation
    let conversation: AIConversation;
    let messages: AIMessage[] = [];

    if (conversation_id) {
      // Fetch existing conversation
      const convResult = await query(
        'SELECT * FROM ai_conversations WHERE id = $1 AND user_id = $2',
        [conversation_id, req.userContext.userId]
      );
      
      if (convResult.rows.length === 0) {
        return NextResponse.json(
          { success: false, error: 'Conversation not found' },
          { status: 404 }
        );
      }
      
      conversation = convResult.rows[0];
      
      // Fetch existing messages
      const messagesResult = await query(
        'SELECT * FROM ai_messages WHERE conversation_id = $1 ORDER BY message_index ASC',
        [conversation_id]
      );
      
      messages = messagesResult.rows;
    } else {
      // Create new conversation with initial quiz progress
      const initialProgress: QuizProgress = {
        current_step: 0,
        total_steps: ONBOARDING_STEPS.length,
        completed_steps: [],
        quiz_data: {
          answered_questions: 0,
          last_update: new Date().toISOString(),
          user_responses: [],
        },
      };

      const newConvResult = await query(`
        INSERT INTO ai_conversations (user_id, community_id, conversation_type, title, status, metadata)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING *
      `, [
        req.userContext.userId,
        req.userContext.communityId,
        'onboarding_quiz',
        'Community Onboarding',
        'active',
        JSON.stringify({ quiz_progress: initialProgress })
      ]);
      
      conversation = newConvResult.rows[0];
    }

    // Add user message to conversation
    const userMessageResult = await query(`
      INSERT INTO ai_messages (conversation_id, role, content, metadata, message_index)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `, [
      conversation.id,
      'user',
      message,
      '{}',
      messages.length
    ]);

    const userMessage = userMessageResult.rows[0];
    messages.push(userMessage);

    // Update quiz progress
    const currentProgress = conversation.metadata?.quiz_progress;
    const updatedProgress = updateQuizProgress(messages, currentProgress);
    const completion = detectQuizCompletion(messages, { quiz_progress: updatedProgress });

    // Update conversation metadata
    await query(`
      UPDATE ai_conversations 
      SET metadata = $1, status = $2, updated_at = CURRENT_TIMESTAMP
      WHERE id = $3
    `, [
      JSON.stringify({ 
        quiz_progress: updatedProgress,
        completion: completion 
      }),
      completion.completed ? 'completed' : 'active',
      conversation.id
    ]);

    // Prepare messages for OpenAI API
    const openaiMessages = messages.map(msg => ({
      role: msg.role as 'user' | 'assistant' | 'system',
      content: msg.content,
    }));

    // Generate contextual system message
    const nextQuestion = getNextQuestion(updatedProgress);
    const currentStepInfo = ONBOARDING_STEPS[updatedProgress.current_step];
    
    const systemMessage = {
      role: 'system' as const,
      content: `You are a friendly onboarding assistant for Common Ground, helping new users get familiar with the platform.

Current onboarding progress:
- Step: ${updatedProgress.current_step + 1}/${updatedProgress.total_steps}
- Current section: ${currentStepInfo?.title || 'Welcome'}
- Questions answered: ${updatedProgress.quiz_data.answered_questions}

${completion.completed 
  ? `🎉 Onboarding completed! Provide a warm congratulations and summary of next steps.`
  : `Next question to ask: "${nextQuestion || 'Continue the conversation naturally'}"`
}

Guidelines:
- Be warm, welcoming, and encouraging
- Keep responses conversational and friendly
- Help users understand Common Ground's features naturally
- If they ask about something specific, provide helpful guidance
- ${!completion.completed ? `Gently guide toward the next onboarding question when appropriate` : `Focus on helping them take their next steps in the community`}
- Make users feel excited about participating in the community

Community context:
- User: ${req.userContext.userId}
- Community: ${req.userContext.communityId}`,
    };

    // Call OpenAI API with streaming
    const result = await streamText({
      model: openai('gpt-4o'),
      messages: [systemMessage, ...openaiMessages],
      maxTokens: 1000,
      temperature: 0.7, // More creative for friendly conversation
    });

    return result.toDataStreamResponse();

  } catch (error) {
    console.error('[Onboarding Quiz] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Apply authentication middleware (regular users)
export const POST = withEnhancedAuth(handler, { 
  requireCommunity: true 
});