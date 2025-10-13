#!/bin/bash

# Script de backup automatique pour IT Vision
set -e

# Configuration
BACKUP_DIR="/backups"
DATE=$(date +%Y%m%d_%H%M%S)
RETENTION_DAYS=7

# Couleurs pour les logs
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] $1${NC}"
}

warning() {
    echo -e "${YELLOW}[$(date +'%Y-%m-%d %H:%M:%S')] WARNING: $1${NC}"
}

error() {
    echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')] ERROR: $1${NC}"
}

# Création du répertoire de backup
mkdir -p "$BACKUP_DIR"

log "🚀 Démarrage du backup IT Vision - $DATE"

# Attendre que MongoDB soit prêt
log "⏳ Attente de la disponibilité de MongoDB..."
until mongosh --host mongodb --eval "print('MongoDB is ready')" > /dev/null 2>&1; do
    sleep 5
done

log "✅ MongoDB disponible"

# Backup de la base de données
log "📦 Backup de la base de données..."
mongodump \
    --host mongodb:27017 \
    --db itvision_db \
    --out "$BACKUP_DIR/mongodb_$DATE" \
    --quiet

if [ $? -eq 0 ]; then
    log "✅ Backup MongoDB terminé: $BACKUP_DIR/mongodb_$DATE"
    
    # Compression du backup
    log "🗜️ Compression du backup..."
    tar -czf "$BACKUP_DIR/mongodb_$DATE.tar.gz" -C "$BACKUP_DIR" "mongodb_$DATE"
    rm -rf "$BACKUP_DIR/mongodb_$DATE"
    
    log "✅ Backup compressé: $BACKUP_DIR/mongodb_$DATE.tar.gz"
else
    error "❌ Échec du backup MongoDB"
    exit 1
fi

# Nettoyage des anciens backups
log "🧹 Nettoyage des backups anciens (> $RETENTION_DAYS jours)..."
find "$BACKUP_DIR" -name "mongodb_*.tar.gz" -type f -mtime +$RETENTION_DAYS -delete

# Statistiques
BACKUP_SIZE=$(du -sh "$BACKUP_DIR/mongodb_$DATE.tar.gz" | cut -f1)
TOTAL_BACKUPS=$(ls -1 "$BACKUP_DIR"/mongodb_*.tar.gz 2>/dev/null | wc -l)

log "📊 Statistiques du backup:"
log "   - Taille: $BACKUP_SIZE"
log "   - Total backups: $TOTAL_BACKUPS"
log "   - Rétention: $RETENTION_DAYS jours"

# Vérification de l'intégrité
log "🔍 Vérification de l'intégrité..."
if tar -tzf "$BACKUP_DIR/mongodb_$DATE.tar.gz" > /dev/null 2>&1; then
    log "✅ Backup vérifié avec succès"
else
    error "❌ Backup corrompu!"
    exit 1
fi

log "🎉 Backup terminé avec succès - $DATE"

# Log des backups disponibles
log "📋 Backups disponibles:"
ls -lh "$BACKUP_DIR"/mongodb_*.tar.gz 2>/dev/null | while read line; do
    log "   $line"
done

exit 0