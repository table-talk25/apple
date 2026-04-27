# 🔧 **Configurazione Gradle per Release TableTalk**

## 📁 **File di Configurazione**

### **build.gradle (app)**
```gradle
android {
    namespace "com.tabletalk.socialapp"
    compileSdk rootProject.ext.compileSdkVersion
    
    defaultConfig {
        applicationId "com.tabletalk.socialapp"
        minSdkVersion rootProject.ext.minSdkVersion
        targetSdkVersion rootProject.ext.targetSdkVersion
        versionCode 2          // Incrementa per ogni release
        versionName "1.1"      // Versione leggibile
        testInstrumentationRunner "androidx.test.runner.AndroidJUnitRunner"
    }
    
    signingConfigs {
        release {
            storeFile file('tabletalk-release-key.keystore')
            storePassword 'TableTalk2024'
            keyAlias 'tabletalk-key-alias'
            keyPassword 'TableTalk2024'
        }
    }
    
    buildTypes {
        release {
            minifyEnabled false
            proguardFiles getDefaultProguardFile('proguard-android.txt'), 'proguard-rules.pro'
            signingConfig signingConfigs.release
        }
    }
}
```

## 🚀 **Comandi per Build**

### **1. Build Debug (per test):**
```bash
cd FRONTEND/client/android
./gradlew assembleDebug
```

### **2. Build Release (per Google Play):**
```bash
cd FRONTEND/client/android
./gradlew assembleRelease
```

### **3. Clean Build (se problemi):**
```bash
cd FRONTEND/client/android
./gradlew clean
./gradlew assembleRelease
```

## 📱 **Gestione Versioni**

### **Version Code (obbligatorio):**
- **v1.0**: versionCode 1
- **v1.1**: versionCode 2 ← **ATTUALE**
- **v1.2**: versionCode 3
- **v2.0**: versionCode 4

### **Version Name (leggibile):**
- **v1.0**: "1.0"
- **v1.1**: "1.1" ← **ATTUALE**
- **v1.2**: "1.2"
- **v2.0**: "2.0"

## 🔑 **Gestione Keystore**

### **Posizione Keystore:**
```
FRONTEND/client/android/app/tabletalk-release-key.keystore
```

### **Verifica Keystore:**
```bash
keytool -list -v -keystore app/tabletalk-release-key.keystore
```

### **Creazione Nuovo Keystore (se necessario):**
```bash
keytool -genkey -v \
  -keystore app/tabletalk-release-key.keystore \
  -alias tabletalk-key-alias \
  -keyalg RSA \
  -keysize 2048 \
  -validity 10000 \
  -storepass TableTalk2024 \
  -keypass TableTalk2024 \
  -dname "CN=Cristian Lecca, OU=TableTalk, O=TableTalk, L=Vicenza, ST=Vicenza, C=IT"
```

## 📋 **Checklist Pre-Release**

### **✅ Prima del Build:**
- [ ] Incrementa `versionCode`
- [ ] Aggiorna `versionName`
- [ ] Verifica keystore presente
- [ ] Testa app in modalità debug
- [ ] Commit e push modifiche

### **✅ Dopo il Build:**
- [ ] Verifica APK generato
- [ ] Controlla dimensione APK
- [ ] Verifica firma APK
- [ ] Testa APK su dispositivo
- [ ] Backup keystore

### **✅ Per Google Play:**
- [ ] Upload APK su Console
- [ ] Compila note di release
- [ ] Imposta rollout graduale (opzionale)
- [ ] Monitora feedback utenti

## 🐛 **Risoluzione Problemi**

### **Errore Keystore:**
```
KeytoolException: Failed to read key from store
```
**Soluzione**: Verifica password e percorso keystore

### **Errore Build:**
```
Execution failed for task ':app:packageRelease'
```
**Soluzione**: Controlla configurazione signingConfig

### **APK Non Firmato:**
```
APK not signed
```
**Soluzione**: Verifica `signingConfig signingConfigs.release`

## 📚 **Risorse Utili**

- **Google Play Console**: https://play.google.com/console
- **Android Developer**: https://developer.android.com/studio/publish
- **Gradle Documentation**: https://gradle.org/docs/

---

**Configurazione attuale**: ✅ Pronta per release
**Ultimo aggiornamento**: 20 Agosto 2025
