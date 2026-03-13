FROM apify/actor-node:20 AS builder

COPY package*.json ./
RUN npm --quiet set progress=false \
    && NODE_ENV=development npm install \
    && echo "Installed NPM packages:" \
    && (npm list --all || true) \
    && echo "Node.js version:" \
    && node --version \
    && echo "NPM version:" \
    && npm --version

COPY . ./
RUN ./node_modules/.bin/tsc

# Remove dev dependencies after build
RUN npm prune --omit=dev

FROM apify/actor-node:20

COPY --from=builder /usr/src/app/package*.json ./
COPY --from=builder /usr/src/app/node_modules ./node_modules
COPY --from=builder /usr/src/app/dist ./dist
COPY .actor ./.actor

CMD node dist/main.js
