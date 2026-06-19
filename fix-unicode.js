const fs = require('fs');
const f = 'd:\\itvision-1\\src\\app\\achats-groupes\\[groupId]\\page.tsx';
let s = fs.readFileSync(f, 'utf8');
// Remplace le caractère de remplacement U+FFFD par 🔥 (U+1F525) sur la ligne shareAsStatus
s = s.replace(/\uFFFD \*ACHAT GROUPÉ EN COURS !\*/, '\u{1F525} *ACHAT GROUPÉ EN COURS !*');
fs.writeFileSync(f, s, 'utf8');
console.log('Fixed U+FFFD -> U+1F525');
