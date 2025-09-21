# Multi-stage Dockerfile for TextArtTools MCP Server
# Optimized for development, testing, and CI/CD while maintaining Cloudflare Workers compatibility

# Base stage with Node.js and common dependencies
FROM node:20-alpine AS base

# Set working directory
WORKDIR /app

# Install system dependencies
RUN apk add --no-cache \
    git \
    curl \
    bash

# Install global dependencies
RUN npm install -g wrangler@latest

# Copy package files
COPY package.json package-lock.json ./

# Development stage - includes dev dependencies and development tools
FROM base AS development

# Install all dependencies (including dev dependencies)
RUN npm ci

# Copy source code
COPY . .

# Create non-root user for development
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nextjs -u 1001

# Change ownership of the app directory
RUN chown -R nextjs:nodejs /app
USER nextjs

# Expose development port
EXPOSE 8788

# Development command with hot reload
CMD ["npm", "run", "dev"]

# Testing stage - optimized for running tests
FROM development AS testing

# Switch back to root for test setup
USER root

# Install additional testing tools
RUN npm install -g vitest@latest

# Switch back to nodejs user
USER nextjs

# Run tests by default
CMD ["npm", "test"]

# Build stage - for creating production build
FROM base AS build

# Install only production dependencies first
RUN npm ci --only=production && npm cache clean --force

# Install dev dependencies for build
RUN npm ci

# Copy source code
COPY . .

# Build the application
RUN npm run build

# CI stage - for continuous integration
FROM node:20-alpine AS ci

# Install system dependencies for CI
RUN apk add --no-cache \
    git \
    curl \
    bash \
    python3 \
    make \
    g++

# Set working directory
WORKDIR /app

# Install global dependencies for CI
RUN npm install -g \
    wrangler@latest \
    vitest@latest \
    typescript@latest

# Copy package files
COPY package.json package-lock.json ./

# Install all dependencies
RUN npm ci

# Copy source code
COPY . .

# Default CI command
CMD ["npm", "run", "ci"]

# Production artifacts stage - for copying build artifacts only
FROM scratch AS artifacts

# Copy built application from build stage
COPY --from=build /app/dist /dist
COPY --from=build /app/package.json /package.json
COPY --from=build /app/wrangler.toml /wrangler.toml

# Note: This stage is for copying artifacts only
# Cloudflare Workers deployment uses wrangler, not Docker containers