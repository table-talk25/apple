FROM node:22-alpine

WORKDIR /app

# Copia solo il package.json del BACKEND e installa le dipendenze
COPY BACKEND/package.json BACKEND/package-lock.json ./

RUN npm ci --omit=dev

# Copia tutto il codice del BACKEND
COPY BACKEND/ .

EXPOSE 5000

CMD ["node", "server.js"]
