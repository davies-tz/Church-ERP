# Imara Finance MFI - container image
#
# This app is a single long-running Express server (server.ts), not a set of
# serverless functions, so it's built here as a normal Node process. It needs
# the *full* node_modules (including devDependencies) at runtime because:
#   - server.ts statically imports "vite" (used only when NODE_ENV !== "production",
#     but the import itself still executes at startup either way)
#   - `npm run db:push` (drizzle-kit) needs its own devDependency + the
#     TypeScript source files (schema.ts, drizzle.config.ts), not just the bundle
# so this image intentionally is not a slimmed-down multi-stage build.

FROM node:20-alpine

WORKDIR /app

# Install dependencies first for better layer caching
COPY package.json ./
RUN npm install

# Copy the rest of the source and build the frontend + bundle the server
COPY . .
RUN npm run build

ENV NODE_ENV=production
ENV PORT=3000
EXPOSE 3000

CMD ["node", "dist/server.cjs"]
