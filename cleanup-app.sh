#!/bin/bash

# Script per alleggerire l'app TableTalk
# Rimuove file di build, cache e log non necessari

echo "🧹 PULIZIA APP TABLETALK - ALLEGGERIMENTO"
echo "=========================================="
echo ""

# Controlla se siamo nella directory corretta
if [ ! -f "package.json" ]; then
    echo "❌ Errore: Esegui questo script dalla directory root di TableTalk"
    exit 1
fi

echo "📊 Dimensioni attuali:"
du -sh * | sort -hr
echo ""

echo "🗑️  Inizio pulizia..."
echo ""

# 1. Pulisci node_modules (FRONTEND)
if [ -d "FRONTEND/client/node_modules" ]; then
    echo "🧹 Rimuovo node_modules frontend..."
    rm -rf FRONTEND/client/node_modules/
    echo "✅ Rimosso FRONTEND/client/node_modules/"
fi

# 2. Pulisci build frontend
if [ -d "FRONTEND/client/build" ]; then
    echo "🧹 Rimuovo build frontend..."
    rm -rf FRONTEND/client/build/
    echo "✅ Rimosso FRONTEND/client/build/"
fi

# 3. Pulisci cache frontend
if [ -d "FRONTEND/client/.cache" ]; then
    echo "🧹 Rimuovo cache frontend..."
    rm -rf FRONTEND/client/.cache/
    echo "✅ Rimosso FRONTEND/client/.cache/"
fi

# 4. Pulisci node_modules (BACKEND)
if [ -d "BACKEND/node_modules" ]; then
    echo "🧹 Rimuovo node_modules backend..."
    rm -rf BACKEND/node_modules/
    echo "✅ Rimosso BACKEND/node_modules/"
fi

# 5. Pulisci logs backend
if [ -d "BACKEND/logs" ]; then
    echo "🧹 Rimuovo logs backend..."
    rm -rf BACKEND/logs/*
    echo "✅ Rimosso BACKEND/logs/*"
fi

# 6. Pulisci file log backend
echo "🧹 Rimuovo file log backend..."
rm -f BACKEND/*.log
echo "✅ Rimosso file log backend"

# 7. Pulisci node_modules (ROOT)
if [ -d "node_modules" ]; then
    echo "🧹 Rimuovo node_modules root..."
    rm -rf node_modules/
    echo "✅ Rimosso node_modules root"
fi

# 8. Pulisci file log root
echo "🧹 Rimuovo file log root..."
rm -f *.log
echo "✅ Rimosso file log root"

# 9. Pulisci build Android (se presente)
if [ -d "FRONTEND/client/android/.gradle" ]; then
    echo "🧹 Rimuovo cache Gradle..."
    rm -rf FRONTEND/client/android/.gradle/
    echo "✅ Rimosso cache Gradle"
fi

if [ -d "FRONTEND/client/android/app/build" ]; then
    echo "🧹 Rimuovo build Android..."
    rm -rf FRONTEND/client/android/app/build/
    echo "✅ Rimosso build Android"
fi

# 10. Pulisci build iOS (se presente)
if [ -d "FRONTEND/client/ios/build" ]; then
    echo "🧹 Rimuovo build iOS..."
    rm -rf FRONTEND/client/ios/build/
    echo "✅ Rimosso build iOS"
fi

if [ -d "FRONTEND/client/ios/DerivedData" ]; then
    echo "🧹 Rimuovo DerivedData iOS..."
    rm -rf FRONTEND/client/ios/DerivedData/
    echo "✅ Rimosso DerivedData iOS"
fi

echo ""
echo "🎯 PULIZIA COMPLETATA!"
echo ""

echo "📊 Dimensioni dopo la pulizia:"
du -sh * | sort -hr
echo ""

echo "💡 PROSSIMI PASSI:"
echo "1. Per reinstallare le dipendenze:"
echo "   cd FRONTEND/client && npm install"
echo "   cd ../../BACKEND && npm install"
echo ""
echo "2. Per ricostruire l'app:"
echo "   cd FRONTEND/client && npm run build"
echo "   npx cap sync android"
echo ""
echo "3. Per build Android:"
echo "   cd android && ./gradlew assembleDebug"
echo ""

echo "🚀 L'app è ora molto più leggera!"
echo ""
echo "🔥 OPZIONE ULTRA-LEGGERA (sotto 100MB):"
echo "Per ridurre ulteriormente l'app, esegui:"
echo "   ./cleanup-app.sh --ultra-light"
echo ""
echo "⚠️  ATTENZIONE: L'opzione ultra-light rimuove anche:"
echo "   - Cartelle iOS e Android native"
echo "   - Uploads backend"
echo "   - File di documentazione"
echo "   - Package-lock.json"
echo ""
echo "💡 Ideale per backup e condivisione, NON per sviluppo attivo!"
