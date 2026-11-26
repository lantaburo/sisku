FROM node:22.12.0-alpine AS dependencies
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force

FROM node:22.12.0-alpine AS runtime
ENV NODE_ENV=production
WORKDIR /app
RUN addgroup -S sisku && adduser -S sisku -G sisku
COPY --from=dependencies /app/node_modules ./node_modules
COPY package.json ./
COPY migrations ./migrations
COPY src ./src
COPY scripts ./scripts
USER sisku
EXPOSE 3000
CMD ["node", "src/start.js"]
