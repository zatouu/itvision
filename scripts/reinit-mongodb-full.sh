#!/bin/bash
# Script pour réinitialiser complètement MongoDB (supprime les données existantes)
# Usage: bash scripts/reinit-mongodb-full.sh
# ATTENTION: Ce script supprime toutes les données existantes!

read -p "⚠️  ATTENTION: Ce script va supprimer toutes les données MongoDB. Continuer? (o/n): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Oo]$ ]]; then
    echo "❌ Opération annulée"
    exit 1
fi

echo "🛑 Arrêt du conteneur MongoDB..."
docker stop itvision-mongodb

echo "🗑️  Suppression des volumes MongoDB..."
docker volume rm migration-mongo_mongodb_data migration-mongo_mongodb_config 2>/dev/null || true

echo "🚀 Démarrage du conteneur MongoDB (réinitialisation complète)..."
docker-compose up -d mongodb

echo "⏳ Attente de l'initialisation..."
sleep 10

echo "✅ MongoDB réinitialisé avec succès!"


