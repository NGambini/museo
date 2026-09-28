# ---- build ----
FROM node:22-slim AS build
WORKDIR /app
COPY package*.json ./
# --legacy-peer-deps is not cosmetic: AdminJS's peer dependency graph makes npm's
# resolver spin for minutes without it.
RUN npm ci --legacy-peer-deps
COPY . .
RUN npm run build

# ---- run ----
FROM node:22-slim
ENV NODE_ENV=production
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev --legacy-peer-deps && npm cache clean --force
# dist/ holds the server AND the React components AdminJS bundles for the
# browser; public/ holds the logo and the injected stylesheet. Nothing else is
# needed at runtime.
COPY --from=build /app/dist ./dist
COPY --from=build /app/public ./public

# AdminJS writes the browser bundle to .adminjs/ on startup, and /app belongs to
# root. Without a writable directory here the process dies on
# "EACCES: mkdir '.adminjs'" before it ever listens, which Cloud Run reports as
# a container that failed to start on $PORT. The API image never hit this: it
# writes nothing at runtime.
RUN mkdir -p /app/.adminjs && chown node:node /app/.adminjs

USER node
# Cloud Run injects PORT; config/env.ts already reads it.
EXPOSE 8080
CMD ["node", "dist/index.js"]
