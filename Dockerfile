# syntax=docker/dockerfile:1
# Build a small, non-root container that runs hostaway-mcp over stdio.
# Used by Glama for introspection (list_tools); also usable as a
# standalone runtime via `docker run -i --env-file .env hostaway-mcp`.

# ---- Build stage ----
FROM node:20-alpine AS build
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY tsconfig.json ./
COPY src ./src
RUN npm run build && npm prune --omit=dev

# ---- Runtime stage ----
FROM node:20-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production

RUN addgroup -S mcp && adduser -S mcp -G mcp
USER mcp

COPY --from=build --chown=mcp:mcp /app/node_modules ./node_modules
COPY --from=build --chown=mcp:mcp /app/build ./build
COPY --chown=mcp:mcp package.json ./

# MCP communicates over stdio; no port to expose.
CMD ["node", "build/index.js"]
