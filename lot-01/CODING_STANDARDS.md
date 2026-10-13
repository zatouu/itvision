# Guide des Bonnes Pratiques - IT Vision

## 🎯 Standards de Code

### TypeScript
- ✅ **Utilisez des types explicites** au lieu de `any`
- ✅ **Préférez `const`** à `let` quand possible
- ✅ **Nommage cohérent** : camelCase pour variables, PascalCase pour composants
- ❌ **Évitez `any`** - utilisez des interfaces ou types unions

```typescript
// ✅ Bon
interface User {
  id: string;
  name: string;
  role: 'admin' | 'client' | 'technician';
}

// ❌ Éviter
const user: any = { id: '1', name: 'John' };
```

### React/JSX
- ✅ **Échappez les apostrophes** avec `&apos;`
- ✅ **Composants fonctionnels** avec hooks
- ✅ **Props typées** avec interfaces
- ✅ **Gestion d'état locale** avec useState/useReducer

```jsx
// ✅ Bon
<p>L&apos;équipe d&apos;experts</p>

// ❌ Éviter
<p>L'équipe d'experts</p>
```

### Hooks React
- ✅ **Dépendances complètes** dans useEffect
- ✅ **Cleanup functions** pour éviter les fuites mémoire
- ✅ **Custom hooks** pour la logique réutilisable

```typescript
// ✅ Bon
useEffect(() => {
  fetchData();
}, [userId, filter]); // Toutes les dépendances

// ❌ Éviter
useEffect(() => {
  fetchData();
}, []); // Dépendances manquantes
```

## 🔒 Sécurité

### Variables d'environnement
- ✅ **Préfixez** les variables publiques avec `NEXT_PUBLIC_`
- ✅ **Validez** les variables requises au démarrage
- ❌ **Ne commitez jamais** les fichiers `.env.local`

### API Routes
- ✅ **Validez** toutes les entrées utilisateur
- ✅ **Rate limiting** sur les endpoints sensibles
- ✅ **Authentification** requise pour les routes protégées
- ✅ **Logs de sécurité** pour les actions critiques

## 📁 Structure des Fichiers

```
src/
├── app/                 # Pages Next.js 13+ (App Router)
├── components/          # Composants réutilisables
├── lib/                 # Utilitaires et configuration
├── types/               # Définitions TypeScript
└── hooks/               # Custom hooks React
```

## 🎨 Styling

### Tailwind CSS
- ✅ **Classes utilitaires** en priorité
- ✅ **Responsive design** mobile-first
- ✅ **Variables CSS** pour les couleurs personnalisées
- ✅ **Composants** pour les styles complexes

## 🧪 Tests (Recommandé)

### Structure des tests
```
__tests__/
├── components/          # Tests de composants
├── pages/              # Tests d'intégration
└── utils/              # Tests unitaires
```

### Bonnes pratiques
- ✅ **Tests unitaires** pour la logique métier
- ✅ **Tests de composants** avec React Testing Library
- ✅ **Tests d'API** pour les endpoints critiques
- ✅ **Coverage** minimum de 70%

## 🚀 Performance

### Optimisations Next.js
- ✅ **Image optimization** avec next/image
- ✅ **Code splitting** automatique
- ✅ **Static generation** quand possible
- ✅ **Bundle analysis** régulière

### React Performance
- ✅ **React.memo** pour les composants coûteux
- ✅ **useMemo/useCallback** pour les calculs/fonctions
- ✅ **Lazy loading** pour les composants volumineux

## 📋 Checklist Pre-commit

Avant chaque commit, vérifiez :

- [ ] `npm run type-check` passe sans erreur
- [ ] `npm run lint` ne montre aucune erreur critique
- [ ] `npm run build` réussit
- [ ] Tests passent (si implémentés)
- [ ] Variables d'environnement documentées
- [ ] Pas de `console.log` en production
- [ ] Images optimisées
- [ ] Textes internationalisés (si applicable)

## 🔧 Scripts Utiles

```bash
# Vérification complète de la qualité
npm run quality-check

# Correction automatique des erreurs ESLint
npm run lint:fix

# Correction avancée avec script personnalisé
npm run fix-code

# Vérification TypeScript seule
npm run type-check
```

## 📚 Ressources

- [Next.js Best Practices](https://nextjs.org/docs/pages/building-your-application/optimizing)
- [React TypeScript Cheatsheet](https://react-typescript-cheatsheet.netlify.app/)
- [Tailwind CSS Best Practices](https://tailwindcss.com/docs/reusing-styles)
- [ESLint Rules](https://eslint.org/docs/rules/)

---

**Maintenu par l'équipe IT Vision** 🚀
*Dernière mise à jour : Octobre 2024*