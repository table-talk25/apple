# Stage 1: Build
FROM node:22-alpine AS builder
WORKDIR /app

# Copia solo package files prima (cache layer)
COPY package*.json ./
COPY .npmrc* ./

# Installa dipendenze
RUN npm install

# Copia il sorgente (ESCLUDE build/ grazie a .dockerignore)
COPY . .

# Rimuove esplicitamente la build committata e compila da zero
RUN rm -rf build && npm run build

# Stage 2: Serve con nginx
FROM nginx:alpine

# Copia la build appena compilata
COPY --from=builder /app/build /usr/share/nginx/html

# Nginx config per React SPA (gestisce il routing client-side)
RUN printf 'server {\n\
    listen 80;\n\
    root /usr/share/nginx/html;\n\
    index index.html;\n\
    location / {\n\
        try_files $uri $uri/ /index.html;\n\
    }\n\
    location /static/ {\n\
        expires 1y;\n\
        add_header Cache-Control "public, immutable";\n\
    }\n\
}\n' > /etc/nginx/conf.d/default.conf

EXPOSE 80
