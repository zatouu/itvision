# Tests E2E — Mode distant (déploiement en ligne)

## Prérequis

Les utilisateurs de test doivent exister sur le déploiement :

| Rôle | Email par défaut | Mot de passe |
|---|---|---|
| Admin | `e2e-admin@itvision.sn` | `test123` |
| Client | `e2e-client@itvision.sn` | `test123` |
| Technicien | `e2e-tech@itvision.sn` | `test123` |

## Configuration

Créer un fichier `tests/.env.remote` (non versionné) :

```bash
PLAYWRIGHT_BASE_URL=https://itvisionplus.sn
E2E_ADMIN_EMAIL=e2e-admin@itvision.sn
E2E_ADMIN_PASSWORD=test123
E2E_CLIENT_EMAIL=e2e-client@itvision.sn
E2E_CLIENT_PASSWORD=test123
E2E_TECH_EMAIL=e2e-tech@itvision.sn
E2E_TECH_PASSWORD=test123
```

## Exécution

```bash
# Charger la config et lancer les tests
export $(cat tests/.env.remote | xargs) && npm run test:e2e

# Ou en une ligne
PLAYWRIGHT_BASE_URL=https://itvisionplus.sn E2E_ADMIN_PASSWORD=test123 npm run test:e2e
```

## Mode local (défaut)

Sans `PLAYWRIGHT_BASE_URL`, Playwright démarre automatiquement le serveur Next.js :

```bash
npm run test:e2e
```

## Notes

- En mode distant, les données de test (interventions, rapports, contrats) doivent exister sur le déploiement. Les tests de création de données sont ignorés (`skip`) si elles ne sont pas trouvées.
- Les tests de navigation UI fonctionnent toujours en mode distant (login, portail, planning).
- Le cleanup DB est désactivé en mode distant.
