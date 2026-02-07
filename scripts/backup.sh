#!/bin/bash
#
# Script de backup automatique MongoDB - IT Vision
# Usage: ./scripts/backup.sh [--restore fichier.tar.gz]
#
# Ce script sauvegarde la base MongoDB localement avec rotation de 14 jours
# À ajouter dans crontab pour backup quotidien automatique

set -e

# Configuration
BACKUP_DIR="${BACKUP_DIR:-./backups}"
CONTAINER_NAME="${CONTAINER_NAME:-itvision-mongodb}"
DB_NAME="${DB_NAME:-itvision_db}"
DB_USER="${DB_USER:-itvision_app}"
DB_PASS="${DB_PASS:-AppPassword123}"
KEEP_DAYS="${KEEP_DAYS:-14}"

# Couleurs
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Timestamp
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_NAME="mongodb_backup_${TIMESTAMP}"

# Créer dossier backup
mkdir -p "$BACKUP_DIR"

log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[OK]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Fonction backup
backup() {
    log_info "Démarrage backup MongoDB..."
    log_info "Container: $CONTAINER_NAME"
    log_info "Database: $DB_NAME"
    log_info "Destination: $BACKUP_DIR"

    # Vérifier si container tourne
    if ! docker ps | grep -q "$CONTAINER_NAME"; then
        log_error "Container MongoDB non trouvé: $CONTAINER_NAME"
        exit 1
    fi

    # Créer backup dans container
    log_info "Dump de la base..."
    docker exec "$CONTAINER_NAME" mongodump \
        --username "$DB_USER" \
        --password "$DB_PASS" \
        --authenticationDatabase "$DB_NAME" \
        --db "$DB_NAME" \
        --out "/tmp/$BACKUP_NAME" \
        --quiet

    # Copier hors du container
    log_info "Copie des fichiers..."
    docker cp "$CONTAINER_NAME:/tmp/$BACKUP_NAME" "$BACKUP_DIR/"

    # Nettoyer container
    docker exec "$CONTAINER_NAME" rm -rf "/tmp/$BACKUP_NAME"

    # Compresser
    log_info "Compression..."
    cd "$BACKUP_DIR"
    tar -czf "${BACKUP_NAME}.tar.gz" "$BACKUP_NAME"
    rm -rf "$BACKUP_NAME"
    cd - > /dev/null

    # Calculer taille
    SIZE=$(du -h "$BACKUP_DIR/${BACKUP_NAME}.tar.gz" | cut -f1)
    log_success "Backup créé: ${BACKUP_NAME}.tar.gz ($SIZE)"

    # Rotation - garder seulement KEEP_DAYS derniers
    log_info "Rotation des backups (garde $KEEP_DAYS jours)..."
    cd "$BACKUP_DIR"
    ls -t mongodb_backup_*.tar.gz 2>/dev/null | tail -n +$((KEEP_DAYS + 1)) | while read file; do
        log_warn "Suppression ancien backup: $file"
        rm -f "$file"
    done
    cd - > /dev/null

    # Statistiques
    BACKUP_COUNT=$(ls -1 "$BACKUP_DIR"/mongodb_backup_*.tar.gz 2>/dev/null | wc -l)
    TOTAL_SIZE=$(du -sh "$BACKUP_DIR" 2>/dev/null | cut -f1)
    
    log_success "Backup terminé!"
    log_info "Backups disponibles: $BACKUP_COUNT"
    log_info "Espace utilisé: $TOTAL_SIZE"
    log_info "Fichier: $BACKUP_DIR/${BACKUP_NAME}.tar.gz"

    # Liste des backups
    echo ""
    echo "📦 Backups existants:"
    ls -lah "$BACKUP_DIR"/mongodb_backup_*.tar.gz 2>/dev/null | tail -5 | awk '{print "   " $9 " (" $5 ")"}'
}

# Fonction restore
restore() {
    local BACKUP_FILE="$1"

    if [ -z "$BACKUP_FILE" ]; then
        log_error "Fichier backup requis"
        echo "Usage: $0 --restore <fichier.tar.gz>"
        exit 1
    fi

    if [ ! -f "$BACKUP_FILE" ]; then
        # Chercher dans BACKUP_DIR
        if [ -f "$BACKUP_DIR/$BACKUP_FILE" ]; then
            BACKUP_FILE="$BACKUP_DIR/$BACKUP_FILE"
        else
            log_error "Fichier non trouvé: $BACKUP_FILE"
            exit 1
        fi
    fi

    log_warn "⚠️  CETTE ACTION ÉCRASERA LES DONNÉES ACTUELLES!"
    log_warn "Backup: $BACKUP_FILE"
    echo ""
    read -p "Êtes-vous sûr? (tapez 'OUI' pour confirmer): " confirm
    
    if [ "$confirm" != "OUI" ]; then
        log_info "Restauration annulée"
        exit 0
    fi

    log_info "Restauration..."

    # Extraire
    TEMP_DIR=$(mktemp -d)
    log_info "Extraction dans $TEMP_DIR..."
    tar -xzf "$BACKUP_FILE" -C "$TEMP_DIR"

    # Trouver le dossier extrait
    EXTRACTED_DIR=$(find "$TEMP_DIR" -maxdepth 1 -type d -name "mongodb_backup_*" | head -1)

    if [ -z "$EXTRACTED_DIR" ]; then
        log_error "Structure de backup invalide"
        rm -rf "$TEMP_DIR"
        exit 1
    fi

    # Copier dans container
    log_info "Copie vers container..."
    docker cp "$EXTRACTED_DIR" "$CONTAINER_NAME:/tmp/restore_dump"

    # Restore
    log_info "Restauration de la base..."
    docker exec "$CONTAINER_NAME" mongorestore \
        --username "$DB_USER" \
        --password "$DB_PASS" \
        --authenticationDatabase "$DB_NAME" \
        --db "$DB_NAME" \
        --drop \
        "/tmp/restore_dump/$(basename $EXTRACTED_DIR)" \
        --quiet

    # Nettoyer
    docker exec "$CONTAINER_NAME" rm -rf /tmp/restore_dump
    rm -rf "$TEMP_DIR"

    log_success "Restauration terminée!"
}

# Fonction list
list_backups() {
    echo "📦 Backups disponibles dans $BACKUP_DIR:"
    echo ""
    
    if [ ! -d "$BACKUP_DIR" ] || [ -z "$(ls -A $BACKUP_DIR/*.tar.gz 2>/dev/null)" ]; then
        log_warn "Aucun backup trouvé"
        exit 0
    fi

    ls -lah "$BACKUP_DIR"/mongodb_backup_*.tar.gz 2>/dev/null | awk '{
        print "  📄 " $9
        print "     Taille: " $5 " | Date: " $6 " " $7 " " $8
        print ""
    }'

    TOTAL=$(ls -1 "$BACKUP_DIR"/mongodb_backup_*.tar.gz 2>/dev/null | wc -l)
    SIZE=$(du -sh "$BACKUP_DIR" 2>/dev/null | cut -f1)
    echo "Total: $TOTAL backups | Espace: $SIZE"
}

# Help
show_help() {
    cat << EOF
Script de backup/restore MongoDB pour IT Vision

USAGE:
    ./scripts/backup.sh [COMMANDE] [OPTIONS]

COMMANDES:
    backup              Créer un backup (défaut)
    restore <fichier> Restaurer depuis un backup
    list                Lister les backups disponibles
    help                Afficher cette aide

ENVIRONMENT:
    BACKUP_DIR          Dossier de stockage (défaut: ./backups)
    CONTAINER_NAME      Nom container MongoDB (défaut: itvision-mongodb)
    DB_NAME             Nom de la base (défaut: itvision_db)
    DB_USER             Utilisateur MongoDB (défaut: itvision_app)
    DB_PASS             Mot de passe MongoDB (défaut: AppPassword123)
    KEEP_DAYS           Jours de rétention (défaut: 14)

EXEMPLES:
    # Backup manuel
    ./scripts/backup.sh
    
    # Avec variables personnalisées
    DB_PASS=MonMotDePasse ./scripts/backup.sh
    
    # Lister les backups
    ./scripts/backup.sh list
    
    # Restaurer dernier backup
    ./scripts/backup.sh restore $(ls -t backups/*.tar.gz | head -1)

CRON (backup quotidien à 2h du matin):
    0 2 * * * cd /home/ubuntu/itvision-1 && ./scripts/backup.sh >> /var/log/itvision-backup.log 2>&1

EOF
}

# Main
case "${1:-backup}" in
    backup|""|-b|--backup)
        backup
        ;;
    restore|-r|--restore)
        restore "$2"
        ;;
    list|-l|--list)
        list_backups
        ;;
    help|-h|--help)
        show_help
        ;;
    *)
        log_error "Commande inconnue: $1"
        show_help
        exit 1
        ;;
esac
