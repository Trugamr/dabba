FROM node:20.11.0-bookworm-slim as base
RUN corepack enable


FROM base as development

WORKDIR /app

COPY package.json pnpm-lock.yaml ./

RUN pnpm install --frozen-lockfile


FROM base as production

WORKDIR /app

COPY --from=development /app/package.json ./package.json
COPY --from=development /app/pnpm-lock.yaml ./pnpm-lock.yaml
COPY --from=development /app/node_modules ./node_modules

RUN pnpm prune --prod


FROM base as builder

WORKDIR /app

COPY --from=development /app/package.json ./package.json
COPY --from=development /app/pnpm-lock.yaml ./pnpm-lock.yaml
COPY --from=development /app/node_modules ./node_modules

COPY . .

RUN pnpm build


FROM base as runner

RUN apt update \
  && apt install --yes --no-install-recommends \
  ca-certificates \
  curl \
  gnupg \
  && install -m 0755 -d /etc/apt/keyrings \
  && curl -fsSL https://download.docker.com/linux/debian/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg \
  && chmod a+r /etc/apt/keyrings/docker.gpg \
  && echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/debian \
  $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | \
  tee /etc/apt/sources.list.d/docker.list > /dev/null \
  && apt update \
  && apt install --yes --no-install-recommends \
  docker-ce-cli \
  docker-compose-plugin \
  && apt clean \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY --from=production /app/package.json ./package.json
COPY --from=production /app/pnpm-lock.yaml ./pnpm-lock.yaml
COPY --from=production /app/node_modules ./node_modules

COPY --from=builder /app/public ./public
COPY --from=builder /app/build ./build

HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 CMD ["curl", "--location", "--fail", "--silent", "http://localhost:3000/health"]

EXPOSE 3000

ENV STACKS_DIRECTORY=/app/stacks

CMD ["node_modules/.bin/remix-serve", "./build/server/index.js"]