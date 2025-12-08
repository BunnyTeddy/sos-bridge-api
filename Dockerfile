FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY sos-bridge-agent/package*.json ./

# Install ALL dependencies (including devDependencies for build)
RUN npm ci

# Copy source code
COPY sos-bridge-agent/ ./

# Build TypeScript and verify
RUN npm run build && ls -la dist/

# Remove devDependencies after build
RUN npm prune --production

# Expose port (Railway assigns dynamically via $PORT)
EXPOSE 3000

# Start command with error logging
CMD ["node", "dist/api-main.js"]





