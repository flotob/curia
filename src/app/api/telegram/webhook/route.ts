import { NextRequest, NextResponse } from 'next/server';
import { telegramService } from '@/lib/telegram/TelegramService';
import { 
  getBotName, 
  findCommunityByConnectCode, 
  cleanConnectCodeInput, 
  isValidConnectCodeFormat 
} from '@/lib/telegram/connectCode';
import crypto from 'crypto';

// Telegram Update types we care about
interface TelegramUpdate {
  update_id: number;
  my_chat_member?: {
    chat: {
      id: number;
      title?: string;
      type: string;
    };
    from: {
      id: number;
      first_name: string;
      username?: string;
    };
    date: number;
    old_chat_member: {
      user: { id: number; is_bot: boolean };
      status: string;
    };
    new_chat_member: {
      user: { id: number; is_bot: boolean };
      status: string;
    };
  };
  message?: {
    chat: { id: number; title?: string; type: string };
    from: { id: number; first_name: string; username?: string };
    text?: string;
    date: number;
  };
}

// Verify webhook authenticity
function verifyTelegramWebhook(body: string, signature: string): boolean {
  const secret = process.env.TELEGRAM_WEBHOOK_SECRET;
  if (!secret) {
    console.warn('[Telegram] No webhook secret configured');
    return false;
  }

  const hash = crypto
    .createHmac('sha256', secret)
    .update(body)
    .digest('hex');
    
  return signature === hash;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.text();
    const signature = req.headers.get('x-telegram-bot-api-secret-token') || '';
    
    // Verify webhook authenticity (skip in development)
    if (process.env.NODE_ENV === 'production' && !verifyTelegramWebhook(body, signature)) {
      console.error('[Telegram] Invalid webhook signature');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const update: TelegramUpdate = JSON.parse(body);
    console.log(`[Telegram] Received update ${update.update_id}`, JSON.stringify(update, null, 2));

    // Handle bot being added/removed from groups
    if (update.my_chat_member) {
      await handleChatMemberUpdate(update.my_chat_member);
    }

    // Handle regular messages (for future commands)
    if (update.message) {
      await handleMessage(update.message);
    }

    return NextResponse.json({ ok: true });
    
  } catch (error) {
    console.error('[Telegram] Webhook error:', error);
    return NextResponse.json(
      { error: 'Internal server error' }, 
      { status: 500 }
    );
  }
}

async function handleChatMemberUpdate(chatMember: TelegramUpdate['my_chat_member']) {
  if (!chatMember) return;

  const { chat, new_chat_member, old_chat_member } = chatMember;
  const botToken = process.env.TELEGRAM_BOT_API_TOKEN || process.env.TELEGRAM_BOT_TOKEN;
  const botId = parseInt(botToken?.split(':')[0] || '0');

  // Only handle updates about our bot
  if (new_chat_member.user.id !== botId) return;

  const wasInChat = ['member', 'administrator'].includes(old_chat_member.status);
  const isInChat = ['member', 'administrator'].includes(new_chat_member.status);

  console.log(`[Telegram] Bot status changed in chat ${chat.id}:`, {
    chatTitle: chat.title,
    wasInChat,
    isInChat,
    oldStatus: old_chat_member.status,
    newStatus: new_chat_member.status,
  });

  if (!wasInChat && isInChat) {
    // Bot was added to chat
    await handleBotAdded(chat);
  } else if (wasInChat && !isInChat) {
    // Bot was removed from chat
    await handleBotRemoved(chat.id);
  }
}

async function handleBotAdded(chat: { id: number; title?: string; type: string }) {
  console.log(`[Telegram] Bot added to ${chat.type}: ${chat.title} (${chat.id})`);
  
  // Only track groups and supergroups, not private chats
  if (!['group', 'supergroup'].includes(chat.type)) {
    console.log(`[Telegram] Ignoring ${chat.type} chat`);
    return;
  }

  const botName = getBotName();

  // Send welcome message with registration instructions (no database storage yet)
  await telegramService.sendMessage(
    chat.id.toString(),
    `👋 <b>Hello! I'm ${botName}</b>

I'm here to send notifications about forum activity to this Telegram group.

🔧 <b>Setup Required:</b>
To start receiving notifications, please:

1. Go to the Curia App inside of your Community, navigate to the Settings (link in the sidebar only visible to Admins and Mods)
2. Find the Telegram section and copy your connect code
3. Come back here and run: <code>/register YOUR_CODE</code>

This will link this group to your Common Ground community and enable notifications for posts, upvotes, and comments.

Need help? Contact your community administrator.`
  );
}

async function handleBotRemoved(chatId: number) {
  console.log(`[Telegram] Bot removed from chat ${chatId}`);
  
  // Deactivate the group registration
  await telegramService.deactivateGroup(chatId.toString());
}

async function handleMessage(message: TelegramUpdate['message']) {
  if (!message) return;

  const text = message.text || '';
  const chatId = message.chat.id.toString();
  
  console.log(`[Telegram] Message in ${message.chat.id}: ${text}`);
  
  // Handle registration command
  if (text.startsWith('/register')) {
    await handleRegisterCommand(message);
    return;
  }
  
  // Handle help command
  if (text.startsWith('/help')) {
    const botName = getBotName();
    await telegramService.sendMessage(
      chatId,
      `🤖 <b>${botName} Help</b>

<b>Commands:</b>
• <code>/register CODE</code> - Register this group with your connect code
• <code>/help</code> - Show this help message

<b>How to Register:</b>
1. Go to the Curia App inside of your Community, navigate to the Settings (link in the sidebar only visible to Admins and Mods)
2. Find the Telegram section and copy your connect code
3. Run: <code>/register YOUR_CODE</code>

<b>What I do:</b>
I send notifications about forum activity from your Common Ground community:
• 🆕 New posts
• 👍 Upvotes
• 💬 Comments

<b>Need Support?</b>
Contact your community administrator for help with setup and configuration.`
    );
    return;
  }
}

async function handleRegisterCommand(message: TelegramUpdate['message']) {
  if (!message) return;
  
  const chatId = message.chat.id.toString();
  const chatTitle = message.chat.title || 'Unknown Group';
  const userId = message.from?.id.toString() || 'unknown';
  const text = message.text || '';
  
  // Parse connect code from command
  const parts = text.split(' ');
  if (parts.length < 2) {
    await telegramService.sendMessage(
      chatId,
      `❌ <b>Connect Code Required</b>

Please provide your connect code:
<code>/register YOUR_CODE</code>

To get your connect code:
1. Go to the Curia App inside of your Community, navigate to the Settings (link in the sidebar only visible to Admins and Mods)
2. Find the Telegram section
3. Copy the connect code and paste it here

Example: <code>/register ABC1-23DE-F456</code>`
    );
    return;
  }

  const rawCode = parts.slice(1).join(''); // Join in case they split it
  const cleanCode = cleanConnectCodeInput(rawCode);
  
  // Validate code format
  if (!isValidConnectCodeFormat(cleanCode)) {
    await telegramService.sendMessage(
      chatId,
      `❌ <b>Invalid Connect Code Format</b>

The connect code should be 12 characters (letters and numbers).
Example: <code>ABC123DEF456</code> or <code>ABC1-23DE-F456</code>

Please check your code and try again.`
    );
    return;
  }

  // Find which community this code belongs to
  const communityId = await findCommunityByConnectCode(cleanCode);
  
  if (!communityId) {
    await telegramService.sendMessage(
      chatId,
      `❌ <b>Invalid Connect Code</b>

This connect code is not valid or has expired.

Please:
1. Check you copied the code correctly
2. Get a fresh code from the Curia App Settings
3. Connect codes rotate daily for security

If you continue having issues, contact your community administrator.`
    );
    return;
  }

  // Register the group with the identified community
  const success = await telegramService.registerGroup(
    chatId,
    chatTitle,
    communityId,
    userId,
    { 
      enabled: true, 
      events: ['new_post', 'upvote', 'comment'],
    }
  );

  if (success) {
    await telegramService.sendMessage(
      chatId,
      `✅ <b>Registration Successful!</b>

🎉 This group is now registered to receive notifications from your community.

<b>You'll receive updates about:</b>
• 🆕 New posts
• 👍 Upvotes  
• 💬 Comments

<b>Next Steps:</b>
Start engaging in the forum and you'll see notifications appear here!

<i>💡 Use /help to see more commands</i>`
    );
    console.log(`[Telegram] Group ${chatId} registered for community ${communityId}`);
  } else {
    await telegramService.sendMessage(
      chatId,
      `❌ <b>Registration Failed</b>

Sorry, there was a technical error registering this group. Please try again in a moment.

If the problem persists, contact your community administrator.`
    );
  }
} 