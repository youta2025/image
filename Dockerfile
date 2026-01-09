# Stage 1: Build the application
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Set NPM mirror for faster installation in China
RUN npm config set registry https://registry.npmmirror.com

# Install dependencies
RUN npm ci

# Copy source code
COPY . .

# Build the frontend (Vite)
# This will generate the 'dist' folder
RUN npm run build

# Stage 2: Production Run
FROM node:20-alpine

WORKDIR /app

# Copy built artifacts and necessary files from builder
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/api ./api
# Copy public folder for uploads structure
COPY --from=builder /app/public ./public

# Ensure uploads directory exists
RUN mkdir -p public/uploads

# Install ImageMagick (Optional, kept for compatibility)
# Using dl-cdn.alpinelinux.org can be slow, switching to mirrors if needed, 
# but usually alpine mirror is fast enough. 
# We can remove ImageMagick if we are fully JS now, but keeping it is safer.
RUN apk add --no-cache imagemagick

# Expose the port the app runs on
EXPOSE 3002

# Set environment to production
ENV NODE_ENV=production
ENV PORT=3002

# Start the server
CMD ["npm", "start"]
