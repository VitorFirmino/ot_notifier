FROM node:22-slim AS deps

WORKDIR /app

RUN corepack enable

COPY package.json ./
COPY pnpm-lock.yaml* yarn.lock* package-lock.json* ./

RUN \
  if [ -f pnpm-lock.yaml ]; then \
    corepack prepare pnpm@latest --activate && pnpm install --frozen-lockfile --prod; \
  elif [ -f yarn.lock ]; then \
    corepack prepare yarn@stable --activate && yarn install --immutable --production; \
  else \
    npm install --omit=dev --legacy-peer-deps; \
  fi

FROM node:22-slim AS runtime

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    chromium \
    ca-certificates \
    fonts-liberation \
    libasound2 \
    libatk-bridge2.0-0 \
    libatk1.0-0 \
    libcups2 \
    libdbus-1-3 \
    libdrm2 \
    libgbm1 \
    libgtk-3-0 \
    libnspr4 \
    libnss3 \
    libx11-xcb1 \
    libxcomposite1 \
    libxdamage1 \
    libxfixes3 \
    libxrandr2 \
    libxshmfence1 \
    xdg-utils \
  && rm -rf /var/lib/apt/lists/*

ENV PLAYWRIGHT_BROWSERS_PATH=/usr/bin
ENV PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1
ENV PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium

RUN corepack enable

COPY --from=deps /app/node_modules ./node_modules

COPY . .

VOLUME ["/app/src/infrastructure/storage/data", "/app/data"]

EXPOSE 3000

CMD ["npm", "run", "start"]
