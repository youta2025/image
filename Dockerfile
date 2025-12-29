# Dockerfile
FROM node:18-bullseye-slim

# Install system dependencies for Playwright
RUN apt-get update && apt-get install -y \
    wget \
    gnupg \
    && rm -rf /var/lib/apt/lists/*

# Install Playwright dependencies
# We use the official playwright installation script or just install the browsers
# But first let's set up the app
WORKDIR /app

COPY package*.json ./
RUN npm install

# Install Playwright browsers and dependencies
# This is crucial for Linux environments
RUN npx playwright install --with-deps chromium

COPY . .

# Build frontend
RUN npm run build

# Expose port
EXPOSE 3002

# Start server
# Use tsx directly for production to avoid nodemon overhead
CMD ["npm", "start"]
