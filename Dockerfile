FROM node:24-bookworm-slim

WORKDIR /app
ENV NODE_ENV=production \
    APP_ENV=production \
    BIND_HOST=0.0.0.0 \
    PORT=8080

COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force

COPY src/ ./src/
COPY public/ ./public/
COPY db/postgres/ ./db/postgres/

USER node
EXPOSE 8080
CMD ["node", "src/start.js"]
