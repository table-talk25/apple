#!/bin/bash

# Script per buildare la release Android 1.1.0 di TableTalk Social
# Include le nuove funzionalità e aggiornamenti di versione

echo "🚀 Iniziando build della release 1.1.0 - TableTalk Social"
echo "📱 Versione: 1.1.0 (versionCode: 11)"
echo "📅 Data: $(date)"
echo "🔧 Include aggiornamenti di versione e nuove funzionalità"
echo ""

# Controlla se siamo nella directory corretta
if [ ! -f "package.json" ]; then
    echo "❌ Errore: Esegui questo script dalla directory FRONTEND/client"
    exit 1
fi

# Controlla se Capacitor è installato
if ! command -v npx &> /dev/null; then
    echo "❌ Errore: npx non trovato. Installa Node.js e npm"
    exit 1
fi

# Controlla se le variabili d'ambiente sono configurate
if [ -z "$MAPS_API_KEY" ]; then
    echo "⚠️  Avviso: MAPS_API_KEY non impostata. Google Maps potrebbe non funzionare."
fi

echo "🧹 Pulizia build precedenti..."
cd android && ./gradlew clean && cd ..

if [ $? -ne 0 ]; then
    echo "❌ Errore durante la pulizia Gradle"
    exit 1
fi

echo "📦 Installazione dipendenze npm..."
npm install

if [ $? -ne 0 ]; then
    echo "❌ Errore durante l'installazione npm"
    exit 1
fi

echo "🔍 Verifica dipendenze critiche..."
# Verifica che le dipendenze critiche siano installate
if ! npm list @capacitor/core > /dev/null 2>&1; then
    echo "❌ Errore: @capacitor/core non trovato"
    exit 1
fi

if ! npm list react > /dev/null 2>&1; then
    echo "❌ Errore: react non trovato"
    exit 1
fi

echo "🔨 Build produzione React..."
npm run build

if [ $? -ne 0 ]; then
    echo "❌ Errore durante il build React"
    exit 1
fi

# Verifica che il build sia stato creato
if [ ! -d "build" ]; then
    echo "❌ Errore: Directory build non trovata dopo npm run build"
    exit 1
fi

echo "🔄 Sincronizzazione Capacitor..."
npx cap sync android

if [ $? -ne 0 ]; then
    echo "❌ Errore durante la sincronizzazione Capacitor"
    exit 1
fi

echo "📱 Copia assets Android..."
npx cap copy android

if [ $? -ne 0 ]; then
    echo "❌ Errore durante la copia assets"
    exit 1
fi

# Verifica configurazione Android
echo "🔍 Verifica configurazione Android..."
if [ ! -f "android/app/src/main/AndroidManifest.xml" ]; then
    echo "❌ Errore: AndroidManifest.xml non trovato"
    exit 1
fi

if [ ! -f "android/app/build.gradle" ]; then
    echo "❌ Errore: build.gradle non trovato"
    exit 1
fi

# Verifica che le versioni siano corrette
echo "🔍 Verifica versioni nel build.gradle..."
if grep -q "versionCode 11" "android/app/build.gradle"; then
    echo "✅ Version Code 11 confermato"
else
    echo "❌ Errore: Version Code non corretto nel build.gradle"
    exit 1
fi

if grep -q 'versionName "1.1.0"' "android/app/build.gradle"; then
    echo "✅ Version Name 1.1.0 confermato"
else
    echo "❌ Errore: Version Name non corretto nel build.gradle"
    exit 1
fi

echo "🏗️ Build Android App Bundle (AAB)..."
cd android && ./gradlew bundleRelease && cd ..

if [ $? -ne 0 ]; then
    echo "❌ Errore durante il build AAB"
    exit 1
fi

# Verifica che il file AAB sia stato creato
if [ ! -f "android/app/build/outputs/bundle/release/app-release.aab" ]; then
    echo "❌ Errore: File AAB non trovato dopo il build"
    exit 1
fi

# Verifica dimensione del file
AAB_SIZE=$(du -h "android/app/build/outputs/bundle/release/app-release.aab" | cut -f1)
echo "📊 Dimensione file AAB: $AAB_SIZE"

echo ""
echo "✅ BUILD COMPLETATO CON SUCCESSO!"
echo ""
echo "📁 File AAB generato in:"
echo "   android/app/build/outputs/bundle/release/app-release.aab"
echo ""
echo "📋 Informazioni Release:"
echo "   - Versione: 1.1.0"
echo "   - Version Code: 11"
echo "   - Nome: TableTalk Social 1.1.0"
echo "   - Data: $(date)"
echo "   - Dimensione: $AAB_SIZE"
echo ""
echo "🔧 Aggiornamenti in questa release:"
echo "   - Version Code incrementato a 11"
echo "   - Version Name aggiornato a 1.1.0"
echo "   - Build.gradle configurato correttamente"
echo "   - Pronto per Google Play Store"
echo ""
echo "🚀 Prossimi passi:"
echo "   1. Carica il file AAB su Google Play Console"
echo "   2. Aggiorna le note di rilascio"
echo "   3. Pubblica la release in produzione"
echo ""
echo "🎉 Release 1.1.0 pronta per Google Play!"
echo ""
echo "⚠️  IMPORTANTE: Verifica che le versioni siano corrette prima del rilascio."
