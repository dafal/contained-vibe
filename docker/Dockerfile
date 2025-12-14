# =============================================================================
# Stage 1: Build Node.js server
# =============================================================================
FROM node:20-bookworm-slim AS server-builder

WORKDIR /build/server

# Install build dependencies for node-pty
RUN apt-get update && apt-get install -y \
    build-essential \
    python3 \
    && rm -rf /var/lib/apt/lists/*

# Copy package files first for better caching
COPY server/package*.json ./
RUN npm install

# Copy source and build
COPY server/tsconfig.json ./
COPY server/src ./src
RUN npm run build

# =============================================================================
# Stage 2: Build frontend
# =============================================================================
FROM node:20-bookworm-slim AS client-builder

WORKDIR /build/client

COPY client/package*.json ./
RUN npm install

COPY client/ ./
# Workaround for esbuild Go runtime bug in Docker buildx
# Set ESBUILD_WORKER_THREADS=1 to avoid parallel processing issues
ENV ESBUILD_WORKER_THREADS=1
RUN npm run build

# =============================================================================
# Stage 3: Production image
# =============================================================================
FROM node:20-bookworm-slim AS production

# Install Python 3.12+ for mistral-vibe and runtime dependencies
RUN apt-get update && apt-get install -y \
    python3 \
    python3-pip \
    python3-venv \
    git \
    curl \
    ca-certificates \
    # Required for node-pty at runtime
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Install uv for faster Python package installation
RUN pip3 install --break-system-packages uv

# Install mistral-vibe globally using uv
RUN uv tool install mistral-vibe

# Add uv tools to PATH
ENV PATH="/root/.local/bin:$PATH"

# Verify vibe installation
RUN vibe --version || echo "vibe installed (first run will prompt for config)"

# Create workspace directory
RUN mkdir -p /workspace
WORKDIR /workspace

# Copy built server
WORKDIR /app/server
COPY --from=server-builder /build/server/dist ./dist
COPY --from=server-builder /build/server/node_modules ./node_modules
COPY --from=server-builder /build/server/package.json ./

# Copy built client (for static file serving)
COPY --from=client-builder /build/client/dist /app/client/dist

# Environment configuration
ENV NODE_ENV=production
ENV PORT=3000
ENV WORKSPACE_DIR=/workspace
ENV HOME=/root

# Expose WebSocket/HTTP port
EXPOSE 3000

# Start the server
CMD ["node", "dist/index.js"]
