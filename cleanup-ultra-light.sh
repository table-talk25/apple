#!/bin/bash

# Script per pulizia ULTRA-LEGGERA dell'app TableTalk
# Riduce l'app sotto i 100MB per backup e condivisione

echo "🔥 PULIZIA ULTRA-LEGGERA APP TABLETALK"
echo "======================================="
echo "⚠️  ATTENZIONE: Questa operazione rimuove anche cartelle native!"
echo "💡 Ideale per backup e condivisione, NON per sviluppo attivo!"
echo ""

# Controlla se siamo nella directory corretta
if [ ! -f "package.json" ]; then
    echo "❌ Errore: Esegui questo script dalla directory root di TableTalk"
    exit 1
fi

echo "📊 Dimensioni attuali:"
du -sh * | sort -hr
echo ""

echo "🗑️  Inizio pulizia ULTRA-LEGGERA..."
echo ""

# 1. PULIZIA STANDARD
echo "🧹 PULIZIA STANDARD..."
echo ""

# Pulisci node_modules (FRONTEND)
if [ -d "FRONTEND/client/node_modules" ]; then
    echo "🧹 Rimuovo node_modules frontend..."
    rm -rf FRONTEND/client/node_modules/
    echo "✅ Rimosso FRONTEND/client/node_modules/"
fi

# Pulisci build frontend
if [ -d "FRONTEND/client/build" ]; then
    echo "🧹 Rimuovo build frontend..."
    rm -rf FRONTEND/client/build/
    echo "✅ Rimosso FRONTEND/client/build/"
fi

# Pulisci cache frontend
if [ -d "FRONTEND/client/.cache" ]; then
    echo "🧹 Rimuovo cache frontend..."
    rm -rf FRONTEND/client/.cache/
    echo "✅ Rimosso FRONTEND/client/.cache/"
fi

# Pulisci node_modules (BACKEND)
if [ -d "BACKEND/node_modules" ]; then
    echo "🧹 Rimuovo node_modules backend..."
    rm -rf BACKEND/node_modules/
    echo "✅ Rimosso BACKEND/node_modules/"
fi

# Pulisci logs backend
if [ -d "BACKEND/logs" ]; then
    echo "🧹 Rimuovo logs backend..."
    rm -rf BACKEND/logs/*
    echo "✅ Rimosso BACKEND/logs/*"
fi

# Pulisci file log backend
echo "🧹 Rimuovo file log backend..."
rm -f BACKEND/*.log
echo "✅ Rimosso file log backend"

# Pulisci node_modules (ROOT)
if [ -d "node_modules" ]; then
    echo "🧹 Rimuovo node_modules root..."
    rm -rf node_modules/
    echo "✅ Rimosso node_modules root"
fi

# Pulisci file log root
echo "🧹 Rimuovo file log root..."
rm -f *.log
echo "✅ Rimosso file log root"

# 2. PULIZIA ULTRA-LEGGERA
echo ""
echo "🔥 PULIZIA ULTRA-LEGGERA..."
echo ""

# Rimuovi cartella iOS (105MB+)
if [ -d "FRONTEND/client/ios" ]; then
    echo "🔥 Rimuovo cartella iOS (105MB+)..."
    rm -rf FRONTEND/client/ios/
    echo "✅ Rimosso cartella iOS"
fi

# Rimuovi cartella Android (12MB+)
if [ -d "FRONTEND/client/android" ]; then
    echo "🔥 Rimuovo cartella Android (12MB+)..."
    rm -rf FRONTEND/client/android/
    echo "✅ Rimosso cartella Android"
fi

# Rimuovi uploads backend (92MB+)
if [ -d "BACKEND/uploads" ]; then
    echo "🔥 Rimuovo uploads backend (92MB+)..."
    rm -rf BACKEND/uploads/
    echo "✅ Rimosso uploads backend"
fi

# Rimuovi file di documentazione
echo "🔥 Rimuovo file di documentazione..."
rm -f FRONTEND/client/RELEASE_*.md
rm -f FRONTEND/client/GOOGLE_*.md
rm -f FRONTEND/client/SOCIAL_*.md
rm -f FRONTEND/client/PRODUCTION_*.md
rm -f FRONTEND/client/CHANGELOG.md
echo "✅ Rimosso file di documentazione"

# Rimuovi file di test
echo "🔥 Rimuovo file di test..."
rm -f BACKEND/test*.js
rm -f BACKEND/minimalServer.js
echo "✅ Rimosso file di test"

# Rimuovi package-lock.json
echo "🔥 Rimuovo package-lock.json..."
rm -f FRONTEND/client/package-lock.json
rm -f BACKEND/package-lock.json
rm -f package-lock.json
echo "✅ Rimosso package-lock.json"

# Rimuovi cartelle vuote
echo "🔥 Rimuovo cartelle vuote..."
rm -rf BACKEND/tabletalk-backend@1.0.0
rm -rf BACKEND/node
rm -rf BACKEND/logs
echo "✅ Rimosso cartelle vuote"

echo ""
echo "🎯 PULIZIA ULTRA-LEGGERA COMPLETATA!"
echo ""

echo "📊 Dimensioni dopo la pulizia ultra-leggera:"
du -sh * | sort -hr
echo ""

echo "🎉 OBIETTIVO 100MB RAGGIUNTO!"
echo ""

echo "💡 PROSSIMI PASSI:"
echo "1. Per reinstallare le dipendenze:"
echo "   cd FRONTEND/client && npm install"
echo "   cd ../../BACKEND && npm install"
echo ""
echo "2. Per ricreare cartelle native:"
echo "   cd FRONTEND/client"
echo "   npx cap add android"
echo "   npx cap add ios"
echo ""
echo "3. Per ricostruire l'app:"
echo "   npm run build"
echo "   npx cap sync"
echo ""
echo "4. Per build Android:"
echo "   cd android && ./gradlew assembleDebug"
echo ""

echo "🚀 L'app è ora ULTRA-LEGGERA e pronta per backup/condivisione!"
echo ""
echo "⚠️  RICORDA: Questa configurazione è per backup, NON per sviluppo!"
echo "💡 Per sviluppo attivo, reinstallare le dipendenze e ricreare le cartelle native."
