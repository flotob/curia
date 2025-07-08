# Use Node.js LTS Alpine for smaller image
FROM node:20-alpine

# Set working directory
WORKDIR /app

# Copy package files
COPY package.json package-lock.json* ./

# Install dependencies
RUN npm ci --only=production

# Copy TypeScript config and source code
COPY tsconfig.json ./
COPY src/ ./src/

# Install dev dependencies for build
RUN npm ci

# Build the TypeScript
RUN npm run build

# Remove dev dependencies
RUN npm prune --production

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs
RUN adduser -S embedding-worker -u 1001

# Change ownership and switch to non-root user
RUN chown -R embedding-worker:nodejs /app
USER embedding-worker

# Expose health check port (if needed)
EXPOSE 3001

# Set environment
ENV NODE_ENV=production

# Start the worker
CMD ["npm", "start"] 