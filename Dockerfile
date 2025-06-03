# Dockerfile

# ---- Builder Stage ----
FROM node:20-alpine AS builder
WORKDIR /app

# Copy package.json and yarn.lock first to leverage Docker cache
COPY package.json yarn.lock ./

# Install all dependencies (including devDependencies for build)
RUN yarn install --frozen-lockfile

# Copy the rest of the application code
COPY . .

# Run the build script (next build && tsc)
RUN yarn build

# ---- Production Stage ----
FROM node:20-alpine
WORKDIR /app

# Set NODE_ENV to production
ENV NODE_ENV=production

# Copy package.json and yarn.lock
COPY package.json yarn.lock ./

# Install only production dependencies
RUN yarn install --production --frozen-lockfile

# Copy built artifacts from the builder stage
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/public ./public

# Expose the port the app runs on (Railway will map this to $PORT)
EXPOSE 3000

# Command to run the application
# This will use the "start" script from package.json: "NODE_ENV=production node dist/server.js"
CMD ["yarn", "start"] 