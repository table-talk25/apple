# ✅ Checklist Pratica per Pubblicazione Apple Store

## 📋 Preparazione Tecnica (COMPLETATO ✅)

- [x] Versione allineata: 1.1.9
- [x] Bundle ID configurato: `io.tabletalk.app`
- [x] Info.plist configurato con permessi
- [x] Privacy Manifest creato (da aggiungere al progetto Xcode)
- [x] Script di build pronto

## 🔧 Passi da Completare in Xcode

### 1. **Aggiungi il Privacy Manifest al Progetto**
   - Apri Xcode: `open ios/App/App.xcworkspace`
   - Clicca destro sulla cartella `App` nel navigator
   - Seleziona "Add Files to App..."
   - Seleziona `PrivacyInfo.xcprivacy`
   - ✅ Assicurati che sia selezionato "Copy items if needed"
   - ✅ Assicurati che sia aggiunto al target "App"

### 2. **Configura il Team di Sviluppo**
   - Seleziona il progetto "App" nella barra laterale
   - Seleziona il target "App"
   - Vai su "Signing & Capabilities"
   - Seleziona il tuo **Apple Developer Team**
   - Verifica che il Bundle ID sia: `com.tabletalk.socialapp`
   - Xcode dovrebbe gestire automaticamente i certificati

### 3. **Imposta la Destinazione**
   - Nella barra superiore, cambia da "iOS Simulator" a **"Any iOS Device"**
   - ⚠️ **IMPORTANTE**: Senza questa impostazione non puoi creare un Archive

### 4. **Verifica le Impostazioni**
   - **Version**: 1.1.9 (dovrebbe essere già corretto)
   - **Build**: 1 (incrementa per ogni nuova build)
   - **Bundle Identifier**: com.tabletalk.socialapp

## 🚀 Build e Archive

### Passo 1: Build dell'App
Esegui lo script di build (dalla directory `FRONTEND/client`):
```bash
./build-ios-release.sh
```

Questo script:
- ✅ Costruisce l'app React
- ✅ Sincronizza Capacitor
- ✅ Installa le dipendenze CocoaPods

### Passo 2: Crea l'Archive in Xcode
1. Apri Xcode: `open ios/App/App.xcworkspace`
2. Assicurati che la destinazione sia "Any iOS Device"
3. Vai su **Product → Archive**
4. ⏳ Aspetta che il processo sia completato (può richiedere alcuni minuti)
5. L'Organizer si aprirà automaticamente

### Passo 3: Verifica l'Archive
- ✅ Controlla che l'archive sia stato creato correttamente
- ✅ Verifica la versione (1.1.9)
- ✅ Verifica il build number

## 📤 Upload su App Store Connect

### Passo 1: Distribuisci l'App
1. Nell'Organizer, seleziona l'archive appena creato
2. Clicca su **"Distribute App"**
3. Seleziona **"App Store Connect"**
4. Clicca **"Next"**

### Passo 2: Opzioni di Upload
- ✅ Seleziona **"Upload"** (non "Export")
- ✅ Spunta **"Include bitcode"** (raccomandato)
- ✅ Spunta **"Upload your app's symbols"** (per crash reporting)
- Clicca **"Next"**

### Passo 3: Firma dell'App
- ✅ Seleziona **"Automatically manage signing"**
- Clicca **"Next"**

### Passo 4: Riepilogo e Upload
- ✅ Verifica tutte le impostazioni
- Clicca **"Upload"**
- ⏳ Aspetta che l'upload sia completato

## 🏪 Configurazione App Store Connect

### 1. Accedi a App Store Connect
- Vai su [appstoreconnect.apple.com](https://appstoreconnect.apple.com)
- Accedi con il tuo Apple ID

### 2. Crea l'App (se non esiste già)
- Clicca su **"My Apps"**
- Clicca su **"+"** → **"New App"**
- Compila:
  - **Platforms**: iOS
  - **Name**: TableTalk Social
  - **Primary language**: Italiano
  - **Bundle ID**: com.tabletalk.socialapp
  - **SKU**: TABLETALK001

### 3. Configura le Informazioni dell'App

#### App Information
- **Name**: TableTalk Social
- **Subtitle**: Connetti con amici e ristoranti
- **Keywords**: social, ristoranti, amici, cibo, networking
- **Description**: (vedi GUIDA_APPLE_STORE.md per la descrizione completa)

#### Support URL
- **Support URL**: https://tabletalk.app/support
- **Marketing URL**: https://tabletalk.app

#### Privacy Policy URL
- **Privacy Policy URL**: https://table-talk25.github.io/tabletalk-privacy/
- ⚠️ **IMPORTANTE**: Questo URL deve essere accessibile e contenere la privacy policy

### 4. Carica le Screenshot
Apple richiede screenshot per diverse dimensioni:
- **iPhone 6.7" Display** (iPhone 14 Pro Max, 15 Pro Max): 1290 x 2796 pixel
- **iPhone 6.5" Display** (iPhone 11 Pro Max, XS Max): 1242 x 2688 pixel
- **iPhone 5.5" Display** (iPhone 8 Plus, 7 Plus): 1242 x 2208 pixel

**Come creare gli screenshot:**
1. Avvia l'app nel simulatore iOS
2. Usa `Cmd + S` per salvare lo screenshot
3. Assicurati di avere 3-5 screenshot per ogni dimensione
4. Mostra le funzionalità principali dell'app

### 5. Configura le Categorie
- **Primary Category**: Social Networking
- **Secondary Category**: Food & Drink

### 6. Imposta il Prezzo
- **Price**: Free
- **Availability**: All Countries

### 7. Informazioni per la Revisione
- **Contact Information**: Compila i tuoi dati
- **Demo Account** (se necessario):
  - Username: demo@tabletalk.app
  - Password: demo123
  - Notes: Account demo per la revisione

### 8. Privacy Labels
Configura le etichette privacy in base ai dati che raccogli:
- **Data Used to Track You**: Location, Identifiers, Usage Data
- **Data Linked to You**: Contact Info, Photos/Videos, Location
- **Data Not Linked to You**: Analytics

## 🔒 Export Compliance

Quando carichi l'build, Apple chiederà informazioni sull'export compliance:
- **Does your app use encryption?**: Seleziona "No" (l'app usa HTTPS standard, non criptazione personalizzata)
- Oppure compila il modulo se usi criptazione personalizzata

## 📝 Invio per la Revisione

### Checklist Finale Prima dell'Invio
- [ ] Archive creato e caricato su App Store Connect
- [ ] Informazioni dell'app complete
- [ ] Screenshot caricati per tutte le dimensioni richieste
- [ ] Privacy policy URL configurato e accessibile
- [ ] Demo account fornito (se necessario)
- [ ] Privacy labels configurate
- [ ] Export compliance completato
- [ ] Versione corretta (1.1.9)

### Invio
1. Clicca su **"Save"** per salvare tutte le modifiche
2. Clicca su **"Submit for Review"**
3. Conferma l'invio
4. ⏳ Aspetta la revisione (24-48 ore in media)

## ⏱️ Timeline Stimata

- **Preparazione tecnica**: ✅ COMPLETATA
- **Build e Archive**: 30 minuti - 1 ora
- **Upload**: 15-30 minuti
- **Configurazione App Store**: 2-3 ore
- **Invio per revisione**: 15 minuti
- **Tempo di revisione Apple**: 24-48 ore (può richiedere fino a 1 settimana)

## 🆘 Risoluzione Problemi Comuni

### "Invalid Bundle"
- Verifica che il Bundle ID sia corretto
- Controlla che non ci siano caratteri speciali
- Assicurati che il Bundle ID corrisponda a quello su App Store Connect

### "Missing Screenshot"
- Carica screenshot per tutte le dimensioni richieste
- Verifica che siano in formato PNG o JPEG
- Dimensioni corrette sono critiche

### "Privacy Policy Required"
- Aggiungi l'URL della privacy policy
- Assicurati che sia accessibile pubblicamente
- Verifica che il contenuto sia completo

### "Archive Non Disponibile"
- Aspetta qualche minuto dopo l'upload
- Ricarica la pagina di App Store Connect
- Verifica che l'upload sia stato completato con successo

### Errori di Build in Xcode
- Pulisci il build: `Product → Clean Build Folder` (Shift + Cmd + K)
- Rimuovi Derived Data: `File → Project Settings → Derived Data → Delete`
- Ricostruisci: `Product → Build` (Cmd + B)

## 📞 Supporto

- **Apple Developer Support**: [developer.apple.com/support](https://developer.apple.com/support)
- **App Store Connect Help**: [help.apple.com/app-store-connect](https://help.apple.com/app-store-connect)
- **Documentazione Apple**: [developer.apple.com/documentation](https://developer.apple.com/documentation)

---

**🚀 Buona fortuna con la pubblicazione di TableTalk sull'Apple Store!**

*Ultimo aggiornamento: Versione 1.1.9 - Build 1*

