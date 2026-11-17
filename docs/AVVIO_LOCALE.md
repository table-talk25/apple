# Avvio locale (solo sviluppo e test)

Database di prova `tabletalk-test` su MongoDB locale. Non usare questa configurazione in produzione e non inserire segreti veri nei file.

## Prerequisiti

- Docker con Docker Compose (per database e backend), oppure MongoDB 7 installato in locale.
- Node.js 22 e npm (per il frontend; per il backend solo se non usi Docker).

## Cosa serve davvero per avviare il backend

- **Obbligatori:** `MONGO_URI` (senza, l'avvio si ferma) e `JWT_SECRET` (senza, il server parte ma registrazione e login falliscono).
- **Facoltativi:** Firebase, Twilio, SMTP e Redis. Senza, il server parte e le funzioni relative falliscono con un errore nei log: niente notifiche push, niente upload immagini (il pasto viene creato senza immagine), niente videochiamate, niente email.
- **Consigliato:** `FRONTEND_URL=http://localhost:3000`, usato per i link nelle email.

Elenco completo delle variabili: `BACKEND/.env.example`.

## Database e backend con Docker

Dalla radice del repository:

```bash
cp .env.docker.example .env.docker
```

Apri `.env.docker` e sostituisci `JWT_SECRET` con una stringa casuale lunga, per esempio con:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

Avvio:

```bash
docker compose up -d --build
```

Controllo e log:

```bash
curl http://localhost:5001/health
```

```bash
docker compose logs -f backend
```

Arresto (aggiungi `-v` per cancellare anche i dati del database di prova):

```bash
docker compose down
```

## Backend senza Docker (alternativa)

`server.js` legge il file `.env` dalla **radice del repository** (cartella sopra `BACKEND/`), non da `BACKEND/.env`.

```bash
cp BACKEND/.env.example .env
```

In `.env` imposta `MONGO_URI=mongodb://127.0.0.1:27017/tabletalk-test` e un `JWT_SECRET`, poi:

```bash
cd BACKEND && npm ci && npm run dev
```

## Frontend

```bash
cd FRONTEND/client
```

```bash
cp .env.development.example .env.development.local
```

```bash
npm ci --legacy-peer-deps
```

```bash
npm start
```

L'app si apre su http://localhost:3000 e, solo con `npm start`, usa l'API indicata in `REACT_APP_API_URL` (http://localhost:5001/api). `npm run build` (web e Android) resta invariato e punta alla produzione.

Nota: la ricerca degli indirizzi nel modulo dei pasti interroga direttamente dal browser il servizio pubblico OpenStreetMap/Nominatim.

## Utente admin di prova

La password deve avere almeno 12 caratteri; passala solo dalla riga di comando. Con Docker:

```bash
docker compose exec -e ADMIN_EMAIL=admin@example.test -e ADMIN_PASSWORD='scegli-una-password-lunga' backend node scripts/createAdmin.js
```

Senza Docker, dalla cartella `BACKEND/`:

```bash
MONGO_URI=mongodb://127.0.0.1:27017/tabletalk-test ADMIN_EMAIL=admin@example.test ADMIN_PASSWORD='scegli-una-password-lunga' node scripts/createAdmin.js
```

`ADMIN_EMAIL` è anche il destinatario delle email sulle segnalazioni.

## Comandi utili per le prove

Token di un utente (sostituisci email e password):

```bash
curl -s -X POST http://localhost:5001/api/auth/login -H 'Content-Type: application/json' -d '{"email":"admin@example.test","password":"scegli-una-password-lunga"}'
```

Id di un utente dal database di prova:

```bash
docker compose exec mongo mongosh tabletalk-test --quiet --eval 'db.users.findOne({email:"utente@example.test"},{_id:1})'
```

## Checklist di prova manuale

Usa due utenti normali (A e B) e l'admin. Ogni utente deve avere almeno 18 anni; nome e cognome solo con lettere non accentate (limite attuale del validatore).

- [ ] **Registrazione:** A e B si registrano ed entrano subito. L'email di verifica non parte senza SMTP: l'errore compare nei log, l'app resta utilizzabile.
- [ ] **Login:** logout e nuovo login di A; credenziali sbagliate danno un messaggio d'errore.
- [ ] **Creazione pasto:** A crea un pasto pubblico in presenza con indirizzo. Senza Firebase l'immagine non viene salvata e il pasto viene creato lo stesso. Il pasto compare nell'elenco.
- [ ] **Iscrizione:** B si iscrive al pasto pubblico di A e lo trova tra i suoi pasti.
- [ ] **Pasto privato:**
  - [ ] A crea un pasto privato e lo vede nell'elenco e nel dettaglio.
  - [ ] B non lo vede in elenco e sul dettaglio (URL copiato da A) riceve "Pasto non trovato".
  - [ ] B quindi non può iscriversi dall'app. Via API, `POST /api/meals/<id>/participants` con il token di B risponde 403 e B resta collegato.
- [ ] **Chat:**
  - [ ] Nel pasto pubblico A e B (partecipanti) si scrivono e vedono i messaggi in tempo reale.
  - [ ] Un terzo utente C non iscritto non vede la chat.
  - [ ] Via API: `curl -X POST http://localhost:5001/api/chats/<chatId>/messages -H 'Authorization: Bearer <token di C>' -H 'Content-Type: application/json' -d '{"content":"ciao"}'` risponde 403. Il `chatId` si legge dal dettaglio del pasto aperto da A.
- [ ] **Segnalazione:** B apre il profilo pubblico di A, menu ⋮ → Segnala, sceglie un motivo e invia. Esito atteso: messaggio di conferma; in `db.reports.find()` compare la segnalazione. L'email agli admin non parte senza SMTP.
- [ ] **Ban dall'admin:** con il token admin:

  ```bash
  curl -X PUT http://localhost:5001/api/users/<id di B>/status -H 'Authorization: Bearer <token admin>' -H 'Content-Type: application/json' -d '{"status":"banned","reason":"prova"}'
  ```

  - [ ] B, alla prima azione nell'app (o ricaricando), torna alla pagina di login con il messaggio "Il tuo account è stato bannito…".
  - [ ] Un nuovo login di B risponde con lo stesso messaggio.
  - [ ] L'admin che prova a bannare se stesso riceve 400.
  - [ ] Riattivazione: stesso comando con `"status":"active"`.
- [ ] **Recupero password:**
  - [ ] "Password dimenticata?" con l'email di A mostra il messaggio generico.
  - [ ] **Senza SMTP il link NON compare nei log:** l'invio fallisce, il token viene cancellato e nel database resta solo l'hash, quindi il flusso non si completa.
  - [ ] Per provarlo serve un server SMTP di prova locale (per esempio Mailpit) configurato con `SMTP_HOST`/`SMTP_PORT` in `.env.docker` (configurazione non verificata).
  - [ ] Con SMTP attivo: apri il link `http://localhost:3000/#/reset-password/<token>`. Una password debole (senza maiuscola o numero) viene rifiutata; con una valida si torna al login e la nuova password funziona.
