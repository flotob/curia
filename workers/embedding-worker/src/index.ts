#!/usr/bin/env node

import 'dotenv/config';
import { EmbeddingWorker } from './EmbeddingWorker';

async function main() {
  console.log('[Embedding Worker] Starting service...');
  
  // Validate environment
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL environment variable is required');
  }
  
  if (!process.env.OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY environment variable is required');
  }
  
  // Create and start worker
  const worker = new EmbeddingWorker({
    databaseUrl: process.env.DATABASE_URL,
    openaiApiKey: process.env.OPENAI_API_KEY,
    batchSize: parseInt(process.env.EMBEDDING_BATCH_SIZE || '10'),
    rateLimitPerMinute: parseInt(process.env.EMBEDDING_RATE_LIMIT || '100'),
  });
  
  // Graceful shutdown handling
  const shutdown = async (signal: string) => {
    console.log(`[Embedding Worker] Received ${signal}, shutting down gracefully...`);
    await worker.stop();
    process.exit(0);
  };
  
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
  
  // Start the worker
  try {
    await worker.start();
    console.log('[Embedding Worker] Service started successfully');
    
    // Keep process alive
    process.on('uncaughtException', (error) => {
      console.error('[Embedding Worker] Uncaught exception:', error);
      shutdown('uncaughtException');
    });
    
    process.on('unhandledRejection', (reason) => {
      console.error('[Embedding Worker] Unhandled rejection:', reason);
      shutdown('unhandledRejection');
    });
    
  } catch (error) {
    console.error('[Embedding Worker] Failed to start:', error);
    process.exit(1);
  }
}

// Start the service
main().catch((error) => {
  console.error('[Embedding Worker] Startup error:', error);
  process.exit(1);
}); 