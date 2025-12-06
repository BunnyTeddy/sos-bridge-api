FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY sos-bridge-agent/package*.json ./

# Install dependencies
RUN npm ci --only=production=false

# Copy source code
COPY sos-bridge-agent/ ./

# Build TypeScript
RUN npm run build

# Expose port
EXPOSE 3000

# Start command
CMD ["npm", "start"]


