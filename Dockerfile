# ── Stage 1: Dependencies ──
FROM node:20-slim AS deps
WORKDIR /app

COPY package.json package-lock.json ./
COPY prisma.config.ts ./
COPY prisma ./prisma/

RUN npm ci --include=optional

# ── Stage 2: Build ──
FROM node:20-slim AS builder
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production

RUN npx prisma generate
RUN npm run build

# ── Stage 3: Production ──
FROM node:20-slim AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

# Install Playwright Chromium system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    libnss3 \
    libatk1.0-0 \
    libatk-bridge2.0-0 \
    libcups2 \
    libdrm2 \
    libxkbcommon0 \
    libxcomposite1 \
    libxdamage1 \
    libxrandr2 \
    libgbm1 \
    libpango-1.0-0 \
    libcairo2 \
    libasound2 \
    libxshmfence1 \
    libgtk-3-0 \
    libx11-xcb1 \
    fonts-noto-color-emoji \
    fonts-freefont-ttf \
    ca-certificates \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Create non-root user
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Copy built app
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/prisma.config.ts ./prisma.config.ts
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma
COPY --from=builder /app/node_modules/prisma ./node_modules/prisma

# Install Playwright browsers (only Chromium)
COPY --from=deps /app/node_modules/playwright-core ./node_modules/playwright-core
COPY --from=deps /app/node_modules/playwright ./node_modules/playwright
RUN npx playwright install chromium

# Create uploads directory
RUN mkdir -p /app/public/uploads && chown -R nextjs:nodejs /app/public/uploads

USER nextjs

EXPOSE 3000

CMD ["node", "server.js"]
