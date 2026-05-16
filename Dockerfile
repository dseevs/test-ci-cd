# syntax=docker/dockerfile:1

FROM node:20-alpine AS deps
WORKDIR /app

# Install dependencies first for better Docker layer caching
COPY package.json package-lock.json ./
COPY next-english-node-1.0.5.tgz ./
RUN npm ci

FROM node:20-alpine AS builder
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

ARG NEXT_PUBLIC_ALLOWED_PARENT_ORIGINS=""
ARG NEXT_PUBLIC_LAB_EMBED_ONLY=""
ARG NEXT_PUBLIC_EMBEDDED_SESSION_GUARD=""
ENV NEXT_PUBLIC_ALLOWED_PARENT_ORIGINS=$NEXT_PUBLIC_ALLOWED_PARENT_ORIGINS
ENV NEXT_PUBLIC_LAB_EMBED_ONLY=$NEXT_PUBLIC_LAB_EMBED_ONLY
ENV NEXT_PUBLIC_EMBEDDED_SESSION_GUARD=$NEXT_PUBLIC_EMBEDDED_SESSION_GUARD
ENV NODE_ENV=production

# next.config.mjs uses `output: 'export'`, so `npm run build` produces a static
# directory at `./build/` which nginx can serve.
RUN npm run build

FROM nginx:alpine AS runner

# Static routing for Next export under /acetic/
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/build/ /usr/share/nginx/html/

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
