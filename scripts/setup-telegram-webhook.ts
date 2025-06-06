#!/usr/bin/env tsx

/**
 * Script to set up Telegram webhook
 * 
 * Usage:
 *   yarn tsx scripts/setup-telegram-webhook.ts
 * 
 * This script:
 * 1. Configures the webhook URL for the Telegram bot
 * 2. Sets up security with webhook secret
 * 3. Configures which update types to receive
 */

import dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config({ path: '.env' });
// Also try .env.local as fallback
dotenv.config({ path: '.env.local' });

const BOT_TOKEN = process.env.TELEGRAM_BOT_API_TOKEN || process.env.TELEGRAM_BOT_TOKEN;
const WEBHOOK_SECRET = process.env.TELEGRAM_WEBHOOK_SECRET;
const APP_URL = process.env.NEXT_PUBLIC_PLUGIN_BASE_URL;

if (!BOT_TOKEN) {
  console.error('❌ Missing TELEGRAM_BOT_API_TOKEN or TELEGRAM_BOT_TOKEN in environment');
  process.exit(1);
}

if (!APP_URL) {
  console.error('❌ Missing NEXT_PUBLIC_PLUGIN_BASE_URL in environment');
  console.log('💡 This should be your server base URL (where API routes are accessible)');
  process.exit(1);
}

async function setupWebhook() {
  const webhookUrl = `${APP_URL}/api/telegram/webhook`;
  
  console.log('🤖 Setting up Telegram webhook...');
  console.log(`📍 Webhook URL: ${webhookUrl}`);
  
  try {
    // First, get bot info
    const botInfoResponse = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/getMe`);
    const botInfo = await botInfoResponse.json();
    
    if (!botInfo.ok) {
      throw new Error(`Failed to get bot info: ${botInfo.description}`);
    }
    
    console.log(`✅ Bot info: @${botInfo.result.username} (${botInfo.result.first_name})`);
    
    // Set up webhook
    const webhookParams = {
      url: webhookUrl,
      allowed_updates: [
        'my_chat_member',  // Bot added/removed from groups
        'message',         // For future commands
      ],
      drop_pending_updates: true,  // Clear any pending updates
      ...(WEBHOOK_SECRET && { secret_token: WEBHOOK_SECRET }),
    };
    
    const webhookResponse = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/setWebhook`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(webhookParams),
    });
    
    const webhookResult = await webhookResponse.json();
    
    if (!webhookResult.ok) {
      throw new Error(`Failed to set webhook: ${webhookResult.description}`);
    }
    
    console.log('✅ Webhook configured successfully!');
    
    // Verify webhook info
    const webhookInfoResponse = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/getWebhookInfo`);
    const webhookInfo = await webhookInfoResponse.json();
    
    if (webhookInfo.ok) {
      console.log('📋 Webhook info:');
      console.log(`   URL: ${webhookInfo.result.url}`);
      console.log(`   Pending updates: ${webhookInfo.result.pending_update_count}`);
      console.log(`   Allowed updates: ${webhookInfo.result.allowed_updates?.join(', ') || 'all'}`);
      console.log(`   Has secret: ${webhookInfo.result.has_custom_certificate ? 'yes' : 'no'}`);
    }
    
    console.log('\n🎉 Setup complete! Your bot is ready to receive webhook updates.');
    console.log('\n📝 Next steps:');
    console.log('   1. Add the bot to a Telegram group');
    console.log('   2. Check your server logs for webhook events');
    console.log('   3. The group will be stored as "pending" until properly registered');
    
  } catch (error) {
    console.error('❌ Setup failed:', error);
    process.exit(1);
  }
}

async function deleteWebhook() {
  console.log('🗑️  Deleting webhook...');
  
  try {
    const response = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/deleteWebhook`, {
      method: 'POST',
    });
    
    const result = await response.json();
    
    if (!result.ok) {
      throw new Error(`Failed to delete webhook: ${result.description}`);
    }
    
    console.log('✅ Webhook deleted successfully!');
  } catch (error) {
    console.error('❌ Failed to delete webhook:', error);
  }
}

// Command line interface
const command = process.argv[2];

if (command === 'delete') {
  deleteWebhook();
} else {
  setupWebhook();
} 