/**
 * Script pour créer un utilisateur admin dans MongoDB
 * Usage: node scripts/create-admin-user.js
 */

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config({ path: '.env.local' });

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

async function createAdminUser() {
  try {
    // Connexion à MongoDB
    const mongoUri = process.env.MONGODB_URI;
    if (!mongoUri) throw new Error('MONGODB_URI requis');
    console.log('🔌 Connexion à MongoDB...');
    await mongoose.connect(mongoUri);
    console.log('✅ Connecté à MongoDB');

    // Informations de l'admin
    const adminData = {
      username: 'admin',
      email: 'admin@itvision.sn',
      name: 'Administrateur IT Vision',
      phone: '+221774133440',
      role: 'ADMIN',
      isActive: true,
    };

    // Vérifier si l'admin existe déjà
    const existingUser = await User.findOne({
      $or: [
        { username: adminData.username },
        { email: adminData.email }
      ]
    });

    if (existingUser) {
      console.log('⚠️  Un utilisateur avec ce username ou email existe déjà:');
      console.log(`   Username: ${existingUser.username}`);
      console.log(`   Email: ${existingUser.email}`);
      console.log(`   Role: ${existingUser.role}`);
      
      // Demander si on veut mettre à jour le mot de passe
      const readline = require('readline');
      const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
      });

      const answer = await new Promise((resolve) => {
        rl.question('\nVoulez-vous mettre à jour le mot de passe? (o/n): ', resolve);
      });
      rl.close();

      if (answer.toLowerCase() !== 'o' && answer.toLowerCase() !== 'oui') {
        console.log('❌ Opération annulée');
        await mongoose.connection.close();
        process.exit(0);
      }

      // Mettre à jour le mot de passe
      const password = await new Promise((resolve) => {
        const rl2 = readline.createInterface({
          input: process.stdin,
          output: process.stdout
        });
        rl2.question('Nouveau mot de passe: ', (pwd) => {
          rl2.close();
          resolve(pwd);
        });
      });

      const hashedPassword = await bcrypt.hash(password, 12);
      existingUser.passwordHash = hashedPassword;
      existingUser.role = 'ADMIN';
      existingUser.isActive = true;
      await existingUser.save();

      console.log('✅ Mot de passe mis à jour pour l\'utilisateur admin');
      console.log(`\n📋 Informations de connexion:`);
      console.log(`   Username: ${existingUser.username}`);
      console.log(`   Email: ${existingUser.email}`);
      console.log(`   Mot de passe: ${password}`);
      console.log(`   Role: ${existingUser.role}`);
      
      await mongoose.connection.close();
      process.exit(0);
    }

    // Demander le mot de passe
    const readline = require('readline');
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });

    const password = await new Promise((resolve) => {
      rl.question('Mot de passe pour l\'admin (ou appuyez sur Entrée pour "admin123"): ', (pwd) => {
        rl.close();
        resolve(pwd || 'admin123');
      });
    });

    // Hash du mot de passe
    const hashedPassword = await bcrypt.hash(password, 12);

    // Créer l'utilisateur admin
    const admin = await User.create({
      ...adminData,
      passwordHash: hashedPassword
    });

    console.log('\n✅ Utilisateur admin créé avec succès!');
    console.log(`\n📋 Informations de connexion:`);
    console.log(`   Username: ${admin.username}`);
    console.log(`   Email: ${admin.email}`);
    console.log(`   Mot de passe: ${password}`);
    console.log(`   Role: ${admin.role}`);
    console.log(`\n🔐 Gardez ces informations en sécurité!`);

    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error('❌ Erreur:', error.message);
    if (error.code === 11000) {
      console.error('   Un utilisateur avec ce username ou email existe déjà');
    }
    await mongoose.connection.close();
    process.exit(1);
  }
}

// Exécuter le script
createAdminUser();



