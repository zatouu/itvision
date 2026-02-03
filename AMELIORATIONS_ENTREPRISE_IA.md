# Améliorations Entreprise & Intelligence Artificielle (Vision "Deux Usines")

Ce document détaille la stratégie pour transformer la gestion IT Vision en une entreprise pilotée par l'IA et des workflows modernes.

## 🏭 Usine 1 : Le Produit (Gestion Opérationnelle)

L'objectif est de fluidifier le passage du "Prospect" à l'"Encaissement" sans friction.

### 1. Workflow Intégré (Le "Pipeline")
Actuellement, les modules sont isolés. Nous allons créer des ponts :
- **Devis → Projet** : Un bouton "Gagner & Lancer Projet" sur un devis accepté. Cela crée automatiquement le projet avec le budget défini.
- **Devis → Facture** : Un bouton "Convertir en Facture" pour éviter de ressaisir les articles.
- **Projet → Facture** : Facturation à l'avancement (ex: "Facturer 30% d'acompte" ou "Facturer Jalon 1").

### 2. Portail Client B2B (Miroir de transparence)
Donner aux clients entreprises (Coralia, etc.) un accès VIP :
- **Tableau de bord** : Vue globale de tous leurs projets actifs.
- **Facturation** : Téléchargement autonome des factures (allège votre support).
- **Tickets** : Suivi des incidents en temps réel.

---

## 🧠 Usine 2 : L'Intelligence (IA & Automatisation)

C'est ici que la compétitivité se joue. L'IA ne doit pas juste "générer du texte", elle doit "gérer des processus".

### 🤖 Agent 1 : Le Recouvrement Intelligent ("Dunning AI")
*Concept : Une IA qui déteste les impayés, mais reste polie.*
- **Tâche** : Scanne les factures tous les matins.
- **Action** : Identifie les retards (J+3, J+10, J+30).
- **Exécution** :
  - J+3 : Envoie un mail rappel "Doux" (automatique).
  - J+15 : Prépare un mail "Ferme" (demande validation admin).
  - J+30 : Notifie le directeur commercial par SMS.

### 🤖 Agent 2 : Le Comptable Augmenté ("Expense AI")
*Concept : Ne plus jamais saisir une note de frais manuellement.*
- **Interface** : Page d'upload ou Dossier partagé (Drive/Dropbox).
- **Tâche** : Analyse les photos de reçus/factures fournisseurs (PDF/JPG).
- **Extraction** : Détecte Date, Montant HT/TTC, Vendeur, Catégorie.
- **Imputation** : Suggère d'affecter la dépense au Projet X ou Y pour calculer la marge réelle.

### 🤖 Agent 3 : L'Architecte Avant-Vente (Extension du Générateur actuel)
- **Tâche** : Analyse l'historique des devis acceptés/refusés.
- **Action** : Suggère le "Prix Parfait" lors de la création d'un devis. "Attention, pour ce client Coralia, une marge de 35% passe généralement, mais 40% est souvent refusé".

---

## 📉 Comptabilité Analytique Moderne

Pour piloter l'entreprise, le Dashboard actuel (Ventes seules) est insuffisant. Il faut passer au **P&L (Profit & Loss)**.

### Nouvelle Structure de Données proposée :
1.  **Revenus** (Factures Clients Validées)
2.  **Coûts Directs / COGS** (Achats Matériel 1688/AliExpress liés au projet)
3.  **Dépenses Opérationnelles** (Salaires, Loyer, Logiciels - Saisis via Agent 2)
4.  **Résultat Net** = (1) - (2) - (3)

### Vue "Rentabilité Projet"
Chaque projet aura sa propre mini-comptabilité :
- Vendu : 5.000.000 FCFA
- Matériel : -1.500.000 FCFA
- Main d'oeuvre (Heures Techniciens) : -500.000 FCFA
- **Marge Réelle : 3.000.000 FCFA (60%)**

---

## 🛠 Plan d'Action Immédiat

1.  ✅ **Rétablir l'accès Factures** (Fait).
2.  🛠 **Connecteur Devis → Facture** : Bouton de conversion immédiate.
3.  🛠 **Module Dépenses** : Création de la table `Expenses` et interface de saisie.
4.  🤖 **Mise en place Agent Recouvrement** (Script CRON journalier).
