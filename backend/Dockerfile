# Multi-stage Docker build for StudySync AI Backend
FROM node:20-bookworm-slim AS base

# Install system dependencies: LibreOffice, Ghostscript, Python 3, and build tools
RUN apt-get update && apt-get install -y --no-install-recommends \
    libreoffice \
    ghostscript \
    python3 \
    python3-pip \
    ca-certificates \
    curl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY prisma ./prisma/

# Install dependencies including native sharp and canvas bindings
RUN npm ci

# Generate Prisma client
RUN npx prisma generate

# Copy source code and config
COPY tsconfig.json ./
COPY src ./src/

# Compile TypeScript
RUN npm run build

# Expose server port
EXPOSE 5000

ENV NODE_ENV=production
ENV PORT=5000

# Health check to ensure API is responsive and binaries exist
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD curl -f http://localhost:5000/api/health || exit 1

# Start production server
CMD ["node", "dist/server.js"]
