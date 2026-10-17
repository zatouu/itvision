/**
 * Checkpointer LangGraph sur MongoDB — réutilise la connexion mongoose
 * existante (même cluster, base par défaut). Persiste l'état des graphes
 * à chaque nœud : un graphe peut être figé des jours en attente humaine
 * puis reprendre après redémarrage du serveur.
 */

import mongoose from 'mongoose'
import { MongoDBSaver } from '@langchain/langgraph-checkpoint-mongodb'
import type { MongoClient } from 'mongodb'

let saver: MongoDBSaver | null = null

export function getCheckpointer(): MongoDBSaver {
  if (!saver) {
    // mongoose embarque sa propre version du driver — cast structurel
    const client = mongoose.connection.getClient() as unknown as MongoClient
    saver = new MongoDBSaver({ client })
  }
  return saver
}
