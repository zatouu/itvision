#!/bin/bash
# ============================================================================
# Bootstrap EC2 — Provisionne une VM Debian ARM64 fraîche pour IT Vision
# Usage (sur la VM) : curl -fsSL <raw-url> | sudo bash
#   ou: sudo bash bootstrap-ec2.sh
# ============================================================================

set -e

# ─── Config ───────────────────────────────────────────────────────────────────
DOMAIN="itvisionplus.sn"
WWW_DOMAIN="www.itvisionplus.sn"
MARKET_DOMAIN="market.itvisionplus.sn"
APP_PORT=3000
APP_DIR="/home/admin/itvision"
SSH_USER="admin"

echo "🚀 Bootstrap IT Vision — Debian ARM64 EC2"
echo "=========================================="
echo "Domain: $DOMAIN"
echo "App dir: $APP_DIR"
echo ""

# ─── 1. Système ───────────────────────────────────────────────────────────────
echo "📦 Étape 1/7: Mise à jour système..."
apt-get update -y
apt-get upgrade -y
apt-get install -y curl wget gnupg lsb-release ca-certificates software-properties-common ufw

# ─── 2. Docker ────────────────────────────────────────────────────────────────
echo "🐳 Étape 2/7: Installation Docker..."
if ! command -v docker >/dev/null 2>&1; then
  curl -fsSL https://get.docker.com | sh
  usermod -aG docker $SSH_USER
  echo "  → Docker installé ✓"
else
  echo "  → Docker déjà installé ✓"
fi

# Activer Docker au boot
systemctl enable docker
systemctl start docker

# ─── 3. Nginx ─────────────────────────────────────────────────────────────────
echo "🌐 Étape 3/7: Installation Nginx..."
apt-get install -y nginx
systemctl enable nginx
systemctl start nginx
echo "  → Nginx installé ✓"

# ─── 4. Certbot (SSL Let's Encrypt) ───────────────────────────────────────────
echo "🔒 Étape 4/7: Installation Certbot..."
apt-get install -y certbot python3-certbot-nginx
echo "  → Certbot installé ✓"

# ─── 5. Firewall (ufw) ────────────────────────────────────────────────────────
echo "🛡️ Étape 5/7: Configuration firewall..."
ufw --force reset
ufw default deny incoming
ufw default allow outgoing
ufw allow 22/tcp comment 'SSH'
ufw allow 80/tcp comment 'HTTP'
ufw allow 443/tcp comment 'HTTPS'
ufw --force enable
echo "  → Firewall activé (22, 80, 443) ✓"

# ─── 6. Nginx reverse proxy ───────────────────────────────────────────────────
echo "⚙️ Étape 6/7: Configuration Nginx..."

cat > /etc/nginx/sites-available/itvision << 'NGINX_EOF'
# Upstream vers l'app Docker sur 127.0.0.1:3000
upstream itvision_app {
    server 127.0.0.1:3000;
    keepalive 32;
}

# Rate limiting zones
limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;
limit_req_zone $binary_remote_addr zone=login:10m rate=1r/s;

server {
    listen 80;
    server_name itvisionplus.sn www.itvisionplus.sn market.itvisionplus.sn;

    # Health check
    location /health {
        access_log off;
        return 200 "healthy\n";
        add_header Content-Type text/plain;
    }

    # Challenge Let's Encrypt
    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }

    # Redirection HTTPS (activée après obtention du certificat)
    # return 301 https://$server_name$request_uri;

    # Proxy principal
    location / {
        proxy_pass http://itvision_app;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;

        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # Statiques Next.js (cache long)
    location /_next/static {
        proxy_pass http://itvision_app;
        add_header Cache-Control "public, max-age=31536000, immutable";
    }

    # Upload — taille et timeouts étendus
    location /api/upload {
        limit_req zone=api burst=5 nodelay;
        client_max_body_size 150m;
        proxy_pass http://itvision_app;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_connect_timeout 120s;
        proxy_send_timeout 300s;
        proxy_read_timeout 300s;
        proxy_request_buffering off;
    }

    # API — rate limiting global
    location /api/ {
        limit_req zone=api burst=20 nodelay;
        proxy_pass http://itvision_app;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Login — rate limiting strict
    location /api/auth/login {
        limit_req zone=login burst=5 nodelay;
        proxy_pass http://itvision_app;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
NGINX_EOF

ln -sf /etc/nginx/sites-available/itvision /etc/nginx/sites-enabled/itvision
rm -f /etc/nginx/sites-enabled/default
nginx -t
systemctl reload nginx
echo "  → Nginx configuré (HTTP → proxy 127.0.0.1:3000) ✓"

# ─── 7. Dossier app + renouvellement SSL auto ─────────────────────────────────
echo "📁 Étape 7/7: Finalisation..."

# Dossier app
mkdir -p $APP_DIR/docker/mongodb
chown -R $SSH_USER:$SSH_USER $APP_DIR

# Dossier certbot webroot
mkdir -p /var/www/certbot
chmod -R 755 /var/www/certbot

# Cron renouvellement SSL (bi-hebdo)
echo "0 3 * * 1,4 certbot renew --quiet --post-hook 'systemctl reload nginx'" > /etc/cron.d/certbot-renew
chmod 644 /etc/cron.d/certbot-renew

# Swap (utile sur t4g.medium pour éviter OOM pendant les builds)
if [ ! -f /swapfile ]; then
  fallocate -l 2G /swapfile
  chmod 600 /swapfile
  mkswap /swapfile
  swapon /swapfile
  echo '/swapfile none swap sw 0 0' >> /etc/fstab
  echo '  → Swap 2GB créé ✓'
else
  echo '  → Swap déjà présent ✓'
fi

# ─── Résumé ───────────────────────────────────────────────────────────────────
echo ""
echo "================================"
echo "✅ Bootstrap terminé !"
echo "================================"
echo ""
echo "Prochaines étapes :"
echo "  1. Configurer le DNS :"
echo "     $DOMAIN        → A → $(curl -s ifconfig.me)"
echo "     $WWW_DOMAIN     → A → $(curl -s ifconfig.me)"
echo "     $MARKET_DOMAIN  → A → $(curl -s ifconfig.me)"
echo ""
echo "  2. Générer SSL (après propagation DNS) :"
echo "     certbot --nginx -d $DOMAIN -d $WWW_DOMAIN -d $MARKET_DOMAIN --email contact@$DOMAIN --agree-tos --no-eff-email --redirect"
echo ""
echo "  3. Configurer les secrets GitHub (Settings → Secrets → Actions)"
echo "     SSH_HOST, SSH_USER, SSH_KEY, MONGO_ROOT_PASSWORD, etc."
echo ""
echo "  4. Push sur main → le workflow GitHub Actions déploie automatiquement"
echo ""
echo "Vérifications :"
echo "  docker --version"
echo "  docker compose version"
echo "  nginx -t"
echo "  ufw status"
echo "  free -h  (vérifier swap)"
