@echo off
REM Script pour réexécuter init.js dans MongoDB (Windows)
REM Usage: scripts\reinit-mongodb.bat

echo 🔄 Réexécution du script d'initialisation MongoDB...

REM Exécuter le script directement
echo 📝 Exécution du script init.js...
REM Identifiants lus dans l'environnement du conteneur (MONGO_INITDB_ROOT_*)
docker exec -i itvision-mongodb sh -c "mongosh -u \"$MONGO_INITDB_ROOT_USERNAME\" -p \"$MONGO_INITDB_ROOT_PASSWORD\" --authenticationDatabase admin" < docker\mongodb\init.js

echo.
echo ✅ Script d'initialisation exécuté!


