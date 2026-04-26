# Modifiche pronte da rivedere su Cursor — sessione 26 aprile 2026

Tutto è già scritto sul disco: Cursor mostrerà i file modificati nel diff. Apri questa lista, controlla ogni file in Source Control / Git tab, e committa quando sei a posto.

---

## FASE 1 — File modificati (4 file)

### 1. `capacitor.config.ts`
Commentato il blocco `server: { url, cleartext }` che faceva partire l'app dal Mac.
Per riattivare il live-reload in sviluppo basta scommentare 4 righe.

### 2. `FRONTEND/client/android/app/build.gradle`
- `versionCode: 37 → 38`
- `versionName: "1.1.10" → "1.2.5"`
Ora la versione è coerente con quanto pubblicato su Google Play (ultimo: 1.2.4 / 27).

### 3. `FRONTEND/client/android/app/src/main/AndroidManifest.xml`
- `android:usesCleartextTraffic: "true" → "false"`
Il backend è HTTPS, non c'è motivo di permettere HTTP.

### 4. `FRONTEND/client/.env.production`
Aggiunte 3 variabili Sentry per produzione (DSN, ENVIRONMENT=production, ENABLE_ERROR_MONITORING).
Così gli errori live non finiscono più taggati `development`.

---

## FASE 1bis — Sicurezze automatiche (1 file)

### 5. `FRONTEND/client/build-android-release-RENDER.sh`
Aggiunti due **pre-flight check** che bloccano il build se:
- `capacitor.config.ts` contiene ancora un `server.url` attivo
- `versionName` è ≤ 1.2.4 (l'ultimo pubblicato, costante in cima allo script da aggiornare a ogni release)

Aggiunta una nota in commento che chiarisce: lo script non tocca mai `ios/`.

### 6. `FRONTEND/client/capacitor.config.js`
Aggiunto un commento in testa che chiarisce: questo file è legacy/iOS, NON viene usato per il build Android. Per il build Android conta solo `/capacitor.config.ts` (root).

---

## FASE 2 — Spostamenti in `_ARCHIVE_DELETE_AFTER_REVIEW/`

**Nessuna cancellazione definitiva.** Tutto il materiale "snellito" è in una cartella di archivio nella root del progetto. Quando hai verificato che il build Android gira ancora, cancellala con:

```
rm -rf _ARCHIVE_DELETE_AFTER_REVIEW
```

Cosa contiene (124 MB totali da recuperare alla cancellazione):

| Origine | Contenuto | Note |
|---|---|---|
| `docs/` (33M dump + 9M residuo) | 4770 file di README/CHANGELOG estratti per sbaglio da node_modules | Nei "veri" `docs/` restano 64 file di progetto reali |
| `GOOGLE_PLAY_RELEASE/` (~70M) | 6 AAB vecchi (v21, v22, v24, v25 ×2, v26) | È rimasto solo v27 (l'ultimo pubblicato) + keystore + certificate_backup |
| `FRONTEND/client/` | `build-android-release-1.0.4.sh`, `1.1.0.sh`, `apk-direct.sh` | Script Android obsoleti. È rimasto `build-android-release-RENDER.sh` (quello attivo) e `build-ios-release.sh` |
| `FRONTEND/client/build/` | Build CRA del 10 gennaio | Sarà rigenerata con `npm run build` |
| root | `cleanup-app.sh` | Sostituito da `cleanup-ultra-light.sh` |
| root | File spurio `=` | Era output errato di `node --version` redirezionato |

---

## Cosa NON ho toccato (decisioni esplicite)

- **`ios/` (203 MB)** — lasciata dov'è come da tua scelta. È isolata dal flusso Android: il build script non la sincronizza mai. Se in futuro vorrai separarla in un repo gemello, basta `git mv ios ../TableTalk-iOS && git rm -rf ios`.
- **Codice di backend e frontend** — non toccato, niente refactor. Solo file di config e file ridondanti.
- **`node_modules/`** — non rimosso. Sono di sviluppo, non vanno toccati.
- **`BACKEND/uploads/`** — non toccato. Verifica tu se contiene runtime data o se andrebbe in .gitignore.

---

## Comandi di build (in ordine, da Cursor o terminale)

```bash
# 1. Vai nella cartella client
cd FRONTEND/client

# 2. Reinstalla le dipendenze (sicurezza)
npm install

# 3. Build di produzione React (legge .env.production)
npm run build

# 4. Sincronizza Capacitor con la cartella android/
npx cap sync android

# 5. Genera l'AAB firmato
cd android && ./gradlew bundleRelease && cd ..

# Oppure, in alternativa allo step 1-5, tutto-in-uno:
./build-android-release-RENDER.sh
```

L'AAB esce in:
```
FRONTEND/client/android/app/build/outputs/bundle/release/app-release.aab
```
e una copia con nome descrittivo viene salvata in `GOOGLE_PLAY_RELEASE/`.

---

## Test prima di caricare su Google Play

1. Installa l'AAB su un dispositivo reale via `bundletool` (o usa la "Internal Testing" track di Google Play, è la più rapida).
2. Verifica che l'app si apra senza errori e che chiami `https://tabletalk-app-backend.onrender.com/api`.
3. Apri Sentry e verifica che gli eventi nuovi arrivino con `environment: production`.
4. Solo dopo: carica su Google Play Console, traccia "Test interno" → poi "Test chiusi" → poi "Produzione".

---

## Recap della snellitura

| Voce | Prima | Dopo | Risparmio |
|---|---|---|---|
| `docs/` | 42 MB / 4834 file | 444 KB / 64 file | **-99%** |
| `GOOGLE_PLAY_RELEASE/` | 82 MB | 12 MB | -85% |
| Script di build duplicati | 5 | 2 | -60% |
| `build/` stale | presente | rigenerata | pulita |
| Repo root size (no node_modules, no archivio) | ~530 MB | ~365 MB | -31% |

Una volta cancellata `_ARCHIVE_DELETE_AFTER_REVIEW/` (124 MB), il repo è davvero **365 MB di cui 203 MB sono iOS** — quindi il "lato Android" è circa **160 MB**, di cui la maggior parte sono i `node_modules` di sviluppo.

Per andare oltre serve la **Fase 3** (lazy-load delle pagine pesanti, code-splitting del bundle, rimozione import inutilizzati) — quella è una sessione di refactor vero e va pianificata quando hai voglia di toccare il codice.
