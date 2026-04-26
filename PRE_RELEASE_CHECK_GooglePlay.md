# Controllo pre-rilascio Google Play — TableTalk

Data controllo: 26 aprile 2026
Ultimo AAB caricato: `TableTalk-v27-1.2.4-TOKEN-FIX-20251113-152854.aab` (versionCode 27, versionName 1.2.4)

## ESITO: 🔴 NO-GO — non pubblicare prima di aver risolto i 2 bloccanti.

---

## 🔴 Bloccanti (da risolvere prima di buildare l'AAB)

### 1. `capacitor.config.ts` (cartella root) — live reload ancora attivo
File: `capacitor.config.ts` righe 7–12

```ts
server: {
  url: 'http://192.168.1.57:3000', // IP del tuo Mac sulla rete locale
  cleartext: true
}
```

In release questo blocco fa partire l'app puntando al tuo Mac → l'app non funziona fuori dalla tua rete locale. Il commento nel file lo dice già.

**Azione:** rimuovi tutto il blocco `server: { ... }` (oppure togli almeno `url` e `cleartext`). Il build di produzione deve usare la WebView locale, non un URL remoto in HTTP.

### 2. `versionName` in regressione
File: `FRONTEND/client/android/app/build.gradle` righe 17–18

```
versionCode 37
versionName "1.1.10"
```

- `versionCode 37` va bene (> 27 dell'ultima release) ✅
- `versionName "1.1.10"` è **più basso** di "1.2.4" già pubblicato ❌. Google Play tecnicamente lo accetta (controlla solo versionCode), ma per gli utenti la versione apparirebbe in retromarcia. Sospetto sia una svista del merge.

**Azione:** porta `versionName` ad almeno `"1.2.5"` (o quello che ha senso rispetto all'ultima release).

---

## 🟠 Importanti (consigliati ma non bloccano l'upload)

### 3. `AndroidManifest.xml` — `usesCleartextTraffic="true"`
File: `FRONTEND/client/android/app/src/main/AndroidManifest.xml` riga 10

Il backend è HTTPS (`tabletalk-app-backend.onrender.com`), quindi non serve cleartext. Il pre-launch report di Google lo segnala come avviso di sicurezza.

**Azione:** togli `android:usesCleartextTraffic="true"` o mettilo a `"false"`.

### 4. `FRONTEND/client/.env` punta a localhost
```
REACT_APP_API_URL=http://localhost:5001/api
REACT_APP_SENTRY_ENVIRONMENT=development
```

Su un build CRA con `npm run build` viene caricato anche `.env.production` (che è corretto: punta a Render), e `.env.production` ha priorità in produzione → quindi l'URL API finale è quello giusto. Però:
- `REACT_APP_SENTRY_ENVIRONMENT=development` rimane: gli errori in produzione finiranno taggati "development" su Sentry.
- Se per errore generi il build con `NODE_ENV` non a `production`, beccheresti localhost.

**Azione:** aggiungi `REACT_APP_SENTRY_ENVIRONMENT=production` in `FRONTEND/client/.env.production`. Costruisci sempre con `npm run build` (non `start`).

### 5. La cartella `build/` è del 10 gennaio
La WebView dentro l'AAB usa `FRONTEND/client/build/`. È vecchia di mesi.

**Azione:** prima di generare l'AAB, esegui in `FRONTEND/client/`:
```
npm run build
npx cap sync android
```

### 6. `key.properties` con password in chiaro
File: `FRONTEND/client/android/key.properties` — `storePassword` e `keyPassword` sono `TableTalk2024`.
È in `.gitignore` quindi non finisce su GitHub, ma comunque considera di ruotare le password e tenerle fuori dal repo locale (es. variabili d'ambiente nello script di build).

---

## 🟢 OK / cose già a posto

- `applicationId = com.tabletalk.socialapp` — combacia con la app su Google Play ✓
- `signingConfig.release` correttamente collegata al `buildTypes.release` ✓
- `keystore` (`tabletalk-release-key.keystore`) e `key.properties` presenti ✓
- `compileSdk 35` / `targetSdk 35` — rispetta la policy Google Play 2026 ✓
- `minifyEnabled false` + `shrinkResources false`: niente rischio di proguard rotti ✓
- `debuggable false`, `jniDebuggable false` nel buildType release ✓
- `multiDexEnabled true` ✓
- `google-services.json` presente in `FRONTEND/client/android/app/` ✓
- `.gitignore` copre `.env`, `*.keystore`, `key.properties`, `GOOGLE_PLAY_RELEASE/` ✓
- Permessi Android: tutti giustificati (camera, geo, push, audio per videochiamata) — pronto per dichiararli su Play Console ✓

---

## ⚠️ Da chiarire (non urgente, ma evita confusione futura)

C'è un secondo file Capacitor: `FRONTEND/client/capacitor.config.js` con un altro `appId`:

| File | appId |
|---|---|
| `capacitor.config.ts` (root) | `com.tabletalk.socialapp` |
| `FRONTEND/client/capacitor.config.js` | `io.tabletalk.app` |

L'Android in uso è `com.tabletalk.socialapp` (corretto, è quello pubblicato). Il file in FRONTEND/client probabilmente è quello usato per iOS / build storici. Verifica quale Capacitor CLI carica davvero quando lanci `npx cap sync`: deve essere quello root con `com.tabletalk.socialapp`.

---

## Checklist veloce prima di lanciare il build

```
[ ] Rimosso il blocco server.url + cleartext da capacitor.config.ts
[ ] versionName aggiornato a 1.2.5 (o superiore) in android/app/build.gradle
[ ] versionCode incrementato (es. 38) in android/app/build.gradle
[ ] Tolto usesCleartextTraffic da AndroidManifest.xml
[ ] REACT_APP_SENTRY_ENVIRONMENT=production in .env.production
[ ] cd FRONTEND/client && npm run build
[ ] npx cap sync android
[ ] Generato AAB firmato (Android Studio o gradlew bundleRelease)
[ ] Test su dispositivo reale prima di caricare su Play Console
```
