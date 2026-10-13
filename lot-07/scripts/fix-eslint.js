#!/usr/bin/env node

/**
 * Script d'amélioration automatique du code
 * Corrige automatiquement les erreurs ESLint courantes
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🔧 Démarrage des corrections automatiques...\n');

// 1. Correction des apostrophes non échappées
function fixUnescapedEntities(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  let modified = false;

  // Remplacer les apostrophes dans les chaînes JSX
  const fixes = [
    { pattern: /d'([a-zA-Z])/g, replacement: "d&apos;$1" },
    { pattern: /l'([a-zA-Z])/g, replacement: "l&apos;$1" },
    { pattern: /n'([a-zA-Z])/g, replacement: "n&apos;$1" },
    { pattern: /s'([a-zA-Z])/g, replacement: "s&apos;$1" },
    { pattern: /c'([a-zA-Z])/g, replacement: "c&apos;$1" },
    { pattern: /qu'([a-zA-Z])/g, replacement: "qu&apos;$1" },
  ];

  fixes.forEach(fix => {
    if (fix.pattern.test(content)) {
      content = content.replace(fix.pattern, fix.replacement);
      modified = true;
    }
  });

  if (modified) {
    fs.writeFileSync(filePath, content);
    console.log(`✅ Apostrophes corrigées dans: ${filePath}`);
  }
}

// 2. Suppression des imports inutilisés
function removeUnusedImports(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');
  let modified = false;

  // Identifier les imports non utilisés (logique simplifiée)
  const importRegex = /import\s*{\s*([^}]+)\s*}\s*from/;
  
  lines.forEach((line, index) => {
    const match = line.match(importRegex);
    if (match) {
      const imports = match[1].split(',').map(imp => imp.trim());
      const usedImports = imports.filter(imp => {
        const regex = new RegExp(`\\b${imp}\\b`, 'g');
        const occurrences = (content.match(regex) || []).length;
        return occurrences > 1; // Plus d'une occurrence (import + utilisation)
      });
      
      if (usedImports.length !== imports.length && usedImports.length > 0) {
        lines[index] = line.replace(match[1], usedImports.join(', '));
        modified = true;
      } else if (usedImports.length === 0) {
        lines[index] = ''; // Supprimer la ligne d'import complètement
        modified = true;
      }
    }
  });

  if (modified) {
    content = lines.join('\n');
    fs.writeFileSync(filePath, content);
    console.log(`✅ Imports nettoyés dans: ${filePath}`);
  }
}

// 3. Correction des variables let en const
function fixLetToConst(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  let modified = false;

  // Remplacer let par const pour les variables non réassignées
  const letRegex = /let\s+(\w+)\s*=/g;
  let match;
  
  while ((match = letRegex.exec(content)) !== null) {
    const varName = match[1];
    const assignmentRegex = new RegExp(`\\b${varName}\\s*=(?!=)`, 'g');
    const assignments = content.match(assignmentRegex) || [];
    
    if (assignments.length === 1) { // Seulement l'assignation initiale
      content = content.replace(match[0], match[0].replace('let', 'const'));
      modified = true;
    }
  }

  if (modified) {
    fs.writeFileSync(filePath, content);
    console.log(`✅ Variables let→const corrigées dans: ${filePath}`);
  }
}

// Parcourir tous les fichiers TypeScript/React
function processFiles(dir) {
  const files = fs.readdirSync(dir);
  
  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory() && !file.startsWith('.') && file !== 'node_modules') {
      processFiles(filePath);
    } else if (file.endsWith('.tsx') || file.endsWith('.ts')) {
      console.log(`🔍 Traitement de: ${filePath}`);
      
      try {
        fixUnescapedEntities(filePath);
        removeUnusedImports(filePath);
        fixLetToConst(filePath);
      } catch (error) {
        console.error(`❌ Erreur lors du traitement de ${filePath}:`, error.message);
      }
    }
  });
}

// Exécution principale
try {
  console.log('📁 Traitement des fichiers dans src/...\n');
  processFiles('./src');
  
  console.log('\n🎯 Exécution d\'ESLint avec correction automatique...');
  execSync('npm run lint -- --fix', { stdio: 'inherit' });
  
  console.log('\n✨ Corrections terminées avec succès !');
  console.log('\n📋 Prochaines étapes recommandées:');
  console.log('   1. Vérifiez les changements avec: git diff');
  console.log('   2. Testez l\'application: npm run dev');
  console.log('   3. Lancez les tests: npm test (si disponible)');
  
} catch (error) {
  console.error('\n❌ Erreur lors des corrections:', error.message);
  process.exit(1);
}