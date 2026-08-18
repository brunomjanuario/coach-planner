# ---- Build stage ----
FROM node:22-alpine AS build
WORKDIR /app

# Lockfile layer first, so an unchanged package-lock.json lets Docker reuse this layer's cache.
COPY package.json package-lock.json ./
RUN npm ci

COPY . .

# Relative by design (AD-024): Vite inlines this at build time, so an
# absolute URL here would pin the image to one environment. A relative
# path resolves against whatever origin serves the app; nginx proxies it
# onward to API_UPSTREAM at runtime (see docker/nginx.conf.template).
ARG VITE_API_BASE_URL=/api/v1
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL
RUN npm run build

# ---- Runtime stage ----
FROM nginxinc/nginx-unprivileged:alpine AS runtime

COPY --from=build /app/dist /usr/share/nginx/html
COPY docker/nginx.conf.template /etc/nginx/templates/default.conf.template

# Backend address resolved at container start, not baked at build time —
# one image works against a host-run backend or a compose-network backend.
ENV API_UPSTREAM=host.docker.internal:8080

EXPOSE 8080
