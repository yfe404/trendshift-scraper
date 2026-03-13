FROM apify/actor-node:20 AS builder

COPY package*.json ./
RUN npm --quiet set progress=false \
    && npm install \
    && echo "Installed NPM packages:" \
    && (npm list --all || true) \
    && echo "Node.js version:" \
    && node --version \
    && echo "NPM version:" \
    && npm --version

COPY . ./
RUN npm run build

# Remove dev dependencies after build
RUN npm prune --omit=dev

FROM apify/actor-node:20

COPY --from=builder /usr/src/app/package*.json ./
COPY --from=builder /usr/src/app/node_modules ./node_modules
COPY --from=builder /usr/src/app/dist ./dist
COPY .actor ./.actor

CMD node dist/main.js
