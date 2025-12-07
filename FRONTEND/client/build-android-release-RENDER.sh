#!/bin/bash

# Script per buildare la release Android con backend Render
# Backend: https://tabletalk-app-backend.onrender.com

# Leggi versione dal build.gradle (compatibile con macOS)
VERSION_CODE=$(grep 'versionCode' android/app/build.gradle | sed -E 's/.*versionCode[[:space:]]+([0-9]+).*/\1/')
VERSION_NAME=$(grep 'versionName' android/app/build.gradle | sed -E 's/.*versionName[[:space:]]+"([^"]+)".*/\1/')

echo "🚀 Build Android Release con Backend Render"
echo "📱 Versione: $VERSION_NAME (versionCode: $VERSION_CODE)"
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
echo "🏗️ Passo 4/5: Build Android App Bundle (AAB)..."
cd android && ./gradlew bundleRelease && cd ..

if [ $? -ne 0 ]; then
    echo "❌ Errore durante il build AAB"
    exit 1
fi

# Verifica che il file AAB sia stato creato
AAB_FILE="android/app/build/outputs/bundle/release/app-release.aab"
if [ ! -f "$AAB_FILE" ]; then
    echo "❌ Errore: File AAB non trovato dopo il build"
    exit 1
fi

# Leggi versione dal build.gradle (se non già letto)
if [ -z "$VERSION_CODE" ] || [ -z "$VERSION_NAME" ]; then
    VERSION_CODE=$(grep 'versionCode' android/app/build.gradle | sed -E 's/.*versionCode[[:space:]]+([0-9]+).*/\1/')
    VERSION_NAME=$(grep 'versionName' android/app/build.gradle | sed -E 's/.*versionName[[:space:]]+"([^"]+)".*/\1/')
fi

# Crea una copia con nome descrittivo
RELEASE_DIR="../../GOOGLE_PLAY_RELEASE"
mkdir -p "$RELEASE_DIR"
TIMESTAMP=$(date +%Y%m%d-%H%M%S)
RELEASE_FILE="$RELEASE_DIR/TableTalk-v${VERSION_CODE}-${VERSION_NAME}-TOKEN-FIX-$TIMESTAMP.aab"
cp "$AAB_FILE" "$RELEASE_FILE"

AAB_SIZE=$(du -h "$AAB_FILE" | cut -f1)

echo ""
echo "✅ BUILD COMPLETATO CON SUCCESSO!"
echo ""
echo "📁 File AAB generato:"
echo "   $AAB_FILE"
echo ""
echo "📁 Copia con nome descrittivo:"
echo "   $RELEASE_FILE"
echo ""
echo "📊 Dimensione: $AAB_SIZE"
echo ""
echo "📋 Informazioni Release:"
echo "   - Versione: $VERSION_NAME"
echo "   - Version Code: $VERSION_CODE"
echo "   - Backend: https://tabletalk-app-backend.onrender.com"
echo "   - Data: $(date)"
echo ""
echo "🚀 Prossimi passi:"
echo "   1. Vai su Google Play Console"
echo "   2. Seleziona la tua app"
echo "   3. Vai su 'Produzione' → 'Crea nuova versione'"
echo "   4. Carica il file: $RELEASE_FILE"
echo "   5. Version Code: $VERSION_CODE"
echo "   6. Version Name: $VERSION_NAME"
echo "   7. Compila le note di rilascio"
echo "   8. Pubblica la nuova versione"
echo ""
echo "🎉 Release pronta per Google Play Store!"

