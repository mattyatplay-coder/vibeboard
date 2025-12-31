# Backend Dockerfile - Production Build
FROM node:22-alpine AS builder

WORKDIR /app

# Install build dependencies (no canvas native deps needed - using @napi-rs/canvas)
RUN apk add --no-cache openssl python3 make g++

# Copy package files
COPY package*.json ./

# Install all dependencies (including devDependencies for build)
RUN npm ci

# Copy source files
COPY . .

# Generate Prisma client
RUN npx prisma generate

# Build TypeScript
RUN npm run build

# Production stage
FROM node:22-alpine AS production

WORKDIR /app

# Install runtime dependencies only (no canvas deps needed - using @napi-rs/canvas)
RUN apk add --no-cache openssl ffmpeg

# Copy package files and node_modules from builder (already compiled)
COPY package*.json ./
COPY --from=builder /app/node_modules ./node_modules

# Prune dev dependencies from the copied node_modules
RUN npm prune --omit=dev

# Copy built files from builder
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma

# Create uploads directory
RUN mkdir -p uploads data

# Set environment
ENV NODE_ENV=production

EXPOSE 3001

# Use node directly for better signal handling
CMD ["node", "dist/index.js"]
