const fs = require('fs');
const src = 'd:\\itvision-1\\src\\app\\achats-groupes\\[groupId]\\page.tsx.backup.2026-06-17';
const dst = 'd:\\itvision-1\\src\\app\\achats-groupes\\[groupId]\\page.tsx';
fs.copyFileSync(src, dst);
console.log('Restored');
