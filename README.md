# table2Talk

Applicazione full-stack per organizzare e condividere pasti sociali (online e in presenza), con chat in tempo reale, videochiamate e supporto web/mobile.

## Struttura del repository

```text
.
├── BACKEND/                  # API REST, WebSocket e cron job (Node.js / Express)
│   ├── app.js                # Configurazione Express, middleware e route
│   ├── server.js             # Entry point server HTTP/Socket.IO (porta 5001)
│   ├── bootstrap/            # Avvio servizi e Firebase Admin
│   ├── config/               # Connessione MongoDB e validazione variabili d'ambiente
│   ├── controllers/          # Logica degli endpoint
│   ├── jobs/                 # Job pianificati (stato pasti, email, video)
│   ├── middleware/           # Auth, sicurezza, upload
│   ├── models/               # Modelli Mongoose
│   ├── routes/               # Definizione route API
│   ├── services/             # Servizi di dominio e notifiche
│   ├── socket.js             # Gestione Socket.IO
│   └── tests/                # Suite di test (Jest / Supertest)
├── FRONTEND/
│   └── client/               # Web app React (Create React App) + wrapper Capacitor
│       ├── Dockerfile        # Build multi-stage React + Nginx per il deploy
│       ├── public/           # Asset statici
│       ├── src/              # Sorgenti React
│       ├── android/          # Progetto Capacitor Android
│       └── ios/              # Progetto Capacitor iOS
├── Dockerfile                # Immagine Docker del backend (Node 22 Alpine)
└── package.json              # Script monorepo per sviluppo locale
```

## Stack tecnologico

- **Backend (`BACKEND/`)**: Node.js, Express, MongoDB (Mongoose), Socket.IO, Firebase Admin, Twilio, Nodemailer, node-cron.
- **Frontend (`FRONTEND/client/`)**: React 18 (Create React App), React Router, Bootstrap / React-Bootstrap, Socket.IO Client, Firebase, Twilio Video, Leaflet, i18next, Capacitor (Android/iOS).

## Sviluppo locale

Installazione dipendenze (root, backend e frontend):

```bash
npm run install-all
```

Avvio separato:

```bash
# Backend (porta 5001)
npm run server

# Frontend (porta 3000)
npm run client
```

Avvio simultaneo di backend e frontend:

```bash
npm run dev
```

Esecuzione test backend:

```bash
npm run test:backend
```

## Deploy con Docker su Coolify

Il progetto viene distribuito su **Coolify** come due servizi separati basati su Dockerfile:

1. **Backend (`Dockerfile` nella root)**
   - Immagine base: `node:22-alpine`
   - Installa le dipendenze di produzione da `BACKEND/package.json`, copia `BACKEND/` ed esegue `node server.js`
   - Porta esposta: `5001`
   - Configurare le variabili d'ambiente richieste (es. MongoDB, JWT, CORS, Twilio, Firebase, SMTP/SendGrid) direttamente nel pannello Coolify.

2. **Frontend (`FRONTEND/client/Dockerfile`)**
   - Build multi-stage:
     - Stage `builder` (`node:22-alpine`): installa le dipendenze ed esegue `npm run build` in `FRONTEND/client/`
     - Stage finale (`nginx:alpine`): serve gli asset statici da `/usr/share/nginx/html` con fallback SPA su `index.html`
   - Porta esposta: `80`
   - In Coolify impostare la base directory/contesto di build su `FRONTEND/client`.
