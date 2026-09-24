FROM oven/bun:1.3.9 AS build
WORKDIR /workspace

COPY package.json bun.lock ./
COPY apps/web/package.json apps/web/package.json
COPY packages/ui/package.json packages/ui/package.json
COPY packages/eslint-config/package.json packages/eslint-config/package.json
COPY packages/typescript-config/package.json packages/typescript-config/package.json
RUN bun install --frozen-lockfile

COPY . .
WORKDIR /workspace/apps/web
RUN bun run build

FROM node:22-bookworm-slim AS runtime
ENV NODE_ENV=production PORT=3000 HOSTNAME=0.0.0.0
WORKDIR /app

COPY --from=build --chown=node:node /workspace/apps/web/.next/standalone ./
COPY --from=build --chown=node:node /workspace/apps/web/.next/static ./apps/web/.next/static
COPY --from=build --chown=node:node /workspace/apps/web/public ./apps/web/public
COPY --chown=node:node deploy/start-web.sh /app/start-web.sh

USER node
EXPOSE 3000
CMD ["/bin/sh", "/app/start-web.sh"]
