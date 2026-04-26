# Audit flusso registrazione — 26 aprile 2026

Walkthrough end-to-end come se fossi un utente che apre l'app per la prima volta. Trovati **2 bug critici**, **3 problemi seri**, **1 dato GDPR mancante**.

## ESITO: 🔴 La registrazione **non funziona** in produzione. L'utente fa "Registrati", riceve un toast verde, ma all'ingresso in `/meals` l'app si rompe.

---

## 🔴 BUG CRITICO #1 — Token perso tra backend e frontend

**Cosa succede passo per passo:**

| Passo | Cosa fa il sistema | OK? |
|---|---|---|
| 1. Utente compila form e fa "Registrati" | `RegisterPage` → `useAuth().register(formData)` | ✅ |
| 2. `AuthContext.register` chiama `authService.register` | OK | ✅ |
| 3. `authService.register` POST `/auth/register` | OK, body include name, surname, email, password, confirmPassword, dateOfBirth, terms | ✅ |
| 4. Backend crea l'utente, hash password, **genera JWT**, manda email di verifica | OK | ✅ |
| 5. Backend risponde `{ success, token, user, message, requiresEmailVerification: true }` | OK | ✅ |
| 6. **`authService.register` butta via il token** e ritorna solo `{ success, message, user }` | **❌ BUG** |
| 7. `AuthContext.register` fa `setToken(data.token)` ma `data.token === undefined` | ❌ |
| 8. `AuthContext.register` **non chiama** `authPreferences.saveToken()` come fa il `login()` | ❌ |
| 9. `setIsAuthenticated(true)` + redirect a `/meals` | il flag è true ma il token su disco non c'è |
| 10. Prima chiamata API protetta → l'interceptor cerca il token in preferences → vuoto → 401 | App rotta |

**Origine:** `FRONTEND/client/src/services/authService.js` riga 26-39 — un commento dice `// 🔒 SICUREZZA: NON salviamo token né dati utente / L'utente deve verificare l'email prima di poter accedere`. Questo design contraddice il backend, che invece **manda subito il token**.

**Fix consigliato (semplice, ti rimette in piedi la registrazione):**
```js
// authService.js — funzione register
export const register = async (registrationData) => {
  const response = await apiClient.post('/auth/register', registrationData);

  // Salva token e user come fa il login
  if (response.data.token) {
    await authPreferences.saveToken(response.data.token);
    await authPreferences.saveUser(response.data.user);
  }

  return response.data; // contiene token, user, requiresEmailVerification
};
```

E in `AuthContext.register`:
```js
const register = async (d) => {
    const data = await authService.register(d);
    setUser(data.user);
    setToken(data.token);
    setIsAuthenticated(true);
};
```
(quest'ultimo è già scritto giusto, basta il fix nel service).

---

## 🔴 BUG CRITICO #2 — Pagina di verifica email non esiste sul frontend

L'email di verifica contiene un link tipo:
```
https://tabletalk-app-frontend.onrender.com/verify-email?token=abc123...
```
(URL costruito in `BACKEND/services/emailVerificationService.js` da `process.env.FRONTEND_URL`).

L'utente apre il link dal proprio client di posta → si apre il browser → l'app React carica → cerca la route `/verify-email` → **non esiste** in `App.js`.

Cade su `<Route path="*" element={<NotFoundPage />} />` → **utente vede 404**.

**Routes presenti** (`FRONTEND/client/src/App.js` righe 184-191):
```
/login, /register, /forgot-password, /reset-password/:token, /privacy,
/termini-e-condizioni, *=NotFound
```

Manca proprio `/verify-email`.

**Fix consigliato:** creare `pages/Auth/VerifyEmail/index.js` che legge il `token` dalla query, chiama `GET /api/auth/verify-email?token=...`, mostra successo/errore, link "Apri l'app" / "Vai al login". Aggiungere la route in `App.js`.

In più, su mobile è bene impostare le **App Links Android** (Capacitor `appLink`) così il link in email apre direttamente l'app installata. Per ora, è già abbastanza che la pagina web non dia 404.

---

## 🟠 Problema #3 — Verifica email "DISABILITATA PER TEST AI" nel backend

`BACKEND/controllers/authController.js` riga 119-122, in `getMe`:
```js
// 🔒 SICUREZZA: Verifica che l'email sia stata verificata (DISABILITATA PER TEST AI)
// if (!user.isEmailVerified) {
//     return next(new ErrorResponse('Account non verificato...', 403));
// }
```

Il check è **commentato**. Quindi:
- Il backend ti rilascia il token alla registrazione (vedi BUG #1)
- Anche se l'email non è verificata, `getMe` ti lascia entrare
- L'unica protezione è quella che il frontend si auto-impone (e che è rotta — vedi BUG #1)

**Conseguenza:** non c'è un vero gating per email verification. Va deciso adesso: lo vogliamo o no?

**Decisione consigliata per Google Play test:**
1. **NON** riattivare il check su `getMe` — bloccherebbe gli utenti di test prima di poter usare l'app
2. Far loggare l'utente subito dopo la registrazione (fix BUG #1)
3. Mostrare un banner "Conferma la tua email" non bloccante in cima all'app
4. Quando ci sentiremo pronti: bloccare azioni specifiche (creare un pasto, scrivere in chat) finché non verifica

---

## 🟠 Problema #4 — Consenso ai Termini e Privacy non viene salvato (problema GDPR/Google Play)

**Frontend:** `RegisterPage` raccoglie `formData.terms` (checkbox) e ti impedisce di submittare se non spuntato. ✅

**Backend:** `authController.register` destruttura solo `name, surname, email, password, dateOfBirth`. Il campo `terms` arriva nel body ma **viene ignorato e non salvato**. ❌

**Conseguenza per Google Play / GDPR:** la Play Console (e GDPR) richiede prova del consenso. Se un utente domani contesta "non ho mai accettato i termini", non hai un timestamp né un IP da mostrare.

**Fix consigliato (5 minuti):**
```js
// User.js — aggiungi al schema
termsAcceptedAt: { type: Date },
termsVersion: { type: String, default: '1.0' },
privacyAcceptedAt: { type: Date },
privacyVersion: { type: String, default: '1.0' },
```
```js
// authController.js — register
const { name, surname, email, password, dateOfBirth, terms } = req.body;
if (!terms) {
  return next(new ErrorResponse('Devi accettare termini e privacy per registrarti', 400));
}
const user = await User.create({
  name, surname, email, password, dateOfBirth,
  termsAcceptedAt: new Date(),
  privacyAcceptedAt: new Date(),
});
```

---

## 🟠 Problema #5 — `dateOfBirth` non validato dal validator backend

`BACKEND/middleware/validators/authValidator.js`: `registerValidation` controlla `name, surname, email, password, confirmPassword`. **Non controlla `dateOfBirth`**.

In pratica funziona perché lo schema Mongoose ha `required: true` + validator >= 18 anni, ma:
- Se l'utente manda dateOfBirth invalida arriva un errore Mongoose, non un messaggio user-friendly del validator
- Se l'utente non manda dateOfBirth proprio, finisce in `User.create` e crasha con un cast error

**Fix consigliato:**
```js
// authValidator.js
check('dateOfBirth', 'Data di nascita obbligatoria')
    .notEmpty()
    .isISO8601()
    .withMessage('Data di nascita non valida')
    .custom((value) => {
        const age = (Date.now() - new Date(value).getTime()) / (365.25 * 24 * 60 * 60 * 1000);
        if (age < 18) throw new Error('Devi avere almeno 18 anni');
        return true;
    }),
```

---

## 🟠 Problema #6 — Errori SMTP non visibili all'utente

In `authController.register`, l'invio email è in try/catch silenzioso: se SMTP fallisce, l'utente non lo sa e ricevevrà mai l'email.

Il `.env` ha credenziali SMTP Gmail (`smtp.gmail.com`, user `infotabletalk.app@gmail.com`, password app). Se Render non ha le stesse env vars settate sulla dashboard, l'invio crash silenziosamente.

**Fix consigliato:**
- Verifica su Render Dashboard che `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `EMAIL_FROM` siano valorizzate
- Aggiungi un health-check endpoint `/api/health/email` che fa un test SMTP — utile per il monitoring
- Se l'invio fallisce in prod, nel campo `requiresEmailVerification` del response setta `false` o aggiungi `emailDeliveryFailed: true` così il frontend può mostrare "non abbiamo potuto inviarti l'email, contatta supporto"

---

## ✅ Cose che invece funzionano

- Schema User con validazione age >=18 ✓
- Hash bcrypt della password (pre-save middleware) ✓
- JWT generation con expiry 7d ✓
- Rate limiter su register: 5 tentativi/ora per IP ✓
- Validator password complessa (8+ char, maiuscola, minuscola, numero, speciale) ✓
- Email duplicate gestite con messaggio specifico ✓
- Validazione age client-side prima del submit ✓
- Login attempts e account lock dopo 5 tentativi falliti ✓

---

## Piano di azione consigliato (in ordine)

| # | Cosa fare | Tempo | Bloccante? |
|---|---|---|---|
| 1 | Fix `authService.register` per salvare il token | 5 min | 🔴 SÌ |
| 2 | Creare pagina `/verify-email` nel frontend | 30 min | 🔴 SÌ (l'utente vede 404) |
| 3 | Salvare `termsAcceptedAt` lato backend | 10 min | 🟠 GDPR |
| 4 | Aggiungere validator `dateOfBirth` | 5 min | 🟠 robustezza |
| 5 | Verificare SMTP env vars su Render | 5 min | 🟠 reale invio email |
| 6 | Decidere se enforce email verification | discussione | 🟢 strategia |

I primi 2 sono i veri bloccanti per il test su Google Play. Senza il fix #1, l'utente non riesce neanche a entrare in app dopo la registrazione.

---

## Domanda strategica per te

Per il test Google Play, **come vuoi gestire la verifica email?**

**Opzione A — Soft (consigliata per test):** dopo registrazione l'utente è subito dentro, vede un banner "Conferma email" non bloccante. Niente azioni bloccate. Massimo "lasciamo testare".

**Opzione B — Strict:** dopo registrazione l'utente vede una schermata "Controlla la tua email", non può fare niente finché non clicca il link. Più professionale ma se SMTP non gira, il tester si blocca.

**Opzione C — Mista:** dentro subito, ma alcune azioni (creare pasto, mandare messaggi) bloccate finché non verifica. Più complesso da implementare.

Una volta scelto, ti faccio i fix #1 e #2 di conseguenza.
