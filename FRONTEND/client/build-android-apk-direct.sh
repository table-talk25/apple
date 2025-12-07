#!/bin/bash

# Script per buildare APK per installazione diretta (bypass Google Play)
# Molto più veloce per test rapidi!

echo "🚀 Build Android APK per Installazione Diretta"
echo "📱 Versione: $(grep 'versionName' android/app/build.gradle | sed -E 's/.*versionName[[:space:]]+"([^"]+)".*/\1/') (versionCode: $(grep 'versionCode' android/app/build.gradle | sed -E 's/.*versionCode[[:space:]]+([0-9]+).*/\1/'))"
echo "🌐 Backend: https://tabletalk-app-backend.onrender.com"
echo "📅 Data: $(date)"
echo ""

# Controlla se siamo nella directory corretta
if [ ! -f "package.json" ]; then
    echo "❌ Errore: Esegui questo script dalla directory FRONTEND/client"
    exit 1
fi

# Vai nella directory del client
cd "$(dirname "$0")" || exit 1

echo "📦 Passo 1/5: Installazione dipendenze npm..."
npm install

if [ $? -ne 0 ]; then
    echo "❌ Errore durante l'installazione npm"
    exit 1
fi

echo ""
echo "🔨 Passo 2/5: Build produzione React..."
npm run build

if [ $? -ne 0 ]; then
    echo "❌ Errore durante il build React"
    exit 1
fi

echo ""
echo "🔄 Passo 3/5: Sincronizzazione Capacitor..."
npx cap sync android

if [ $? -ne 0 ]; then
    echo "❌ Errore durante la sincronizzazione Capacitor"
    exit 1
fi

echo ""
echo "🏗️ Passo 4/5: Build Android APK (Release)..."
cd android && ./gradlew assembleRelease && cd ..

if [ $? -ne 0 ]; then
    echo "❌ Errore durante il build APK"
    exit 1
fi

# Verifica che il file APK sia stato creato
APK_FILE="android/app/build/outputs/apk/release/app-release.apk"
if [ ! -f "$APK_FILE" ]; then
    echo "❌ Errore: File APK non trovato dopo il build"
    exit 1
fi

# Leggi versione dal build.gradle
VERSION_CODE=$(grep 'versionCode' android/app/build.gradle | sed -E 's/.*versionCode[[:space:]]+([0-9]+).*/\1/')
VERSION_NAME=$(grep 'versionName' android/app/build.gradle | sed -E 's/.*versionName[[:space:]]+"([^"]+)".*/\1/')

# Crea una copia con nome descrittivo
RELEASE_DIR="../../GOOGLE_PLAY_RELEASE"
mkdir -p "$RELEASE_DIR"
TIMESTAMP=$(date +%Y%m%d-%H%M%S)
RELEASE_FILE="$RELEASE_DIR/TableTalk-v${VERSION_CODE}-${VERSION_NAME}-DIRECT-INSTALL-${TIMESTAMP}.apk"
cp "$APK_FILE" "$RELEASE_FILE"

APK_SIZE=$(du -h "$APK_FILE" | cut -f1)

echo ""
echo "✅ BUILD COMPLETATO CON SUCCESSO!"
echo ""
echo "📁 File APK generato:"
echo "   $APK_FILE"
echo ""
echo "📁 Copia con nome descrittivo:"
echo "   $RELEASE_FILE"
echo ""
echo "📊 Dimensione: $APK_SIZE"
echo ""
echo "📋 Informazioni Release:"
echo "   - Versione: $VERSION_NAME"
echo "   - Version Code: $VERSION_CODE"
echo "   - Backend: https://tabletalk-app-backend.onrender.com"
echo "   - Data: $(date)"
echo ""
echo "📱 INSTALLAZIONE DIRETTA:"
echo "   1. Trasferisci il file APK sul tuo telefono Android"
echo "   2. Apri il file APK sul telefono"
echo "   3. Permetti installazione da fonti sconosciute (se richiesto)"
echo "   4. Installa l'app"
echo ""
echo "💡 METODO RAPIDO (via USB):"
echo "   adb install -r \"$RELEASE_FILE\""
echo ""
echo "🎉 APK pronto per installazione diretta!"


