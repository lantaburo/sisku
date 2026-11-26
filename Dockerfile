# Adapter deployment untuk Railway bila repository GitHub dihubungkan dari root.
# Kode aplikasi tetap terisolasi di /railway-sisku.
FROM node:22.12.0-alpine AS dependencies
WORKDIR /app
COPY railway-sisku/package.json railway-sisku/package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force

FROM node:22.12.0-alpine AS runtime
ENV NODE_ENV=production
WORKDIR /app
RUN addgroup -S sisku && adduser -S sisku -G sisku
COPY --from=dependencies /app/node_modules ./node_modules
COPY railway-sisku/package.json ./
COPY railway-sisku/migrations ./migrations
COPY railway-sisku/src ./src
COPY railway-sisku/scripts ./scripts
USER sisku
EXPOSE 3000
CMD ["node", "src/start.js"]
