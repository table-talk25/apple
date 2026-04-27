# Risoluzione Avvisi Gradle

## Problema
Gli avvisi Gradle indicano che `capacitor-cordova-android-plugins` viene rilevato come duplicato. Questo è causato dalla cache dell'IDE che ancora riferisce alle vecchie cartelle `android/` e `app/` che sono state rimosse.

## Soluzione Completa

### 1. Riavvia l'IDE
Chiudi completamente Android Studio/IntelliJ IDEA e riaprilo. L'IDE ricreerà la configurazione senza i riferimenti alle vecchie cartelle.

### 2. Pulisci la Cache Gradle
Esegui questi comandi dalla root del progetto:

```bash
cd FRONTEND/client/android
./gradlew clean
./gradlew --stop
```

### 3. Pulisci la Cache dell'IDE
Se gli errori persistono dopo il riavvio:

```bash
# Dalla root del progetto
rm -rf .idea
rm -rf FRONTEND/client/android/.idea
rm -rf FRONTEND/client/android/.gradle
rm -rf FRONTEND/client/android/app/build
```

Poi riapri l'IDE e lascia che ricrei la configurazione.

### 4. Verifica la Configurazione
Assicurati che:
- ✅ La cartella `FRONTEND/client/android/` esista ed sia completa
- ✅ Non ci siano cartelle `android/` o `app/` nella root del progetto
- ✅ Il file `FRONTEND/client/android/settings.gradle` includa solo i progetti corretti

## Note
- Questi avvisi sono solo cache dell'IDE e **NON impediscono la compilazione**
- La build funziona correttamente anche con questi avvisi
- Dopo il riavvio dell'IDE, gli avvisi dovrebbero scomparire automaticamente

## Stato Attuale
- ✅ Cartelle duplicate rimosse (`android_old_backup_duplicate`, `app_old_backup`)
- ✅ Cache IDE pulita
- ✅ Cache Gradle pulita
- ⚠️ Avvisi Gradle rimanenti (si risolvono con riavvio IDE)

