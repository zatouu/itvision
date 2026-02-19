// Script pour créer un client test et déclencher l'envoi d'email
db = db.getSiblingDB('itvision_db');

// Supprimer le client test s'il existe déjà
db.clients.deleteOne({ email: 'cheikhoumarndiaye@gmail.com' });
db.users.deleteOne({ email: 'cheikhoumarndiaye@gmail.com' });

print('✅ Client test supprimé (s\'il existait)');
print('');
print('📧 Pour tester l\'envoi d\'email, créez un nouveau client depuis l\'interface admin :');
print('   1. Allez sur https://itvisionplus.sn/admin');
print('   2. Cliquez sur "Clients" puis "Nouveau Client"');
print('   3. Remplissez :');
print('      - Nom: Cheikh Oumar Ndiaye');
print('      - Email: cheikhoumarndiaye@gmail.com');
print('      - Téléphone: +221771234567');
print('      - ✅ Cochez "Accès Portail"');
print('   4. Cliquez sur "Créer"');
print('');
print('📨 L\'email d\'activation sera envoyé automatiquement à cheikhoumarndiaye@gmail.com');
print('');
print('Configuration SMTP actuelle :');
print('   - Serveur: ssl0.ovh.net:465');
print('   - Expéditeur: contact@itvisionplus.sn');
