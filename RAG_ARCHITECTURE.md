# Architecture RAG (Retrieval-Augmented Generation) pour le Chatbot

## 📋 Vue d'ensemble

Système RAG pour enrichir le chatbot avec vos documents PDFs et textes, permettant des réponses contextuelles basées sur votre base de connaissances.

## 🏗️ Architecture proposée

### 1. **Upload et Traitement des Documents**
- API `/api/rag/documents/upload` pour uploader PDFs et textes
- Extraction de texte depuis PDFs (bibliothèque `pdf-parse` ou `pdfjs-dist`)
- Chunking intelligent des documents (segments de 500-1000 tokens)
- Stockage des métadonnées (titre, type, date, auteur, etc.)

### 2. **Génération d'Embeddings**
- Utilisation d'un modèle d'embeddings :
  - **Option 1** : OpenAI Embeddings (`text-embedding-3-small` ou `3-large`)
  - **Option 2** : Modèles open-source (via Hugging Face) : `sentence-transformers/all-MiniLM-L6-v2`
  - **Option 3** : API locale (si vous avez un serveur dédié)

### 3. **Base de Données Vectorielle**
- **Option A** : MongoDB avec indexes vectoriels (MongoDB Atlas Search)
- **Option B** : MongoDB + collection `DocumentChunks` avec embeddings
- **Option C** : Base dédiée (Pinecone, Weaviate, Qdrant) - plus performant mais externalisé

### 4. **Recherche Sémantique**
- API `/api/rag/search` pour recherche par similarité
- Calcul de similarité cosinus entre query et documents
- Retour des top-K chunks les plus pertinents
- Filtrage optionnel par métadonnées (type de document, date, etc.)

### 5. **Intégration avec le Chatbot**
- Modification de `SmartChatbot.tsx` pour appeler l'API RAG
- Si contexte trouvé → réponse enrichie avec citations
- Si aucun contexte → fallback sur réponses prédéfinies actuelles
- Affichage des sources dans les réponses

### 6. **Interface Admin**
- Page `/admin/knowledge-base` pour :
  - Upload de documents
  - Visualisation de la base de connaissances
  - Suppression/édition de documents
  - Prévisualisation des chunks

## 📦 Dépendances nécessaires

```json
{
  "pdf-parse": "^1.1.1",  // Extraction texte PDF
  "@types/pdf-parse": "^1.1.4",
  "openai": "^4.20.0",  // Pour embeddings OpenAI (optionnel)
  // OU
  "@xenova/transformers": "^2.17.0"  // Modèles open-source locaux
}
```

## 🔄 Flux de traitement

### Upload d'un document :
```
1. User upload PDF → /api/rag/documents/upload
2. Extraction texte → Chunking (segments de 500-1000 mots)
3. Génération embeddings pour chaque chunk
4. Stockage dans MongoDB :
   - Collection `DocumentChunks` avec :
     - text: string
     - embedding: number[]
     - metadata: { title, type, page, etc. }
     - documentId: ObjectId
5. Retour succès à l'admin
```

### Recherche dans le chat :
```
1. User pose question → /api/rag/search
2. Génération embedding de la question
3. Recherche par similarité dans DocumentChunks
4. Retour top 3-5 chunks pertinents
5. Intégration dans le prompt du LLM (si utilisé)
   OU
   Réponse directe avec contexte extrait
```

## 📊 Schéma MongoDB

```typescript
// Document
{
  _id: ObjectId,
  title: string,
  type: 'pdf' | 'text' | 'markdown',
  filename: string,
  uploadedAt: Date,
  uploadedBy: ObjectId (userId),
  metadata: {
    author?: string,
    pages?: number,
    language?: 'fr' | 'en'
  }
}

// DocumentChunk
{
  _id: ObjectId,
  documentId: ObjectId,
  chunkIndex: number,
  text: string,
  embedding: number[],  // Array de 384 ou 1536 dimensions selon modèle
  metadata: {
    page?: number,
    section?: string,
    startChar?: number,
    endChar?: number
  }
}
```

## 🎯 Avantages de cette approche

1. **Pas de dépendance externe coûteuse** (si on utilise modèles open-source)
2. **Contrôle total** sur vos données
3. **Intégration native** avec MongoDB existant
4. **Scalable** : peut gérer des milliers de documents
5. **Flexible** : peut ajouter d'autres types de documents (Word, Excel, etc.)

## 🚀 Prochaines étapes

1. Installer les dépendances nécessaires
2. Créer les modèles Mongoose pour Documents et DocumentChunks
3. Implémenter l'API d'upload avec extraction PDF
4. Implémenter le système d'embeddings (choix du modèle)
5. Créer l'API de recherche sémantique
6. Intégrer dans SmartChatbot
7. Créer l'interface admin

## ❓ Questions à décider

1. **Modèle d'embeddings** : OpenAI (payant mais excellent) ou open-source (gratuit mais moins performant) ?
2. **Base vectorielle** : MongoDB natif ou service externe (Pinecone, etc.) ?
3. **LLM pour génération** : Voulez-vous utiliser un LLM pour générer les réponses finales, ou juste retourner les chunks pertinents ?

---

**Note** : Si vous me fournissez vos documents, je peux commencer à implémenter cette architecture immédiatement !







