# Embedding Worker Service Specification

**Version:** 1.0  
**Status:** Design Phase  
**Goal:** Production-ready background service for generating OpenAI embeddings via PostgreSQL LISTEN/NOTIFY

## Executive Summary

The Embedding Worker Service is a standalone Node.js service that runs separately from the main Next.js application, listening for PostgreSQL NOTIFY events to generate OpenAI embeddings for posts in real-time. This architecture provides reliability, scalability, and separation of concerns while maintaining the existing application's performance.

## Architecture Overview

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Next.js App   │    │   PostgreSQL     │    │ Embedding Worker│
│                 │    │                  │    │                 │
│ POST /api/posts │───▶│ INSERT INTO      │───▶│ LISTEN          │
│                 │    │ posts            │    │ embedding_needed│
│                 │    │                  │    │                 │
│ (optional sync  │    │ TRIGGER fires    │    │ Process Event   │
│  attempt)       │    │ NOTIFY           │    │                 │
│                 │    │                  │    │ OpenAI API      │
│                 │    │                  │◀───│ UPDATE posts    │
│                 │    │                  │    │ SET embedding   │
└─────────────────┘    └──────────────────┘    └─────────────────┘
```

## Service Responsibilities

### Primary Functions
1. **PostgreSQL Event Listening**: Connect to database and listen for `embedding_needed` notifications
2. **Embedding Generation**: Call OpenAI API to generate text embeddings
3. **Database Updates**: Store generated embeddings back to `posts.embedding` column
4. **Error Handling**: Robust retry logic and error recovery
5. **Rate Limiting**: Respect OpenAI API rate limits
6. **Monitoring**: Health checks and performance metrics

### Secondary Functions
1. **Backlog Processing**: Handle posts that need embeddings on startup
2. **Graceful Shutdown**: Clean connection closure on SIGTERM/SIGINT
3. **Reconnection Logic**: Automatic database reconnection on connection loss
4. **Cost Tracking**: Log embedding generation costs and usage

## Event Flow Design

### PostgreSQL Trigger Integration

**Event Payload Structure:**
```json
{
  "postId": 123,
  "operation": "INSERT" | "UPDATE", 
  "priority": "high" | "normal",
  "timestamp": 1702123456.789
}
```

**Trigger Logic:**
- **INSERT**: Fire if `embedding IS NULL`
- **UPDATE**: Fire if title/content changed OR embedding was removed
- **Priority**: "high" for missing embeddings, "normal" for updates

### Event Processing Pipeline

```
NOTIFY Event → Rate Limit Check → Fetch Post Data → Generate Embedding → Store Result → Log Success
     │              │                  │                │              │            │
     │              │                  │                │              │            └─ Metrics Update
     │              │                  │                │              └─ Database Write
     │              │                  │                └─ OpenAI API Call
     │              │                  └─ PostgreSQL Query
     │              └─ Queue Management (if limit exceeded)
     └─ Duplicate Detection
```

## Configuration & Environment

### Required Environment Variables
```bash
# Database Connection
DATABASE_URL=postgresql://user:password@host:port/database

# OpenAI Configuration  
OPENAI_API_KEY=sk-...
OPENAI_EMBEDDING_MODEL=text-embedding-3-small

# Service Configuration
EMBEDDING_BATCH_SIZE=10                    # Posts to process on startup
EMBEDDING_RATE_LIMIT=100                   # Requests per minute
EMBEDDING_MAX_TEXT_LENGTH=30000            # Character limit for embeddings
EMBEDDING_RETRY_ATTEMPTS=3                 # Retry failed embeddings
EMBEDDING_RETRY_DELAY_MS=1000              # Base delay between retries

# Health & Monitoring
HEALTH_CHECK_PORT=3001                     # Optional health check endpoint
LOG_LEVEL=info                             # debug, info, warn, error
METRICS_ENABLED=true                       # Enable performance metrics

# Production Settings
NODE_ENV=production
SERVICE_NAME=curia-embedding-worker
```

### Optional Configuration
```bash
# Advanced OpenAI Settings
OPENAI_TIMEOUT_MS=30000                    # Request timeout
OPENAI_MAX_RETRIES=2                       # OpenAI client retries

# Database Connection Pool
DB_POOL_MIN=1                              # Minimum connections
DB_POOL_MAX=5                              # Maximum connections  
DB_IDLE_TIMEOUT_MS=30000                   # Connection idle timeout

# Rate Limiting
RATE_LIMIT_WINDOW_MS=60000                 # Rate limit window
RATE_LIMIT_BURST_SIZE=10                   # Allow burst requests

# Monitoring
SENTRY_DSN=https://...                     # Error tracking (optional)
PROMETHEUS_PORT=9090                       # Metrics endpoint (optional)
```

## Error Handling & Resilience

### Error Categories

**1. Database Errors**
- **Connection Loss**: Automatic reconnection with exponential backoff
- **Query Failures**: Log error, skip post, continue processing
- **Transaction Deadlocks**: Retry with jitter

**2. OpenAI API Errors**
- **Rate Limits**: Queue requests, respect 429 responses
- **Network Timeouts**: Retry with exponential backoff
- **Invalid Content**: Log error, mark post as failed, continue
- **API Key Issues**: Fatal error, stop service

**3. Application Errors**
- **Invalid Post Data**: Log warning, skip post
- **Memory Issues**: Graceful degradation, restart if needed
- **Configuration Errors**: Fatal error, stop service

### Retry Logic

**Database Operations:**
```typescript
const retryConfig = {
  attempts: 3,
  delay: 1000,
  backoff: 'exponential',
  jitter: true
};
```

**OpenAI API Calls:**
```typescript
const openaiRetryConfig = {
  attempts: 3,
  delay: 2000,
  backoff: 'exponential',
  retryCondition: (error) => {
    // Retry on network errors and 5xx responses
    return error.code === 'ECONNRESET' || 
           (error.status >= 500 && error.status < 600);
  }
};
```

### Circuit Breaker Pattern

**OpenAI API Circuit Breaker:**
- **Failure Threshold**: 5 failures in 60 seconds
- **Open Duration**: 5 minutes
- **Half-Open Test**: Single request to test recovery

## Performance Specifications

### Target Metrics
- **Throughput**: 100 embeddings/minute sustained
- **Latency**: <2 seconds per embedding (P95)
- **Memory Usage**: <100MB sustained
- **CPU Usage**: <50% sustained
- **Error Rate**: <1% of total requests

### Resource Requirements

**Development:**
- RAM: 64MB minimum, 128MB recommended
- CPU: 0.1 vCPU minimum, 0.25 vCPU recommended
- Network: OpenAI API + PostgreSQL access

**Production:**
- RAM: 128MB minimum, 256MB recommended  
- CPU: 0.25 vCPU minimum, 0.5 vCPU recommended
- Network: Stable internet connection for OpenAI API

**Scaling Considerations:**
- **Horizontal**: Multiple worker instances (shared queue via DB)
- **Vertical**: Increase memory/CPU for higher throughput
- **Rate Limits**: OpenAI tier limits (100 req/min for free tier)

## Monitoring & Observability

### Health Checks

**Liveness Probe:**
```http
GET /health
Response: { "status": "healthy", "uptime": 3600, "version": "1.0.0" }
```

**Readiness Probe:**
```http
GET /ready  
Response: { "ready": true, "database": "connected", "lastProcessed": "2025-01-08T10:30:00Z" }
```

### Metrics Collection

**Core Metrics:**
```typescript
interface EmbeddingMetrics {
  // Throughput
  embeddingsGenerated: Counter;
  embeddingsPerMinute: Gauge;
  
  // Latency  
  embeddingGenerationTime: Histogram;
  openaiApiLatency: Histogram;
  
  // Errors
  errorsByType: Counter; // database, openai, validation
  retryAttempts: Counter;
  
  // Resources
  memoryUsage: Gauge;
  cpuUsage: Gauge;
  activeConnections: Gauge;
  
  // Business
  costPerEmbedding: Gauge;
  queueLength: Gauge;
}
```

### Logging Strategy

**Log Levels:**
- **ERROR**: Service failures, API errors, connection issues
- **WARN**: Retry attempts, rate limiting, configuration issues  
- **INFO**: Service lifecycle, embedding completions, metrics
- **DEBUG**: Event processing details, API request/response

**Log Format:**
```json
{
  "timestamp": "2025-01-08T10:30:00.123Z",
  "level": "info",
  "service": "embedding-worker",
  "event": "embedding_generated",
  "postId": 123,
  "duration": 1234,
  "cost": 0.00002,
  "metadata": {
    "model": "text-embedding-3-small",
    "tokens": 150,
    "textLength": 450
  }
}
```

## Integration Points

### Main Application Integration

**Synchronous Attempt (Optional):**
```typescript
// In main app POST /api/posts
try {
  await EmbeddingService.embedPostImmediately(postId, title, content);
  // Success: embedding generated synchronously
} catch (error) {
  // Failure: worker will handle via PostgreSQL trigger
  console.log('Sync embedding failed, worker will retry');
}
```

**Status Checking:**
```typescript
// Check if post has embedding
const hasEmbedding = await query(
  'SELECT embedding IS NOT NULL as has_embedding FROM posts WHERE id = $1',
  [postId]
);
```

### Search Service Integration

**Query Embedding Generation:**
```typescript
// For search queries, main app can call worker directly
const queryEmbedding = await EmbeddingService.generateQueryEmbedding(searchText);

// Or use shared utility with caching
const cachedEmbedding = await EmbeddingCache.getQueryEmbedding(searchText);
```

## Deployment Architecture

### Railway Deployment

**Service Structure:**
```
curia-main-app/          # Existing Next.js application
curia-embedding-worker/  # New background service
postgresql/              # Shared database
```

**Resource Allocation:**
```yaml
# railway.toml for embedding worker
[build]
  builder = "DOCKERFILE"
  buildCommand = "yarn build"

[deploy]
  healthcheckPath = "/health"
  healthcheckTimeout = 30
  restartPolicyType = "ON_FAILURE" 
  restartPolicyMaxRetries = 3

[env]
  NODE_ENV = "production"
  EMBEDDING_RATE_LIMIT = "100"
  LOG_LEVEL = "info"
```

### Docker Configuration

**Multi-Stage Build:**
```dockerfile
# Build stage
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production && npm cache clean --force
COPY src/ ./src/
COPY tsconfig.json ./
RUN npm run build

# Production stage  
FROM node:20-alpine AS production
RUN addgroup -g 1001 -S nodejs && adduser -S worker -u 1001
WORKDIR /app
COPY --from=builder --chown=worker:nodejs /app/dist ./dist
COPY --from=builder --chown=worker:nodejs /app/node_modules ./node_modules
USER worker
CMD ["node", "dist/index.js"]
```

## Security Considerations

### API Key Management
- **Environment Variables**: Never hardcode API keys
- **Rotation Support**: Service should restart gracefully on key rotation
- **Audit Logging**: Log API key usage (without exposing keys)

### Database Security  
- **Connection Pooling**: Prevent connection exhaustion
- **SQL Injection**: Use parameterized queries only
- **Read-Only Operations**: Service only reads posts, updates embeddings

### Network Security
- **HTTPS Only**: All OpenAI API calls over HTTPS
- **Internal Communication**: Database connections via private network
- **Rate Limiting**: Prevent abuse of OpenAI API

## Testing Strategy

### Unit Tests
```typescript
// Core functionality tests
describe('EmbeddingService', () => {
  test('generates valid embeddings for text input');
  test('handles empty text gracefully');
  test('respects rate limits');
  test('retries on network failures');
});

describe('EmbeddingWorker', () => {
  test('processes notification events');
  test('handles database reconnection');
  test('graceful shutdown on SIGTERM');
});
```

### Integration Tests
```typescript
// Database integration
describe('Database Integration', () => {
  test('connects to PostgreSQL successfully');
  test('listens for NOTIFY events');
  test('updates embedding column correctly');
  test('handles transaction rollbacks');
});

// OpenAI integration
describe('OpenAI Integration', () => {
  test('generates embeddings with real API');
  test('handles rate limit responses');
  test('validates embedding dimensions');
});
```

### End-to-End Tests
```typescript
// Full workflow tests
describe('E2E Workflow', () => {
  test('new post triggers embedding generation');
  test('post update regenerates embedding');
  test('service recovery after restart');
  test('handles high throughput scenarios');
});
```

## Migration Strategy

### Phase 1: Development Setup
1. ✅ Create separate service structure
2. ✅ Implement PostgreSQL LISTEN/NOTIFY
3. ✅ Add OpenAI embedding generation
4. ✅ Basic error handling and logging

### Phase 2: Production Preparation  
1. Add comprehensive monitoring
2. Implement circuit breaker patterns
3. Add performance optimizations
4. Create deployment configurations

### Phase 3: Production Rollout
1. Deploy as separate Railway service
2. Monitor performance and errors
3. Gradual rollout with feature flags
4. Performance tuning based on real usage

### Phase 4: Enhancement
1. Add semantic search endpoints
2. Implement query embedding caching
3. Add batch processing capabilities
4. Consider horizontal scaling

## Success Criteria

### Functional Requirements ✅
- Service processes PostgreSQL NOTIFY events reliably
- Generates embeddings for all new/updated posts
- Handles errors gracefully without data loss
- Integrates seamlessly with existing application

### Performance Requirements
- **Availability**: 99.9% uptime (8.76 hours downtime/year)
- **Throughput**: Handle 10K posts/day (≈7 posts/minute)
- **Latency**: Average embedding generation <2 seconds
- **Cost**: <$10/month for typical usage patterns

### Operational Requirements
- **Monitoring**: Complete visibility into service health
- **Debugging**: Comprehensive logging for troubleshooting
- **Deployment**: One-click deployment to Railway
- **Maintenance**: Zero-downtime updates and restarts

---

## Next Steps

1. **Review & Approval**: Validate this specification with requirements
2. **Implementation**: Build service following this specification  
3. **Testing**: Comprehensive test suite for all scenarios
4. **Documentation**: API documentation and runbooks
5. **Deployment**: Production rollout with monitoring

**Estimated Timeline:** 1-2 weeks for full implementation and testing 