# Use Node.js LTS Alpine for smaller image
FROM node:20-alpine

# Set working directory
WORKDIR /app

# Copy package files
COPY package.json yarn.lock ./

# Copy TypeScript config and source code first (for better layer caching)
COPY tsconfig.json ./
COPY src/ ./src/

# Install all dependencies (including dev for build)
RUN yarn install --frozen-lockfile

# Build the TypeScript
RUN yarn build

# Remove dev dependencies for production
RUN yarn install --frozen-lockfile --production

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs
RUN adduser -S embedding-worker -u 1001

# Change ownership and switch to non-root user
RUN chown -R embedding-worker:nodejs /app
USER embedding-worker

# Expose health check port
EXPOSE 3001

# Set environment
ENV NODE_ENV=production

# Start the worker
CMD ["yarn", "start"] 