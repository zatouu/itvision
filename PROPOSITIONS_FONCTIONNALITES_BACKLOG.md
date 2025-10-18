# Backlog de fonctionnalités – Plateforme IT Vision

> Document vivant à enrichir. Chaque fonctionnalité inclut: description, faisabilité (tech/ops), impact client (apport), dépendances.

## 0. Orchestrateur de Digitalisation PME (agnostique métier)
- Description: Un parcours guidé pour collecter le besoin client (tous secteurs), qualifier les processus à digitaliser, générer automatiquement une proposition (parcours, écrans, données, intégrations), planifier le projet et suivre l’exécution.
- Faisabilité: Haute. Formulaires dynamiques + rules engine (JSON), génération d’un backlog initial (templates), workflow d’approbation, signature et onboarding.
- Apport: Accélère la vente et l’exécution, cadre clair, industrialise la prise en charge multi-secteurs.
- Dépendances: Modèle de données “Process Blueprint”, templates UI/process, connecteurs standards.

### 0.a. Portail Client – Recueil et qualification du besoin
- Description: Wizard multi-étapes (secteur, taille, objectifs, processus à digitaliser, systèmes existants, contraintes) avec scoring d’opportunité et chiffrage indicatif.
- Faisabilité: Haute. Front Next.js + schémas JSON & pondérations; export PDF du besoin.
- Apport: Moins d’ateliers, meilleure précision, cycle de vente raccourci.
- Dépendances: Modèle de questions par secteur, moteurs de scoring.

### 0.b. Blueprint Process – Modélisation rapide
- Description: Mapper les processus (BPMN light), données, rôles, règles, exceptions; générer des écrans mock et une API de base.
- Faisabilité: Moyenne. Éditeur graphique lightweight (diagram-js) et générateurs.
- Apport: Projection rapide, alignement client, réduction des risques.
- Dépendances: Bibliothèque de blocs (formulaire CRUD, approbations, tableau, dashboard).

### 0.c. Devis & Contrat automatisés
- Description: Générer automatiquement devis, planning par lots, livrables, SLA, et contrat; signature électronique.
- Faisabilité: Haute. Templates docs (Docx/PDF), e-sign.
- Apport: Vitesse commerciale, professionnalisme.
- Dépendances: Service signature, templates juridiques.

### 0.d. Onboarding & Projet – Exécution industrialisée
- Description: Backlog JIRA/GitHub auto, environnements (Keycloak, API, DB), pipeline CI/CD, tickets par lot (analyse, build, tests, UAT), reporting hebdo.
- Faisabilité: Haute. Scripts infra, gabarits de repo.
- Apport: Délai de mise en prod réduit, qualité stable.
- Dépendances: DevOps, templates mono/micro-services.

### 0.e. Catalogue de Modules Transverses (agnostiques secteur)
- Description: Modules prêts à l’emploi: CRM léger, tickets, devis/facturation, stock/simple ERP, RH, approbations, documents, notifications, intégrations (O365/Google/WhatsApp/Stripe/Odoo).
- Faisabilité: Haute progressive. Composants réutilisables et adaptables.
- Apport: Time-to-value, coûts maîtrisés, personnalisation.
- Dépendances: Bibliothèque UI/Back réutilisable, contrôles RBAC.

## 1. Assistant Devis AR (Réalité Augmentée)
- Description: Application mobile web (PWA) permettant de scanner les pièces (caméra smartphone), placer virtuellement caméras/lecteurs/DM et générer une proposition.
- Faisabilité: Moyenne. WebAR via WebXR + librairies (8thWall/Zappar/Three.js). Nécessite calibration simple et modèles 3D light. PWA offline-first.
- Apport: Immersion, confiance visuelle, réduction d’allers-retours, meilleure conversion.
- Dépendances: Modèles 3D, UX mobile, device testing.

## 2. Simulation 2D/3D de couverture (Heatmaps)
- Description: Plan importé (image/PDF), placement d’équipements, rendu coverage/angles morts, estimation quantité optimale.
- Faisabilité: Moyenne. Canvas/WebGL, algorithme d’angle de vue, obstacles simples. Export PDF.
- Apport: Transparence technique, optimisation coûts, preuve d’expertise.
- Dépendances: UI plan/drag-drop, moteur géométrique simple.

## 3. Maintenance prédictive IoT
- Description: Monitoring NVR/caméras/switches; anomalies (température, latence, disque), prédiction de pannes, tickets auto.
- Faisabilité: Haute si portée progressive. Agent léger + Prometheus/Telegraf, règles, ML basique ultérieurement.
- Apport: Réduction des pannes, SLA tenus, proactivité différenciante.
- Dépendances: Accès télémétrie, stockage métriques (TSDB), alerting.

## 4. Portail Conformité & Audits
- Description: Tableau conformité (rétention vidéo, RGPD), rapports mensuels, journal d’accès, checklist site.
- Faisabilité: Haute. Reporting périodique + agrégations DB.
- Apport: Confiance, support aux audits client, valeur premium.
- Dépendances: Modèle de données conformité, scheduler.

## 5. Suivi SLA en temps réel
- Description: ETA technicien, replanification 1-clic (web/WhatsApp), visualisation SLA, pénalités/avoirs transparents.
- Faisabilité: Moyenne. Intégration calendrier, géoloc consentie, notifications.
- Apport: Satisfaction client, pilotage engagements, réduction frictions.
- Dépendances: Auth forte, consentement RGPD.

## 6. Triage Incidents assisté par IA
- Description: Upload clip/image → détection (intrusion, flamme, obstruction) → ticket pré-rempli.
- Faisabilité: Moyenne. API Vision (Edge/Cloud) + fine-tuning léger.
- Apport: Gain temps L1, meilleure qualification incidents.
- Dépendances: Stockage objets, file de traitement (queue), coûts IA.

## 7. Devis interactif WhatsApp
- Description: Mini-wizard multi-étapes via WhatsApp (Catalog + formulaires), paiement/validation.
- Faisabilité: Moyenne. WhatsApp Business API / Twilio. Flow builder.
- Apport: Acquisition/conversion directe depuis canal préféré des clients.
- Dépendances: Compte WABA vérifié, passerelle paiement.

## 8. Boutique MRO intelligente (réassort)
- Description: E-shop pièces/consommables, réassort automatique (stock mini), bundles par site, livraison planifiée.
- Faisabilité: Moyenne. Microservice Spring (produits), Keycloak (RBAC), intégration logistique.
- Apport: Revenus récurrents, simplicité pour les clients.
- Dépendances: Catalogue, pricing, logistique.

## 9. Télémaintenance sécurisée
- Description: Diagnostic distant, mises à jour firmware, reset config, scripts safe avec audit.
- Faisabilité: Moyenne. Agents/SSH tunnels, bastion, audit logs.
- Apport: MTTR réduit, moins de déplacements, satisfaction accrue.
- Dépendances: Sécurité réseau, consentement, playbooks.

## 10. KPI Énergie & ROI
- Description: Estimation conso, plages d’extinction, économies, ROI projet.
- Faisabilité: Haute. Calculs & tableaux, capteurs optionnels.
- Apport: Argument économique, RSE.
- Dépendances: Données tarifs énergie, modèles.

## 11. Assistant IA Multilingue (FR/Wolof)
- Description: Chat d’aide contextuel (usage, contrats, maintenance), recherche sémantique docs.
- Faisabilité: Haute. LLM + embeddings, garde-fous.
- Apport: Support 24/7, proximité culturelle, confiance.
- Dépendances: Base de connaissances, vector DB.

## 12. Intégrations & Webhooks
- Description: Connecteurs ERP/Helpdesk, export planning, synchro inventaire/incidents.
- Faisabilité: Haute. Webhooks, API REST.
- Apport: Intégration SI client, réduction ressaisies.
- Dépendances: Spécifications API, clés partenaires.

---

## Roadmap de mise en œuvre (suggestion)
1) Fondations Orchestrateur (0a–0d) + Keycloak; Modules transverses (0e) – MVP
2) Devis WhatsApp, Suivi SLA, Portail conformité, Boutique MRO (lecture)
3) Simulation 2D, IA triage incidents (MVP), KPI Énergie
4) AR Devis (pilote), Maintenance prédictive (v1), Télémaintenance (pilote)
Toujours: Intégrations, Assistant IA
