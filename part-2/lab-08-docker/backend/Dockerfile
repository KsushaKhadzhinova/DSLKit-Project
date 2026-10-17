# Build context: ../lab-03-auth (set in docker-compose.yml).
# REGISTRY is an optional prefix of a mirror, for example mirror.gcr.io/ (note the trailing slash).
ARG REGISTRY=

# Stage 1: production dependencies only, native modules (bcrypt, sqlite3) come as prebuilt binaries for Alpine.
FROM ${REGISTRY}library/node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force

# Stage 2: small runtime image without npm cache, tests and reports (see Dockerfile.dockerignore).
FROM ${REGISTRY}library/node:22-alpine
WORKDIR /app
ENV PORT=3000
COPY --from=deps --chown=node:node /app/node_modules ./node_modules
COPY --chown=node:node . .
# The official image ships a non-root user "node": the server never runs as root.
USER node
EXPOSE 3000
HEALTHCHECK --interval=15s --timeout=3s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+process.env.PORT+'/health').then(r=>process.exit(r.ok?0:1),()=>process.exit(1))"
# Tables are created by the migrations, the admin seed is idempotent and skipped without ADMIN_EMAIL.
CMD ["sh", "-c", "npx sequelize-cli db:migrate && npx sequelize-cli db:seed:all && exec node server.js"]
