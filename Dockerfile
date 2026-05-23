FROM node:22-alpine

WORKDIR /app

# Copia solo il package.json del BACKEND e installa le dipendenze
COPY BACKEND/package.json ./

RUN npm install --omit=dev

# Copia tutto il codice del BACKEND
COPY BACKEND/ .

EXPOSE 5001

CMD ["node", "server.js"]
