# 🗺️ Guida per Identificare la Tua App sui Servizi Google

## 📱 IDENTIFICATORI PRINCIPALI DELLA TUA APP

### 🔑 **Dati Chiave:**
- **Package Name/App ID**: `com.tabletalk.socialapp`
- **Nome App**: `TableTalk - mEat Together`
- **Server Client ID Google**: `534454809499-4vsllugc4jbuft2n20p5sakupvvdcjrb.apps.googleusercontent.com`
- **SHA-1 Release**: `EA:39:B0:9F:B6:44:05:CF:30:30:88:F5:19:B6:B3:D7:BA:B3:C9:FC`
- **SHA-1 Debug**: `98:85:A6:21:4D:52:1B:E7:8E:DF:B1:4C:FA:6F:F3:C3:E5:FF:EB:52`

---

## 🎮 **1. GOOGLE PLAY CONSOLE**
**URL**: [https://play.google.com/console](https://play.google.com/console)

### Come riconoscere la tua app:
- ✅ **Nome**: `TableTalk - mEat Together`
- ✅ **Package name**: `com.tabletalk.socialapp`
- ✅ **Bundle ID**: `com.tabletalk.socialapp`

### Cosa fare:
1. Accedi alla Play Console
2. Cerca l'app con nome "TableTalk - mEat Together"
3. Verifica che il package name sia `com.tabletalk.socialapp`

---

## 🔥 **2. FIREBASE CONSOLE**
**URL**: [https://console.firebase.google.com](https://console.firebase.google.com)

### Come riconoscere il tuo progetto:
- ✅ **Cerca un progetto** che contenga un'app Android
- ✅ **Package name dell'app Android**: `com.tabletalk.socialapp`
- ✅ **Nome app**: `TableTalk - mEat Together`

### Cosa fare:
1. Accedi a Firebase Console
2. Guarda tutti i tuoi progetti
3. Entra in ogni progetto e vai a "Impostazioni progetto" > "Le tue app"
4. Trova quello con l'app Android che ha package `com.tabletalk.socialapp`
5. **SCARICA IL google-services.json** da questo progetto

---

## ☁️ **3. GOOGLE CLOUD CONSOLE**
**URL**: [https://console.cloud.google.com](https://console.cloud.google.com)

### Come riconoscere il tuo progetto:
- ✅ **Stesso Project ID** del progetto Firebase trovato sopra
- ✅ **Client ID nelle credenziali**: `534454809499-4vsllugc4jbuft2n20p5sakupvvdcjrb.apps.googleusercontent.com`

### Cosa fare:
1. Accedi a Google Cloud Console
2. Seleziona il progetto con lo stesso ID di Firebase
3. Vai a "API e servizi" > "Credenziali"
4. Trova il Client ID OAuth 2.0 per Android
5. **AGGIUNGI LE SHA-1 FINGERPRINTS**:
   - Release: `EA:39:B0:9F:B6:44:05:CF:30:30:88:F5:19:B6:B3:D7:BA:B3:C9:FC`
   - Debug: `98:85:A6:21:4D:52:1B:E7:8E:DF:B1:4C:FA:6F:F3:C3:E5:FF:EB:52`

---

## ✅ **CHECKLIST FINALE**

### 1. Firebase Console:
- [ ] Trovato progetto con app Android `com.tabletalk.socialapp`
- [ ] Scaricato `google-services.json` corretto
- [ ] Copiato in `/Users/ele/TableTalk APP /FRONTEND/client/android/app/`

### 2. Google Cloud Console:
- [ ] Stesso progetto di Firebase
- [ ] Trovato OAuth Client ID: `534454809499-4vsllugc4jbuft2n20p5sakupvvdcjrb.apps.googleusercontent.com`
- [ ] Aggiunta SHA-1 Release: `EA:39:B0:9F:B6:44:05:CF:30:30:88:F5:19:B6:B3:D7:BA:B3:C9:FC`
- [ ] Aggiunta SHA-1 Debug: `98:85:A6:21:4D:52:1B:E7:8E:DF:B1:4C:FA:6F:F3:C3:E5:FF:EB:52`

### 3. Google Play Console:
- [ ] App `TableTalk - mEat Together` con package `com.tabletalk.socialapp`
- [ ] Versione attuale: v21 (1.1.8)

---

## 🚨 **IMPORTANTE**
**TUTTI E TRE I SERVIZI** devono avere lo **STESSO PROJECT ID** e le **STESSE CREDENZIALI** per funzionare correttamente!

