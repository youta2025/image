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

# Copy custom fonts
COPY --from=builder /app/fonts /usr/share/fonts/custom/

# Ensure uploads directory exists
RUN mkdir -p public/uploads

# Install ImageMagick and refresh fonts
RUN apk add --no-cache imagemagick font-noto-cjk fontconfig && \
    fc-cache -fv

# Expose the port the app runs on
EXPOSE 3002

# Set environment to production
ENV NODE_ENV=production
ENV PORT=3002

# Start the server
CMD ["npm", "start"]
