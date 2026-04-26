# Fix flusso registrazione — pronti per review in Cursor

Strategia scelta: **Soft** — l'utente entra in app subito dopo la registrazione, banner non bloccante "Conferma email" finché non clicca il link.

## Cosa è cambiato (9 file)

### Frontend (5 file)

#### 1. `FRONTEND/client/src/services/authService.js` ✏️ MODIFICATO
**Prima:** dopo `POST /auth/register`, scartava token e user, ritornava un oggetto custom. L'utente non veniva mai loggato → primo redirect su `/meals` falliva con 401.

**Adesso:**
```js
export const register = async (registrationData) => {
  const response = await apiClient.post('/auth/register', registrationData);
  if (response.data && response.data.token) {
    await authPreferences.saveToken(response.data.token);
    await authPreferences.saveUser(response.data.user);
    suppressAlertsFor(4000);
    await sendPendingFcmToken();
  }
  return response.data;
};
```

Inoltre, **bug minore corretto** in `verifyEmail`: usava `apiClient.post(\`/auth/verify-email/${token}\`)` ma il backend espone `GET /auth/verify-email?token=...`. Adesso allineato a `GET` con query string.

#### 2. `FRONTEND/client/src/pages/Auth/VerifyEmail/index.js` ➕ NUOVO
Pagina che riceve il click dal link nell'email. Gestisce 4 stati: loading, success, error, missing-token. Se l'utente è già loggato in browser, aggiorna `user.isEmailVerified` nel context. Stile coerente con la palette dell'app (gradient viola).

#### 3. `FRONTEND/client/src/App.js` ✏️ MODIFICATO
Aggiunto import lazy + route:
```js
const VerifyEmailPage = lazy(() => import('./pages/Auth/VerifyEmail'));
// ...
<Route path="/verify-email" element={<VerifyEmailPage />} />
```

#### 4. `FRONTEND/client/src/components/layout/EmailVerificationBanner/index.js` ➕ NUOVO
Banner giallo non bloccante. Si mostra solo se: utente loggato + `isEmailVerified === false` + non chiuso dall'utente. Bottone **Reinvia email** che chiama `POST /auth/resend-verification`. Bottone × per nascondere temporaneamente.

#### 5. `FRONTEND/client/src/components/layout/Layout/index.js` ✏️ MODIFICATO
Banner inserito subito sotto la `<Navbar />`, prima di `<main>`.

---

### Backend (4 file)

#### 6. `BACKEND/models/User.js` ✏️ MODIFICATO
Aggiunti campi GDPR nello schema:
```js
termsAcceptedAt: { type: Date },
termsVersion: { type: String, default: '1.0' },
privacyAcceptedAt: { type: Date },
privacyVersion: { type: String, default: '1.0' },
registrationIp: { type: String },
```

Servono per dimostrare il consenso a Termini/Privacy in caso di contestazione (richiesto da Google Play e GDPR).

#### 7. `BACKEND/controllers/authController.js` ✏️ MODIFICATO
La `register` ora:
- Estrae `terms` dal body e lo richiede esplicitamente (HTTP 400 se mancante)
- Salva `termsAcceptedAt`, `privacyAcceptedAt` con timestamp del momento della registrazione
- Salva `registrationIp` dal `req.ip`/`x-forwarded-for`

#### 8. `BACKEND/middleware/validators/authValidator.js` ✏️ MODIFICATO
Aggiunti due check al `registerValidation`:
- `dateOfBirth`: obbligatoria, formato ISO8601, età ≥18 e ≤120
- `terms`: deve essere `true`

Adesso un POST malformato dà errori user-friendly invece di un cast Mongoose.

#### 9. `BACKEND/server.js` ✏️ MODIFICATO
Aggiunto endpoint diagnostico:
```
GET /health/email
```
Verifica la connessione SMTP. Se ti risponde 200, le email partono. Se 500, la response include esattamente quale env var manca su Render. Da chiamare una volta dopo ogni deploy come smoke test.

---

## Cosa fare ora su Cursor

```bash
# Opzionale ma consigliato: vedi i diff
git status
git diff --stat

# Quando sei contento:
git add -A
git commit -m "fix: registration flow + email verify page + GDPR consent"
```

## Cosa testare prima di buildare l'AAB

| # | Cosa | Come | Esito atteso |
|---|---|---|---|
| 1 | Backend: SMTP funziona | `curl https://tabletalk-app-backend.onrender.com/health/email` | `{"status":"ok",...}` |
| 2 | Backend: validatore terms blocca | `curl -X POST .../api/auth/register -d '{"name":"X",...,"terms":false}'` | 400 + messaggio |
| 3 | Backend: validatore età blocca | POST con `dateOfBirth` di un 17enne | 400 con "Devi avere almeno 18 anni" |
| 4 | Backend: registrazione salva consenso | dopo registrazione, su Mongo verifica `termsAcceptedAt` valorizzato | timestamp presente |
| 5 | Frontend web: pagina /verify-email | apri `https://tabletalk-app-frontend.onrender.com/verify-email?token=fake` | non più 404, vedi "Verifica non riuscita" |
| 6 | Frontend web: registrazione | crea un account di test | dopo submit vai diretto a /meals + banner giallo "Conferma email" in cima |
| 7 | Frontend web: bottone reinvia | clicca "Reinvia email" nel banner | toast verde "Email inviata" + email arriva |
| 8 | Frontend web: link email | clicca il link nell'email ricevuta | pagina success "✅ Email confermata" + banner sparisce dopo refresh |

Se i punti 1-8 girano sulla web app, allora il build mobile funzionerà uguale.

## Cosa NON ho cambiato

- **`getMe` con check `isEmailVerified` rimane disabilitato.** Coerente con la strategia Soft. Se in futuro vuoi passare a "Strict" o "Mista", basta riattivare quel `if` e modificare il banner di conseguenza.
- **i18n delle stringhe nuove (banner, pagina /verify-email).** Sono in italiano hard-coded. Se vuoi tradurle, vanno aggiunte ai `locales/*.json` — operazione successiva.
- **Endpoint frontend del verify email che chiama il backend.** Il backend espone `GET /api/auth/verify-email?token=...` e il client lo chiama via `apiClient.get('/auth/verify-email', { params: { token } })`. Questo rispetta sia il routing del backend che il prefisso `/api` di `apiClient`.

## Eventuali residui per dopo Google Play

- **App Links Android** (deep link `https://tabletalk-app-frontend.onrender.com/verify-email` → apri direttamente l'app installata). Capacitor lo supporta nativamente, va configurato in `AndroidManifest.xml` + `capacitor.config.ts`. Oggi il link in email apre il browser, l'utente vede la pagina di conferma sul web e può tornare manualmente in app — funziona, ma è meno fluido.
- **Versionamento Termini/Privacy.** I campi `termsVersion`/`privacyVersion` sono già nello schema. Quando aggiornerai i documenti legali, basta cambiare il default e gli utenti esistenti ti faranno il consenso al prossimo accesso (logica da implementare).
