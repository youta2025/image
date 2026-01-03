# Stage 1: Build the application
FROM node:18-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY . .

# Build the frontend (Vite)
# This will generate the 'dist' folder
RUN npm run build

# Stage 2: Production Run
FROM node:18-alpine

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

# Install minimal production tools if needed (optional)
# sharp requires native dependencies, alpine usually handles it if prebuilt binaries are compatible
# If sharp fails, we might need: RUN apk add --no-cache vips-dev

# Expose the port the app runs on
EXPOSE 3002

# Set environment to production
ENV NODE_ENV=production
ENV PORT=3002

# Start the server
# We use 'tsx' or 'node' to run the server. 
# Since we are in production, running .ts files directly with tsx is fine, 
# or we could have compiled TS to JS in build stage. 
# For simplicity here, we assume 'tsx' is available in node_modules or we use ts-node.
# Let's use the start script defined in package.json: "start": "tsx api/server.ts"
CMD ["npm", "start"]
