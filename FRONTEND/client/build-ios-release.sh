#!/bin/bash

# Script per build iOS release per Apple Store
# TableTalk Social App

echo "🍎 Iniziando build iOS per Apple Store..."
echo "=========================================="

# Controllo prerequisiti
if ! command -v xcodebuild &> /dev/null; then
    echo "❌ ERRORE: Xcode non è installato o non è nel PATH"
    echo "   Installa Xcode dall'App Store e riprova"
    exit 1
fi

if ! command -v pod &> /dev/null; then
    echo "❌ ERRORE: CocoaPods non è installato"
    echo "   Installa CocoaPods con: sudo gem install cocoapods"
    exit 1
fi

echo "✅ Prerequisiti verificati"

# Build dell'app React
echo "📱 Building React app..."
npm run build

if [ $? -ne 0 ]; then
    echo "❌ ERRORE: Build React fallita"
    exit 1
fi

echo "✅ React app buildata con successo"

# Sincronizzazione Capacitor
echo "🔄 Sincronizzando Capacitor..."
npx cap sync ios

if [ $? -ne 0 ]; then
    echo "❌ ERRORE: Sincronizzazione Capacitor fallita"
    exit 1
fi

echo "✅ Capacitor sincronizzato"

# Installazione dipendenze CocoaPods
echo "📦 Installando dipendenze CocoaPods..."
cd ios/App
pod install

if [ $? -ne 0 ]; then
    echo "❌ ERRORE: Installazione CocoaPods fallita"
    exit 1
fi

echo "✅ Dipendenze CocoaPods installate"

# Torna alla directory principale
cd ../..

echo ""
echo "🎯 BUILD COMPLETATA CON SUCCESSO!"
echo "=================================="
echo ""
echo "📋 PROSSIMI PASSI:"
echo "1. Apri Xcode con: open ios/App/App.xcworkspace"
echo "2. Seleziona il target 'App'"
echo "3. Imposta 'Any iOS Device' come destinazione"
echo "4. Vai su Product > Archive"
echo "5. Segui la procedura per l'upload su App Store Connect"
echo ""
echo "⚠️  IMPORTANTE:"
echo "- Assicurati di avere un Apple Developer Account attivo"
echo "- Configura i certificati e profili di provisioning"
echo "- Imposta la versione e build number corretti"
echo "- Verifica che tutte le risorse (icone, splash) siano presenti"
echo ""
echo "🚀 Buona fortuna con la pubblicazione!"
