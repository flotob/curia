# Dockerfile

# ---- Builder Stage ----
FROM node:20-alpine AS builder
WORKDIR /app

# Install git and openssh (required for git-based dependencies like ethereumjs-abi)
RUN apk add --no-cache git openssh-client

# Declare build arguments that Railway will inject from service variables
ARG NEXT_PRIVATE_PRIVKEY
ARG NEXT_PUBLIC_PUBKEY

# Copy package.json and yarn.lock first to leverage Docker cache
COPY package.json yarn.lock ./

# Configure git and install dependencies in same RUN to ensure config takes effect
RUN git config --global url."https://github.com/".insteadOf ssh://git@github.com/ && \
    git config --global url."https://github.com/".insteadOf git@github.com: && \
    git config --global url."https://github.com/".insteadOf git+ssh://git@github.com/ && \
    yarn install --frozen-lockfile && \
    yarn cache clean

# Copy the rest of the application code
COPY . .

# Set Node.js memory limit to handle build process (Railway memory limit optimization)
ENV NODE_OPTIONS="--max-old-space-size=2048"

# Run the build script (next build && tsc)
# The ARGs declared above will be available as environment variables to this command
RUN yarn build

# DEBUG: List the contents of /app/dist in the builder stage
RUN echo "Contents of /app/dist in builder stage:" && ls -R /app/dist

# ---- Production Stage ----
FROM node:20-alpine
WORKDIR /app

# Install git and openssh (required for git-based dependencies like ethereumjs-abi)
RUN apk add --no-cache git openssh-client

# Set NODE_ENV to production
ENV NODE_ENV=production

# Copy package.json and yarn.lock
COPY package.json yarn.lock ./

# Configure git and install production dependencies in same RUN to ensure config takes effect
RUN git config --global url."https://github.com/".insteadOf ssh://git@github.com/ && \
    git config --global url."https://github.com/".insteadOf git@github.com: && \
    git config --global url."https://github.com/".insteadOf git+ssh://git@github.com/ && \
    yarn install --production --frozen-lockfile && \
    yarn cache clean

# Copy built artifacts from the builder stage
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/public ./public

# DEBUG: List the contents of /app/dist in the production stage
RUN echo "Contents of /app/dist in production stage:" && ls -R /app/dist

# Expose the port the app runs on (Railway will map this to $PORT)
EXPOSE 3000

# Command to run the application
# This will use the "start" script from package.json: "NODE_ENV=production node dist/server.js"
CMD ["yarn", "start"] 