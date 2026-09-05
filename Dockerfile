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
COPY --from=build /app/dist ./dist

# AdminJS bundles the React components from SOURCE at startup: the component
# loader points at src/components, and public/ holds the logo and the injected
# stylesheet. Shipping dist alone makes the process exit on boot with
# "Trying to bundle file ... but it doesn't exist" — a crash loop on Cloud Run.
COPY --from=build /app/src/components ./src/components
COPY --from=build /app/public ./public

USER node
# Cloud Run injects PORT; config/env.ts already reads it.
EXPOSE 8080
CMD ["node", "dist/index.js"]
