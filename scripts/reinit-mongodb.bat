@echo off
REM Script pour réexécuter init.js dans MongoDB (Windows)
REM Usage: scripts\reinit-mongodb.bat

echo 🔄 Réexécution du script d'initialisation MongoDB...

REM Exécuter le script directement
echo 📝 Exécution du script init.js...
docker exec -i itvision-mongodb mongosh -u admin -p AdminPassword123 --authenticationDatabase admin < docker\mongodb\init.js

echo.
echo ✅ Script d'initialisation exécuté!


