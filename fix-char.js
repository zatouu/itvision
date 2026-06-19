const fs = require('fs');
const path = 'd:\\itvision-1\\src\\app\\achats-groupes\\[groupId]\\page.tsx';
let data = fs.readFileSync(path, 'utf8');
// Le caractère corrompu est le replacement character U+FFFD (affiché)
// ou potentiellement un autre byte invalide. On remplace la ligne entière.
const oldLine = '      ` *ACHAT GROUPÉ EN COURS !*\\n\\n` +';
const newLine = '      `🔥 *ACHAT GROUPÉ EN COURS !*\\n\\n` +';
if (data.includes(oldLine)) {
  data = data.replace(oldLine, newLine);
  fs.writeFileSync(path, data, 'utf8');
  console.log('Fixed');
} else {
  console.log('Pattern not found, trying fallback');
  // Fallback: replace any line starting with backtick + space + *ACHAT
  data = data.replace(/`\s*\*ACHAT GROUPÉ EN COURS !\*/, '`🔥 *ACHAT GROUPÉ EN COURS !*');
  fs.writeFileSync(path, data, 'utf8');
  console.log('Fallback applied');
}
