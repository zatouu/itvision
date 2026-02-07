// Script pour générer des icônes PNG pour l'extension Chrome
const fs = require('fs');
const path = require('path');

// PNG minimal valide (1x1 pixel orange #f97316)
const png16 = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAABHNCSVQICAgIfAhkiAAAAAlwSFlzAAAAbwAAAG8B8AHv1gAAABl0RVh0U29mdHdhcmUAd3d3Lmlua3NjYXBlLm9yZ5vuPBoAAABcSURBVDiNY/z//z8DbsAEpGlmQApiw8ZGBkYmJiZmJiZmZmZmZmZmZmZmZmZmZmZmZmZmZmZmZmZmZmZmZmZmZmZmZmZmZmZmZmZmZmZmZmZmZmZmZmYGAACNBAT8VGIz9wAAAABJRU5ErkJggg==', 'base64');

const png32 = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAAABHNCSVQICAgIfAhkiAAAAAlwSFlzAAAA2wAAANsBpI0nPAAAABl0RVh0U29mdHdhcmUAd3d3Lmlua3NjYXBlLm9yZ5vuPBoAAABjSURBVFiNY/z//z8DbsAEpGlmQApiw8ZGBkYmJiZmJiZmZmZmZmZmZmZmZmZmZmZmZmZmZmZmZmZmZmZmZmZmZmZmZmZmZmZmZmZmZmZmZmZmZmZmZmYGAACNBAT8VGIz9wAAAABJRU5ErkJggg==', 'base64');

const png48 = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAADAAAAAwCAYAAABXAvmHAAAABHNCSVQICAgIfAhkiAAAAAlwSFlzAAABggAAAYIBQJf8RgAAABl0RVh0U29mdHdhcmUAd3d3Lmlua3NjYXBlLm9yZ5vuPBoAAABkSURBVGiNY/z//z8DbsAEpGlmQApiw8ZGBkYmJiZmJiZmZmZmZmZmZmZmZmZmZmZmZmZmZmZmZmZmZmZmZmZmZmZmZmZmZmZmZmZmZmZmZmZmZmZmZmYGAACNBAT8VGIz9wAAAABJRU5ErkJggg==', 'base64');

const png128 = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAIAAAACACAYAAADDPmHLAAAABHNCSVQICAgIfAhkiAAAAAlwSFlzAAAOxAAADsQBlSsOGwAAABl0RVh0U29mdHdhcmUAd3d3Lmlua3NjYXBlLm9yZ5vuPBoAAABmSURBVHja7cExAQAAAMKg9U9tCF8gAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAB4GqT5AAH/8SfoAAAAAElFTkSuQmCC', 'base64');

const iconsDir = path.join(__dirname, 'icons');

// Créer dossier si inexistant
if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true });
}

// Écrire fichiers PNG
fs.writeFileSync(path.join(iconsDir, 'icon16.png'), png16);
fs.writeFileSync(path.join(iconsDir, 'icon32.png'), png32);
fs.writeFileSync(path.join(iconsDir, 'icon48.png'), png48);
fs.writeFileSync(path.join(iconsDir, 'icon128.png'), png128);

console.log('✅ Icônes PNG générées:');
console.log('  - icon16.png');
console.log('  - icon32.png');
console.log('  - icon48.png');
console.log('  - icon128.png');
