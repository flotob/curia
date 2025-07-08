#!/usr/bin/env node

import 'dotenv/config';
import { createServer } from 'http';
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
  
  // Create health check server
  // Use Railway's PORT if available, fallback to HEALTH_CHECK_PORT
const healthPort = parseInt(process.env.PORT || process.env.HEALTH_CHECK_PORT || '3001');
  const healthServer = createServer((req, res) => {
    // Enable CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET');
    res.setHeader('Content-Type', 'application/json');
    
    try {
      if (req.url === '/health') {
        // Liveness probe
        const health = worker.getHealth();
        const response = {
          status: health.status,
          uptime: Math.floor(health.uptime / 1000), // Convert to seconds
          version: '1.0.0',
          service: 'curia-embedding-worker',
          timestamp: new Date().toISOString(),
        };
        
        res.statusCode = health.status === 'healthy' ? 200 : 503;
        res.end(JSON.stringify(response, null, 2));
        
      } else if (req.url === '/ready') {
        // Readiness probe
        const health = worker.getHealth();
        const response = {
          ready: health.status === 'healthy',
          database: 'connected', // TODO: Add actual DB health check
          lastProcessed: health.lastProcessed?.toISOString() || null,
          timestamp: new Date().toISOString(),
        };
        
        res.statusCode = response.ready ? 200 : 503;
        res.end(JSON.stringify(response, null, 2));
        
      } else if (req.url === '/metrics') {
        // Metrics endpoint for monitoring
        const metrics = worker.getMetrics();
        const response = {
          worker: metrics,
          timestamp: new Date().toISOString(),
        };
        
        res.statusCode = 200;
        res.end(JSON.stringify(response, null, 2));
        
      } else {
        // 404 for other paths
        res.statusCode = 404;
        res.end(JSON.stringify({ error: 'Not found' }));
      }
    } catch (error) {
      console.error('[Health Server] Error handling request:', error);
      res.statusCode = 500;
      res.end(JSON.stringify({ error: 'Internal server error' }));
    }
  });
  
  // Graceful shutdown handling
  const shutdown = async (signal: string) => {
    console.log(`[Embedding Worker] Received ${signal}, shutting down gracefully...`);
    
    // Stop health server
    healthServer.close(() => {
      console.log('[Health Server] HTTP server closed');
    });
    
    // Stop worker
    await worker.stop();
    console.log('[Embedding Worker] Shutdown complete');
    process.exit(0);
  };
  
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
  
  // Start the worker
  try {
    await worker.start();
    
    // Start health check server
    healthServer.listen(healthPort, () => {
      console.log(`[Health Server] Health checks available on port ${healthPort}`);
      console.log(`[Health Server] - Liveness:  http://localhost:${healthPort}/health`);
      console.log(`[Health Server] - Readiness: http://localhost:${healthPort}/ready`);
      console.log(`[Health Server] - Metrics:   http://localhost:${healthPort}/metrics`);
    });
    
    console.log('[Embedding Worker] Service started successfully');
    
    // Keep process alive with error handling
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