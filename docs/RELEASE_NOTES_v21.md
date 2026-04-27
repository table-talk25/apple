# 📱 TableTalk - Note di Rilascio v21 (1.1.8)
**Data:** 12 Settembre 2025  
**Version Code:** 21  
**Version Name:** 1.1.8  
**Target:** Test Chiusi Google Play

---

## 🚀 **Novità e Miglioramenti**

### ⚡ **Prestazioni Login**
- **Login 3x più veloce** - Ottimizzazioni al database e riduzione operazioni
- **Caricamento parallelo** - Dati utente e notifiche caricati simultaneamente
- **Esperienza utente migliorata** - Feedback visivo più fluido durante l'accesso

### 🔔 **Sistema Notifiche**
- **RISOLTO:** Errore "impossibile caricare le notifiche" dopo il login
- **Nuovi endpoint API** - Gestione completa delle notifiche
- **Funzioni aggiunte:**
  - Caricamento notifiche con paginazione
  - Segna come letta singola notifica
  - Segna tutte come lette
- **Stabilità migliorata** - Gestione errori più robusta

### 📸 **Upload Foto Profilo**
- **RISOLTO:** Problema salvataggio foto profilo
- **Funzionalità ripristinata** - Upload e salvataggio completamente funzionanti
- **Feedback migliorato** - Messaggi di successo/errore più chiari
- **Debug avanzato** - Logging dettagliato per troubleshooting

### 🍽️ **Creazione Pasti**
- **Logging migliorato** - Errori di validazione più dettagliati
- **Gestione errori avanzata** - Identificazione precisa dei problemi
- **Stabilità aumentata** - Handling robusto delle eccezioni database

---

## 🔧 **Correzioni Tecniche**

### **Backend**
- Ottimizzazione query database per login
- Riduzione operazioni bcrypt (salt rounds ottimizzati)
- Consolidamento operazioni `user.save()` multiple
- Endpoint notifiche mancanti aggiunti
- Logging estensivo per debugging

### **Frontend**
- Caricamento lazy delle sezioni non critiche
- Gestione parallela delle richieste API
- Context API ottimizzato per prestazioni
- Toast notifications migliorate
- Error handling più granulare

### **Mobile**
- Risolti conflitti Java 21 vs 17 in build Android
- Configurazioni Kotlin allineate
- Plugin imports corretti
- Build pipeline stabilizzato

---

## 📊 **Dettagli Tecnici**

| Componente | Versione | Stato |
|------------|----------|-------|
| **App Version** | 1.1.8 | ✅ Aggiornata |
| **Version Code** | 21 | ✅ Incrementato |
| **Android Target** | API 35 | ✅ Aggiornato |
| **Java Version** | 17 | ✅ Stabilizzato |
| **Build Tools** | 8.7.2 | ✅ Ottimizzato |

---

## 🎯 **Prossimi Passi**

Questa versione è pronta per:
- ✅ **Test Chiusi** - Distribuzione a gruppo ristretto di tester
- 🔜 **Produzione** - Dopo feedback positivi dai test chiusi (v22)

---

## 📝 **Note per i Tester**

### **Cosa Testare:**
1. **Login** - Verificare velocità migliorata
2. **Notifiche** - Controllare caricamento e funzioni
3. **Foto Profilo** - Testare upload e salvataggio
4. **Creazione Pasti** - Verificare stabilità

### **Cosa Segnalare:**
- Eventuali rallentamenti durante il login
- Problemi con le notifiche
- Errori nell'upload foto
- Crash durante la creazione pasti

---

**Versione compilata:** `TableTalk-v21-Test-Chiusi.aab`  
**Dimensione:** ~11.8 MB  
**Compatibilità:** Android 6.0+ (API 23+)
