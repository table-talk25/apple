# 🍎 Guida Completa per Pubblicare TableTalk sull'Apple Store

## 📋 Prerequisiti

### 1. **Apple Developer Account**
- Costo: $99/anno
- Registrati su [developer.apple.com](https://developer.apple.com)
- Completa la verifica dell'identità

### 2. **Hardware e Software**
- **Mac computer** con macOS (obbligatorio)
- **Xcode** (versione più recente dall'App Store)
- **iOS Simulator** per i test

### 3. **Preparazione del Progetto**
- ✅ Capacitor configurato per iOS
- ✅ Icone e splash screen generati
- ✅ Info.plist configurato
- ✅ Script di build creato

## 🚀 Processo di Build

### Passo 1: Build Automatica
```bash
# Esegui lo script di build
./build-ios-release.sh
```

### Passo 2: Apri Xcode
```bash
# Apri il progetto in Xcode
open ios/App/App.xcworkspace
```

## ⚙️ Configurazione in Xcode

### 1. **Seleziona il Target**
- Clicca su "App" nella barra laterale
- Seleziona il target "App"

### 2. **Imposta la Destinazione**
- Cambia da "iOS Simulator" a "Any iOS Device"
- Questo è fondamentale per creare un archive

### 3. **Verifica le Impostazioni**
- **Bundle Identifier**: `io.tabletalk.app`
- **Version**: `1.1.9` (versione dell'app)
- **Build**: `1` (numero di build)

### 4. **Configura i Certificati**
- Vai su "Signing & Capabilities"
- Seleziona il tuo Team di sviluppo
- Xcode dovrebbe gestire automaticamente i certificati

## 📱 Creazione dell'Archive

### 1. **Build per Release**
- Menu: **Product** → **Archive**
- Aspetta che il processo sia completato

### 2. **Organizer si Apre**
- Seleziona l'archive appena creato
- Clicca su "Distribute App"

### 3. **Metodo di Distribuzione**
- Seleziona "App Store Connect"
- Clicca "Next"

### 4. **Opzioni di Upload**
- ✅ "Include bitcode" (raccomandato)
- ✅ "Upload your app's symbols" (per crash reporting)
- Clicca "Next"

### 5. **Firma dell'App**
- Seleziona "Automatically manage signing"
- Clicca "Next"

### 6. **Riepilogo e Upload**
- Verifica le impostazioni
- Clicca "Upload"

## 🏪 App Store Connect

### 1. **Accedi a App Store Connect**
- Vai su [appstoreconnect.apple.com](https://appstoreconnect.apple.com)
- Usa il tuo Apple ID

### 2. **Crea una Nuova App**
- Clicca su "My Apps"
- Clicca su "+" → "New App"
- Compila i dettagli:
  - **Platforms**: iOS
  - **Name**: TableTalk Social
  - **Primary language**: Italiano
  - **Bundle ID**: io.tabletalk.app
  - **SKU**: TABLETALK001

### 3. **Configura le Informazioni dell'App**

#### **App Information**
- **Name**: TableTalk Social
- **Subtitle**: Connetti con amici e ristoranti
- **Keywords**: social, ristoranti, amici, cibo, networking
- **Description**: 
```
TableTalk è l'app sociale che ti connette con amici e ristoranti nella tua zona. 

Scopri nuovi posti dove mangiare, organizza cene con amici e condividi le tue esperienze culinarie. 

Caratteristiche principali:
• Trova ristoranti nelle vicinanze
• Organizza cene con amici
• Condividi foto e recensioni
• Chat in tempo reale
• Videochiamate integrate
• Notifiche geolocalizzate

Perfetta per chi ama la buona cucina e la socialità!
```

#### **Support URL**
- **Support URL**: https://tabletalk.app/support
- **Marketing URL**: https://tabletalk.app

#### **Privacy Policy URL**
- **Privacy Policy URL**: https://tabletalk.app/privacy

### 4. **Carica le Screenshot**
- **iPhone 6.7" Display**: 3-5 screenshot
- **iPhone 6.5" Display**: 3-5 screenshot
- **iPhone 5.5" Display**: 3-5 screenshot
- **iPad Pro 12.9" Display**: 3-5 screenshot (opzionale)

### 5. **Configura le Categorie**
- **Primary Category**: Social Networking
- **Secondary Category**: Food & Drink

### 6. **Imposta il Prezzo**
- **Price**: Free
- **Availability**: All Countries

### 7. **Configura le Versioni**
- **Version**: 1.1.9
- **Copyright**: © 2024 TableTalk. All rights reserved.

## 🔒 Privacy e Sicurezza

### 1. **Privacy Labels**
- **Data Used to Track You**: 
  - Location
  - Identifiers
  - Usage Data
- **Data Linked to You**: 
  - Contact Info
  - Photos or Videos
  - Location
- **Data Not Linked to You**: 
  - Analytics

### 2. **App Privacy Details**
- Spiega come usi i dati
- Specifica le finalità di utilizzo

## 📝 Contenuti Richiesti

### 1. **App Review Information**
- **Contact Information**: 
  - First Name: [Il tuo nome]
  - Last Name: [Il tuo cognome]
  - Phone: [Il tuo telefono]
  - Email: [La tua email]

### 2. **Demo Account**
- **Username**: demo@tabletalk.app
- **Password**: demo123
- **Notes**: Account demo per la revisione dell'app

## 🚀 Invio per la Revisione

### 1. **Verifica Finale**
- ✅ Tutte le informazioni sono complete
- ✅ Screenshot caricati
- ✅ Privacy policy configurata
- ✅ Demo account fornito

### 2. **Invia per la Revisione**
- Clicca su "Save" per salvare le modifiche
- Clicca su "Submit for Review"
- Conferma l'invio

## ⏱️ Tempi di Revisione

- **Tempo medio**: 24-48 ore
- **Può richiedere**: fino a 1 settimana
- **Status**: Puoi monitorare su App Store Connect

## 🔄 Aggiornamenti Futuri

### 1. **Nuova Versione**
- Incrementa il numero di versione
- Incrementa il build number
- Ricrea l'archive
- Carica su App Store Connect

### 2. **Processo di Aggiornamento**
- Stesso processo della prima pubblicazione
- Tempi di revisione più rapidi (24-48 ore)

## 🆘 Risoluzione Problemi

### **Errori Comuni**

#### **"Invalid Bundle"**
- Verifica che il Bundle ID sia corretto
- Controlla che non ci siano caratteri speciali

#### **"Missing Screenshots"**
- Carica screenshot per tutte le dimensioni richieste
- Verifica che siano in formato PNG

#### **"Privacy Policy Required"**
- Aggiungi l'URL della privacy policy
- Assicurati che sia accessibile

#### **"App Store Connect Error"**
- Verifica la connessione internet
- Prova a ricaricare la pagina
- Controlla che l'archive sia stato caricato correttamente

## 📞 Supporto

- **Apple Developer Support**: [developer.apple.com/support](https://developer.apple.com/support)
- **App Store Connect Help**: [help.apple.com/app-store-connect](https://help.apple.com/app-store-connect)

## 🎯 Checklist Finale

- [ ] Apple Developer Account attivo
- [ ] Xcode installato e configurato
- [ ] Progetto buildato con successo
- [ ] Archive creato in Xcode
- [ ] App caricata su App Store Connect
- [ ] Informazioni dell'app complete
- [ ] Screenshot caricati
- [ ] Privacy policy configurata
- [ ] App inviata per la revisione

---

**🚀 Buona fortuna con la pubblicazione di TableTalk sull'Apple Store!**

*Se hai bisogno di aiuto, consulta la documentazione ufficiale di Apple o contatta il supporto sviluppatori.*
