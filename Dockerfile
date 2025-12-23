# Use Node.js 18 Alpine for smaller image
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install all dependencies (including dev for build)
RUN npm ci

# Copy source code
COPY src/ ./src/
COPY data/ ./data/
COPY public/ ./public/
COPY tsconfig.json ./

# Build TypeScript
RUN npm run build

# Remove dev dependencies to slim down image
RUN npm prune --production

# Copy environment file
COPY .env ./

# Expose ports (3000 for production polling, 3001 for development webhooks)
EXPOSE 3000 3001

# Run the bot
CMD ["npm", "start"]