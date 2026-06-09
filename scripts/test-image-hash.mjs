import { EMBEDDING_LENGTH, similarityScore } from '../src/lib/image-hash.js'

console.log('EMBEDDING_LENGTH:', EMBEDDING_LENGTH)

const a = Array(EMBEDDING_LENGTH).fill(0)
const b = Array(EMBEDDING_LENGTH).fill(0)
b[0] = 1

console.log('Same score:', similarityScore(a, a))
console.log('1-bit diff:', similarityScore(a, b))

// Test avec vrai buffer
import { readFileSync } from 'fs'
const buf = readFileSync('scripts/test-image-hash.mjs') // n'importe quel fichier
import { computeImageEmbedding } from '../src/lib/image-hash.js'
try {
  const result = await computeImageEmbedding(buf)
  console.log('Embedding length:', result.embedding.length)
  console.log('Hash hex length:', result.hashHex.length)
  console.log('Width:', result.width)
  console.log('Height:', result.height)
} catch (e) {
  console.log('Expected error (not an image):', e.message)
}
