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
# We use tsx to run the typescript server directly or we could compile it
# For production, it's better to compile, but for simplicity here we use tsx or nodemon
CMD ["npm", "run", "server:dev"]
