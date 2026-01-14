/**
 * Script pour créer un utilisateur admin dans MongoDB
 * Usage: npm run create:admin ou tsx scripts/create-admin-user.ts
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

async function createAdminUser() {
  try {
    // Utiliser docker exec pour se connecter directement
    console.log('🔌 Utilisation de Docker pour se connecter à MongoDB...');
    
    const { exec } = require('child_process');
    const util = require('util');
    const execPromise = util.promisify(exec);
    const fs = require('fs');

    // Vérifier si l'utilisateur existe déjà
    const checkScript = `
      db = db.getSiblingDB('itvision_db');
      const user = db.users.findOne({ email: 'admin@itvision.sn' });
      if (user) {
        print(JSON.stringify(user));
      } else {
        print('null');
      }
    `;
    
    const tmpCheckFile = './scripts/tmp-check-user.js';
    fs.writeFileSync(tmpCheckFile, checkScript);
    
    let existingUser: any = null;
    try {
      const { stdout } = await execPromise(
        `docker exec -i itvision-mongodb mongosh -u itvision_app -p AppPassword123 --authenticationDatabase itvision_db itvision_db --quiet < ${tmpCheckFile}`
      );
      if (stdout && stdout.trim() !== 'null' && stdout.trim() !== '') {
        existingUser = JSON.parse(stdout.trim());
      }
    } catch (e) {
      // Ignorer les erreurs de parsing
    }
    fs.unlinkSync(tmpCheckFile);

    if (existingUser) {
      console.log('⚠️  Un utilisateur avec cet email existe déjà:');
      console.log(`   Email: ${existingUser.email}`);
      console.log(`   Role: ${existingUser.role || 'non défini'}`);
      
      const answer = await askQuestion('\nVoulez-vous mettre à jour le mot de passe et le format? (o/n): ');

      if (answer.toLowerCase() !== 'o' && answer.toLowerCase() !== 'oui') {
        console.log('❌ Opération annulée');
        process.exit(0);
      }
    }

    // Utiliser le mot de passe depuis l'argument ou par défaut
    const password = process.argv[2] || 'admin123';
    if (!process.argv[2]) {
      console.log('💡 Utilisation du mot de passe par défaut: admin123');
      console.log('   Pour utiliser un autre mot de passe: npm run create:admin <mot-de-passe>');
    }

    // Hash du mot de passe
    const hashedPassword = await bcrypt.hash(password, 12);

    // Script de mise à jour/création
    const updateScript = `
      db = db.getSiblingDB('itvision_db');
      const result = db.users.updateOne(
        { email: 'admin@itvision.sn' },
        { 
          $set: { 
            username: 'admin',
            email: 'admin@itvision.sn',
            name: 'Administrateur IT Vision',
            phone: '+221774133440',
            passwordHash: '${hashedPassword}',
            role: 'ADMIN',
            isActive: true,
            loginAttempts: 0
          },
          $setOnInsert: {
            createdAt: new Date(),
            updatedAt: new Date()
          }
        },
        { upsert: true }
      );
      print('Utilisateurs modifiés: ' + result.modifiedCount);
      print('Utilisateurs créés: ' + (result.upsertedCount || 0));
    `;
    
    const tmpUpdateFile = './scripts/tmp-update-admin.js';
    fs.writeFileSync(tmpUpdateFile, updateScript);
    
    const { stdout, stderr } = await execPromise(
      `docker exec -i itvision-mongodb mongosh -u itvision_app -p AppPassword123 --authenticationDatabase itvision_db itvision_db < ${tmpUpdateFile}`
    );
    
    console.log(stdout);
    if (stderr) console.error(stderr);
    
    fs.unlinkSync(tmpUpdateFile);

    console.log('\n✅ Utilisateur admin créé/mis à jour avec succès!');
    console.log(`\n📋 Informations de connexion:`);
    console.log(`   Username: admin`);
    console.log(`   Email: admin@itvision.sn`);
    console.log(`   Mot de passe: ${password}`);
    console.log(`   Role: ADMIN`);
    console.log(`\n🔐 Gardez ces informations en sécurité!`);

    process.exit(0);
  } catch (error: any) {
    console.error('❌ Erreur:', error.message);
    if (error.stdout) console.log('Stdout:', error.stdout);
    if (error.stderr) console.error('Stderr:', error.stderr);
    process.exit(1);
  }
}

// Exécuter le script
createAdminUser();

