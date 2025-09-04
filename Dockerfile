# Multi-stage build for JobPing Automation
FROM node:18-alpine AS base

# Install dependencies only when needed
FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Install dependencies (including devDependencies for TypeScript)
COPY package.json package-lock.json* ./
RUN npm ci --legacy-peer-deps

# Copy source code
FROM base AS runner
WORKDIR /app

ENV NODE_ENV production
ENV NEXT_TELEMETRY_DISABLED 1

# Copy dependencies and source code
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Create automation user
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 automation

# Set permissions
RUN chown -R automation:nodejs /app

USER automation

EXPOSE 3000

ENV PORT 3000
ENV HOSTNAME "0.0.0.0"

# Start our automation system instead of Next.js
CMD ["node", "railway-entry.js"]





