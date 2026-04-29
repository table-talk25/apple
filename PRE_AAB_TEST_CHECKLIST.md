# Checklist test funzionale pre-AAB

URL web da usare: `https://tabletalk-app-frontend.onrender.com`
Tieni F12 aperta su tab **Console** e **Network** durante tutto il giro per beccare errori silenziosi (warning JavaScript, chiamate API rosse).

Usa **due account** di test: `tester-host@gmail.com` (quello che organizza pasti) e `tester-guest@gmail.com` (quello che si iscrive). Così simuli interazioni reali.

---

## 🔴 PRIORITÀ A — Core flow (deve funzionare)

Senza questi, l'app non ha senso pubblicare. Testa **per primi**.

### A1 — Profilo
- [ ] Apri `/impostazioni/profilo` da utente nuovo (post-registrazione, profilo vuoto)
- [ ] Header dice **"Benvenuto!"** (non "Modifica Profilo")
- [ ] Compila nickname (≥3 char), bio (≥10 char), almeno 1 interesse
- [ ] Salva → header sparisce, `profileCompleted: true` in MongoDB
- [ ] Carica una foto profilo → si vede dopo upload + dopo refresh
- [ ] Modifica genere/residenza/preferred cuisine → si salvano
- [ ] Aggiungi lingue parlate → si salvano

### A2 — Creazione Pasto (MealForm)
- [ ] Da `/meals` → bottone **"Crea pasto"** (visibile solo se profilo completo)
- [ ] Compila titolo, data futura, indirizzo, descrizione, max partecipanti, tipo pasto
- [ ] Submit → toast verde, pasto creato, redirect a dettaglio o lista
- [ ] Verifica su `/meals/:id`: dati visualizzati corretti, host = tu
- [ ] Lista `/meals` mostra il tuo pasto in cima (più recenti)
- [ ] Modifica un pasto già creato → salva → cambi visibili
- [ ] Cancella un pasto → toast verde, scompare dalla lista, rimossa anche dal DB

### A3 — Iscrizione a Pasto (con secondo account)
- [ ] Logout, login col secondo account (guest)
- [ ] Vai su `/meals` → vedi il pasto creato dal primo account
- [ ] Apri dettaglio pasto → bottone **"Partecipa"** o **"Richiedi di partecipare"**
- [ ] Invia richiesta → toast verde
- [ ] Logout, login col primo account (host)
- [ ] Notifica nuova richiesta join (in-app o badge sul bottone)
- [ ] Accetta richiesta → toast verde
- [ ] Logout, login guest → vedi il pasto in `/my-meals` come partecipante

### A4 — Visualizzazione liste e search
- [ ] `/meals` mostra tutti i pasti pubblici futuri
- [ ] `/meals/search` (se esiste): filtri funzionano (data, tipo, città)
- [ ] `/my-meals` mostra solo pasti dove sei host o partecipante
- [ ] Pasti nel passato gestiti correttamente (storia / non visibili / etichetta "concluso")

---

## 🟠 PRIORITÀ B — Comunicazione (importante)

### B1 — Chat
- [ ] Apri chat di un pasto a cui partecipi
- [ ] Scrivi e invia messaggio → appare subito nella conversazione
- [ ] Logout/login con altro account partecipante → vedi il messaggio
- [ ] Risposta dall'altro account arriva (live via socket OR refresh)
- [ ] Caratteri speciali / emoji → renderizzati correttamente
- [ ] Scroll automatico al bottom su nuovo messaggio

### B2 — Notifiche in-app
- [ ] Icona campanella in Navbar mostra badge se hai notifiche
- [ ] Click → dropdown / pagina con lista notifiche
- [ ] Tipi di notifica generati: nuovo messaggio chat, richiesta join, accettazione join, invito
- [ ] Click su notifica → porta alla pagina giusta (chat, pasto, profilo dell'utente)
- [ ] Marca come lette → badge si aggiorna

### B3 — Inviti diretti
- [ ] Da pagina pasto, invita un utente specifico
- [ ] L'utente invitato vede l'invito nella sua pagina invitazioni
- [ ] Accetta/rifiuta funziona, status si aggiorna
- [ ] Notifica push generata (controlleremo in Fase B su Android)

### B4 — Gestione utenti
- [ ] Vai sul profilo pubblico di un altro utente
- [ ] Bottone **"Blocca"** funziona → l'utente bloccato non vede più i tuoi pasti pubblici
- [ ] Sblocca → torna visibile
- [ ] Bottone **"Segnala"** apre un form report → submit funziona

---

## 🟢 PRIORITÀ C — Feature secondarie (nice-to-have)

### C1 — Mappa
- [ ] Vai su `/map` (richiede profilo completo)
- [ ] Mappa Leaflet si carica
- [ ] Marker sui pasti pubblici futuri con coordinate
- [ ] Click su marker → popup con titolo + bottone vai a dettaglio
- [ ] Filtro raggio chilometri (se presente) funziona
- [ ] Geolocalizzazione browser (sull'web): chiede permessi, centra mappa sulla tua posizione

### C2 — AI Recommendations
- [ ] Sulla `/` (Home) c'è una sezione "Pasti consigliati per te"
- [ ] Vengono mostrati pasti effettivamente filtrati per i tuoi interessi
- [ ] Click su raccomandazione → apre dettaglio pasto
- [ ] Sezione non rompe la pagina se backend AI è giù (fallback grazioso)

### C3 — Video Call
- [ ] Da chat di un pasto attivo → bottone "Video chiamata"
- [ ] Permessi camera/microfono richiesti dal browser
- [ ] Twilio video stream parte (vedi tuo video preview)
- [ ] Altro partecipante entra → entrambi i video visibili
- [ ] Mute/unmute audio funziona, camera on/off funziona
- [ ] Termina chiamata → torna alla chat

---

## 🔵 PRIORITÀ D — Edge cases & admin

### D1 — i18n
- [ ] Cambia lingua dal menu (top right): IT/EN/FR/ES/DE/ZH/JA/AR
- [ ] Tutti i testi della pagina cambiano (label form, bottoni, messaggi errore)
- [ ] Niente chiavi i18n letterali tipo `"auth.something"` visibili (il fix di noAccount sappiamo che è ok in tutte le lingue)
- [ ] RTL (arabo) → layout si specchia correttamente

### D2 — Privacy & Terms
- [ ] `/privacy` → pagina rendered, testo presente
- [ ] `/termini-e-condizioni` → idem
- [ ] Link da footer e da form registrazione funzionano

### D3 — Admin pages (se sei admin)
- [ ] `/AdminTranslationDashboard` (o simile) → dashboard accessibile solo a `role: admin`
- [ ] `/AdminLeaveReports` → vedi report inviati dagli utenti
- [ ] Setup admin (se esiste): primo utente → admin auto

### D4 — Errori gestiti
- [ ] Apri `/url-che-non-esiste` → NotFoundPage rendered
- [ ] Backend giù temporaneamente → toast errori chiari, niente alert nativi browser
- [ ] Rete offline → app non crasha, mostra avvisi gentili

### D5 — Logout & Delete account
- [ ] Logout → token rimosso da localStorage, redirect a `/login`
- [ ] Riapri app → niente sessione automatica
- [ ] **Cancella account** (impostazioni profilo) → conferma password, account rimosso da DB, tutti i pasti dell'host cancellati, partecipazioni rimosse

---

## Come procedere

Suggerisco di fare **A1, A2, A3, A4 prima di tutto** (~30 min) — sono il core dell'app. Se anche solo uno di questi è rotto, l'AAB non serve.

Poi sali a **B1, B2, B3** per la parte social (~20 min).

C e D li fai con calma. Quelli che vedi rotti, mandami screenshot della pagina + la riga rossa nella console DevTools.

## Cosa segnalare

Per ogni bug che trovi, fammi avere **3 cose**:
1. **Pagina e azione**: "ero su /meals/123, ho cliccato Partecipa"
2. **Cosa è successo**: "non è apparso niente, nessun toast, nessuna chiamata API in Network"
3. **Cosa ti aspettavi**: "toast verde + status del pasto cambiato"

Screenshot della console DevTools quando c'è una riga rossa (errore) o gialla (warning) aiuta tantissimo.
