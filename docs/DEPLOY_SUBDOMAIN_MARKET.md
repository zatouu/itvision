# Déploiement Sous-Domaine Marketplace

## Objectif
Servir `market.itvisionplus.sn` depuis la même app Next.js, en laissant le middleware router les requêtes.

## Prérequis DNS

Ajouter un enregistrement DNS de type **CNAME** (ou A) :

```
market.itvisionplus.sn  CNAME  itvisionplus.sn
```

Ou si vous gérez les IPs directement :

```
market.itvisionplus.sn  A  <IP_EC2>
```

## Configuration Nginx VM (reverse proxy)

Sur l'EC2 actuelle, Nginx tourne directement sur la VM, hors Docker.
Il doit exposer `80/443` et proxyfier vers le container Next.js publié en local sur `127.0.0.1:3000`.

Le point clé est de conserver le header `Host` avec `proxy_set_header Host $host;`.
Sans ce header, le middleware Next.js ne peut pas distinguer `itvisionplus.sn` de `market.itvisionplus.sn`.

### Option A — Un seul bloc server (recommandé)

```nginx
upstream itvision_app {
    server 127.0.0.1:3000;
}

server {
    listen 80;
    server_name itvisionplus.sn www.itvisionplus.sn market.itvisionplus.sn;

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
    }
}
```

### Option B — Blocs séparés (si besoin de certificats SSL distincts)

```nginx
upstream itvision_app {
    server 127.0.0.1:3000;
}

# Site principal
server {
    listen 80;
    server_name itvisionplus.sn www.itvisionplus.sn;

    location / {
        proxy_pass http://itvision_app;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}

# Marketplace
server {
    listen 80;
    server_name market.itvisionplus.sn;

    location / {
        proxy_pass http://itvision_app;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

## SSL (Certbot)

```bash
sudo certbot --nginx -d itvisionplus.sn -d www.itvisionplus.sn -d market.itvisionplus.sn
```

## Docker Compose

Le compose EC2 ne doit pas lancer de container Nginx si Nginx tourne déjà sur la VM.
Le container Next.js doit seulement publier le port `3000` sur l'interface locale :

```yaml
ports:
  - "127.0.0.1:3000:3000"
```

Cette forme permet au Nginx de la VM d'appeler `http://127.0.0.1:3000`, sans exposer directement l'app au public sur toutes les interfaces.

## Variables d'environnement

Assurez-vous que `NEXT_PUBLIC_SITE_URL` correspond au domaine principal :

```env
NEXT_PUBLIC_SITE_URL=https://itvisionplus.sn
```

Le middleware utilise `request.headers.get('host')` pour détecter le sous-domaine.

## Vérification

```bash
curl -H "Host: market.itvisionplus.sn" http://localhost:3000/market
# → doit retourner la landing marketplace

curl -H "Host: itvisionplus.sn" http://localhost:3000/market
# → doit rediriger vers https://market.itvisionplus.sn/market
```

## Récapitulatif des flux

| Requête | Domaine | Route | Action |
|---|---|---|---|
| GET /market | `market.*` | `/market` | Landing marketplace |
| GET /panier | `market.*` | `/panier` | Panier marketplace |
| GET /panier | `itvisionplus.sn` | `/panier` | Redirect 307 → `market.itvisionplus.sn/panier` |
| GET /services | `market.*` | `/services` | Redirect 307 → `itvisionplus.sn/services` |
| GET /portail-entreprise | `market.*` | `/portail-entreprise` | Redirect 307 → `itvisionplus.sn/portail-entreprise` |
