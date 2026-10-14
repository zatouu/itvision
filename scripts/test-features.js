#!/usr/bin/env node

/**
 * Script de test des nouvelles fonctionnalités IT Vision Plus
 * Usage: node scripts/test-features.js
 */

const https = require('https');
const http = require('http');

// Configuration
const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
const TEST_EMAIL = 'test@example.com';
const TEST_PASSWORD = 'TestPassword123!';

// Utilitaires
function makeRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const protocol = url.startsWith('https') ? https : http;
    const req = protocol.request(url, options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          resolve({ status: res.statusCode, data: parsed });
        } catch (e) {
          resolve({ status: res.statusCode, data: data });
        }
      });
    });
    
    req.on('error', reject);
    
    if (options.body) {
      req.write(options.body);
    }
    
    req.end();
  });
}

// Tests
async function testEmailAvailability() {
  console.log('🔍 Test de vérification d\'email...');
  
  try {
    const response = await makeRequest(`${BASE_URL}/api/auth/register?email=${TEST_EMAIL}`);
    
    if (response.status === 200) {
      console.log('✅ API de vérification d\'email fonctionne');
      console.log(`   Email ${TEST_EMAIL} disponible: ${response.data.available}`);
    } else {
      console.log('❌ Erreur API de vérification d\'email:', response.status);
    }
  } catch (error) {
    console.log('❌ Erreur de connexion:', error.message);
  }
}

async function testPasswordReset() {
  console.log('🔐 Test de reset de mot de passe...');
  
  try {
    const response = await makeRequest(`${BASE_URL}/api/auth/forgot`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ email: TEST_EMAIL })
    });
    
    if (response.status === 200 && response.data.success) {
      console.log('✅ API de reset de mot de passe fonctionne');
      console.log('   Email de reset envoyé (ou simulé)');
    } else {
      console.log('❌ Erreur API de reset:', response.status, response.data);
    }
  } catch (error) {
    console.log('❌ Erreur de connexion:', error.message);
  }
}

async function testRegistration() {
  console.log('👤 Test d\'inscription...');
  
  const userData = {
    name: 'Test User',
    email: `test-${Date.now()}@example.com`,
    password: TEST_PASSWORD,
    role: 'CLIENT'
  };
  
  try {
    const response = await makeRequest(`${BASE_URL}/api/auth/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(userData)
    });
    
    if (response.status === 201 && response.data.success) {
      console.log('✅ API d\'inscription fonctionne');
      console.log(`   Utilisateur créé: ${response.data.user.email}`);
    } else {
      console.log('❌ Erreur API d\'inscription:', response.status, response.data);
    }
  } catch (error) {
    console.log('❌ Erreur de connexion:', error.message);
  }
}

async function testPasswordValidation() {
  console.log('🛡️ Test de validation de mot de passe...');
  
  const { validatePassword } = require('../src/lib/password-validator.ts');
  
  const testCases = [
    { password: '123', expected: false },
    { password: 'password', expected: false },
    { password: 'Password123', expected: false },
    { password: 'Password123!', expected: true }
  ];
  
  testCases.forEach(({ password, expected }) => {
    try {
      const result = validatePassword(password);
      const passed = result.isValid === expected;
      console.log(`${passed ? '✅' : '❌'} "${password}" -> ${result.isValid} (attendu: ${expected})`);
    } catch (error) {
      console.log(`❌ Erreur validation "${password}":`, error.message);
    }
  });
}

async function checkEnvironmentVariables() {
  console.log('🔧 Vérification des variables d\'environnement...');
  
  const requiredVars = [
    'MONGODB_URI',
    'JWT_SECRET',
    'NEXTAUTH_SECRET'
  ];
  
  const optionalVars = [
    'SMTP_HOST',
    'SMTP_USER',
    'SMTP_PASS'
  ];
  
  requiredVars.forEach(varName => {
    if (process.env[varName]) {
      console.log(`✅ ${varName} configuré`);
    } else {
      console.log(`❌ ${varName} manquant (requis)`);
    }
  });
  
  optionalVars.forEach(varName => {
    if (process.env[varName]) {
      console.log(`✅ ${varName} configuré`);
    } else {
      console.log(`⚠️  ${varName} non configuré (optionnel pour dev)`);
    }
  });
}

// Exécution des tests
async function runTests() {
  console.log('🚀 Tests des nouvelles fonctionnalités IT Vision Plus\n');
  
  await checkEnvironmentVariables();
  console.log('');
  
  await testEmailAvailability();
  console.log('');
  
  await testPasswordReset();
  console.log('');
  
  await testRegistration();
  console.log('');
  
  // testPasswordValidation();
  console.log('');
  
  console.log('✨ Tests terminés !');
  console.log('\n📝 Pour tester manuellement :');
  console.log(`   - Inscription: ${BASE_URL}/register`);
  console.log(`   - Connexion: ${BASE_URL}/login`);
  console.log(`   - Reset mot de passe: ${BASE_URL}/forgot-password`);
}

// Gestion des erreurs non capturées
process.on('unhandledRejection', (error) => {
  console.error('❌ Erreur non gérée:', error);
  process.exit(1);
});

// Lancement
if (require.main === module) {
  runTests().catch(console.error);
}

module.exports = { runTests };