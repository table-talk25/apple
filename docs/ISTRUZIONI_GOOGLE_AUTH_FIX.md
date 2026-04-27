# 🔧 Risoluzione Problema Google Auth

## ❌ PROBLEMA
L'app reindirizza al Google Play quando si clicca "Accedi con Google"

## 🔍 CAUSA
File `google-services.json` non corretto o mancante

## ✅ SOLUZIONE

### STEP 1: Scarica google-services.json corretto
1. Vai a [Firebase Console](https://console.firebase.google.com/)
2. Seleziona progetto: `steam-canto-466015-h5`
3. Vai a "Impostazioni progetto" > "Le tue app"
4. Trova l'app Android con package: `com.tabletalk.socialapp`
5. Scarica il `google-services.json` corretto

### STEP 2: Copia il file nelle posizioni corrette
```bash
# Copia in entrambe le cartelle:
cp google-services.json "/Users/ele/TableTalk APP /android/app/"
cp google-services.json "/Users/ele/TableTalk APP /FRONTEND/client/android/app/"
```

### STEP 3: Aggiungi SHA-1 fingerprint nella Google Console
1. Vai a [Google Cloud Console](https://console.cloud.google.com/)
2. Seleziona progetto: `steam-canto-466015-h5`
3. Vai a "API e servizi" > "Credenziali"
4. Trova OAuth 2.0 Client ID per Android
5. Aggiungi questa SHA-1 fingerprint:
   ```
   98:85:A6:21:4D:52:1B:E7:8E:DF:B1:4C:FA:6F:F3:C3:E5:FF:EB:52
   ```

### STEP 4: Ricompila l'app
```bash
cd "/Users/ele/TableTalk APP /FRONTEND/client"
npx cap build android
```

## 📝 VERIFICA
- Package name deve essere: `com.tabletalk.socialapp`
- Project ID deve essere: `steam-canto-466015-h5`
- SHA-1 fingerprint deve essere aggiunta nella Google Console
