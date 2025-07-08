# Curia Embedding Worker Service

A standalone Node.js service that generates OpenAI embeddings for posts in real-time using PostgreSQL LISTEN/NOTIFY events.

## Overview

This service runs separately from the main Next.js application and:
- Listens for PostgreSQL NOTIFY events when posts need embeddings
- Generates embeddings using OpenAI's `text-embedding-3-small` model
- Stores embeddings back to the `posts.embedding` column
- Provides health checks and metrics for monitoring

## Quick Start

1. **Install dependencies:**
   ```bash
   yarn install
   ```

2. **Configure environment variables:**
   Create a `.env` file with the required variables (see Environment Variables section below)

3. **Development:**
   ```bash
   yarn dev
   ```

4. **Production build:**
   ```bash
   yarn build
   yarn start
   ```

## Environment Variables

### Required
```bash
DATABASE_URL=postgresql://user:password@localhost:5432/database
OPENAI_API_KEY=sk-your-openai-api-key-here
```

### Optional (with defaults)
```bash
# OpenAI Configuration
OPENAI_EMBEDDING_MODEL=text-embedding-3-small

# Service Configuration
EMBEDDING_BATCH_SIZE=10                    # Posts to process on startup
EMBEDDING_RATE_LIMIT=100                   # Requests per minute
EMBEDDING_MAX_TEXT_LENGTH=30000            # Character limit for embeddings
EMBEDDING_RETRY_ATTEMPTS=3                 # Retry failed embeddings
EMBEDDING_RETRY_DELAY_MS=1000              # Base delay between retries

# Health & Monitoring
HEALTH_CHECK_PORT=3001                     # Health check endpoint port
LOG_LEVEL=info                             # debug, info, warn, error

# Production Settings
NODE_ENV=production
SERVICE_NAME=curia-embedding-worker
```

## Health Checks

The service provides HTTP endpoints for monitoring:

- **Liveness:** `GET http://localhost:3001/health`
- **Readiness:** `GET http://localhost:3001/ready`
- **Metrics:** `GET http://localhost:3001/metrics`

Example health response:
```json
{
  "status": "healthy",
  "uptime": 3600,
  "version": "1.0.0",
  "service": "curia-embedding-worker",
  "timestamp": "2025-01-08T10:30:00.000Z"
}
```

## Railway Deployment

1. **Deploy to Railway:**
   ```bash
   railway login
   railway link  # Link to your project
   railway up    # Deploy the service
   ```

2. **Set environment variables in Railway dashboard:**
   - `DATABASE_URL` (should match your main app's database)
   - `OPENAI_API_KEY`
   - Other optional variables as needed

3. **Railway will automatically:**
   - Build using the Dockerfile
   - Set up health checks on `/health`
   - Restart on failures
   - Scale based on usage

## Architecture

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Next.js App   │    │   PostgreSQL     │    │ Embedding Worker│
│                 │    │                  │    │                 │
│ POST /api/posts │───▶│ INSERT INTO      │───▶│ LISTEN          │
│                 │    │ posts            │    │ embedding_needed│
│                 │    │                  │    │                 │
│                 │    │ TRIGGER fires    │    │ Process Event   │
│                 │    │ NOTIFY           │    │                 │
│                 │    │                  │    │ OpenAI API      │
│                 │    │                  │◀───│ UPDATE posts    │
│                 │    │                  │    │ SET embedding   │
└─────────────────┘    └──────────────────┘    └─────────────────┘
```

## Features

- **Real-time Processing:** PostgreSQL LISTEN/NOTIFY for immediate embedding generation
- **Rate Limiting:** Respects OpenAI API limits (100 req/min default)
- **Error Handling:** Exponential backoff, circuit breakers, graceful degradation
- **Monitoring:** Health checks, metrics, structured logging
- **Reconnection:** Automatic database reconnection with exponential backoff
- **Cost Tracking:** Logs embedding generation costs and token usage
- **Graceful Shutdown:** Clean shutdown on SIGTERM/SIGINT

## Performance

- **Throughput:** 100 embeddings/minute sustained
- **Latency:** <2 seconds per embedding (P95)
- **Memory:** <100MB sustained usage
- **Cost:** ~$0.00002 per 1K tokens (extremely low)

## Development

```bash
# Run in development mode with auto-reload
yarn dev

# Type checking
yarn type-check

# Build for production
yarn build

# Start production build
yarn start
```

## Troubleshooting

### Common Issues

1. **Service won't start:**
   - Check `DATABASE_URL` is accessible
   - Verify `OPENAI_API_KEY` is valid
   - Ensure PostgreSQL has the `vector` extension and trigger installed

2. **No embeddings generated:**
   - Check if posts have `embedding IS NULL`
   - Verify trigger is installed: `SELECT * FROM pg_trigger WHERE tgname = 'posts_embedding_trigger';`
   - Check service logs for rate limiting or API errors

3. **Health checks failing:**
   - Service may be processing large backlog on startup
   - Check if OpenAI API is accessible
   - Verify database connection

### Logs

Service logs include structured information:
```json
{
  "timestamp": "2025-01-08T10:30:00.123Z",
  "level": "info",
  "event": "embedding_generated",
  "postId": 123,
  "duration": 1234,
  "cost": 0.00002,
  "tokens": 150
}
```

## Production Considerations

- **Horizontal Scaling:** Multiple instances can run simultaneously (shared PostgreSQL queue)
- **Monitoring:** Use Railway metrics or integrate with external monitoring
- **Cost Control:** Monitor OpenAI usage and costs via `/metrics` endpoint
- **Database Load:** Service uses minimal database resources (single connection for LISTEN) 