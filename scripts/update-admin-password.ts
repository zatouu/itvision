/**
 * Script pour mettre à jour le mot de passe de l'utilisateur admin
 * Usage: npm run update:admin-password ou tsx scripts/update-admin-password.ts
 */

import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import * as readline from 'readline';
import { config } from 'dotenv';
import { resolve } from 'path';

// Charger les variables d'environnement
config({ path: resolve(process.cwd(), '.env.local') });

const UserSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  passwordHash: { type: String, required: true },
  name: { type: String, required: true },
  avatarUrl: { type: String },
  phone: { type: String },
  role: { 
    type: String, 
    enum: ['CLIENT', 'TECHNICIAN', 'ADMIN', 'PRODUCT_MANAGER'], 
    default: 'CLIENT', 
    index: true 
  },
  isActive: { type: Boolean, default: true, index: true },
  loginAttempts: { type: Number, default: 0 },
  lockedUntil: { type: Date },
  twoFactorEnabled: { type: Boolean, default: false },
  twoFactorCode: { type: String },
  twoFactorExpires: { type: Date },
  passwordResetToken: { type: String },
  passwordResetExpires: { type: Date },
}, { timestamps: true });

const User = mongoose.models.User || mongoose.model('User', UserSchema);

function askQuestion(query: string): Promise<string> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  return new Promise((resolve) => {
    rl.question(query, (answer) => {
      rl.close();
      resolve(answer);
    });
  });
}

async function updateAdminPassword() {
  try {
    // Connexion via Docker exec mongosh
    console.log('🔌 Utilisation de Docker pour se connecter à MongoDB...');
    
    // Utiliser une connexion directe via docker exec
    const { exec } = require('child_process');
    const util = require('util');
    const execPromise = util.promisify(exec);
    
    // D'abord, vérifier si l'utilisateur existe
    const checkUser = await execPromise(
      'docker exec itvision-mongodb mongosh -u itvision_app -p AppPassword123 --authenticationDatabase itvision_db itvision_db --quiet --eval "db.users.findOne({email: \\"admin@itvision.sn\\"})"'
    );
    
    // Demander le nouveau mot de passe
    const password = await askQuestion('Nouveau mot de passe pour admin@itvision.sn (ou Entrée pour "admin123"): ') || 'admin123';
    
    // Hasher le mot de passe avec Node.js
    const hashedPassword = await bcrypt.hash(password, 12);
    
    // Mettre à jour via docker exec avec le hash
    const updateScript = `
      db = db.getSiblingDB('itvision_db');
      const result = db.users.updateOne(
        { email: 'admin@itvision.sn' },
        { 
          $set: { 
            username: 'admin',
            passwordHash: '${hashedPassword}',
            role: 'ADMIN',
            isActive: true
          }
        }
      );
      print('Utilisateurs mis à jour: ' + result.modifiedCount);
    `;
    
    // Écrire le script dans un fichier temporaire
    const fs = require('fs');
    const tmpFile = './scripts/tmp-update-admin.js';
    fs.writeFileSync(tmpFile, updateScript);
    
    // Exécuter via docker
    const { stdout, stderr } = await execPromise(
      `docker exec -i itvision-mongodb mongosh -u itvision_app -p AppPassword123 --authenticationDatabase itvision_db itvision_db < ${tmpFile}`
    );
    
    console.log(stdout);
    if (stderr) console.error(stderr);
    
    // Nettoyer
    fs.unlinkSync(tmpFile);
    
    console.log('\n✅ Mot de passe mis à jour avec succès!');
    console.log(`\n📋 Informations de connexion:`);
    console.log(`   Username: admin`);
    console.log(`   Email: admin@itvision.sn`);
    console.log(`   Mot de passe: ${password}`);
    console.log(`   Role: ADMIN`);
    
    process.exit(0);
  } catch (error: any) {
    console.error('❌ Erreur:', error.message);
    if (error.stdout) console.log('Stdout:', error.stdout);
    if (error.stderr) console.error('Stderr:', error.stderr);
    process.exit(1);
  }
}

// Exécuter le script
updateAdminPassword();



