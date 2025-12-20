@echo off
REM Script pour réinitialiser complètement MongoDB (supprime les données existantes)
REM Usage: scripts\reinit-mongodb-full.bat
REM ATTENTION: Ce script supprime toutes les données existantes!

echo ⚠️  ATTENTION: Ce script va supprimer toutes les données MongoDB.
set /p confirm="Continuer? (o/n): "
if /i not "%confirm%"=="o" (
    echo ❌ Opération annulée
    exit /b 1
)

echo 🛑 Arrêt du conteneur MongoDB...
docker stop itvision-mongodb

echo 🗑️  Suppression des volumes MongoDB...
docker volume rm migration-mongo_mongodb_data migration-mongo_mongodb_config 2>nul

echo 🚀 Démarrage du conteneur MongoDB (réinitialisation complète)...
docker-compose up -d mongodb

echo ⏳ Attente de l'initialisation...
timeout /t 10 /nobreak >nul

echo ✅ MongoDB réinitialisé avec succès!


