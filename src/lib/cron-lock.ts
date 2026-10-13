import os from 'os'
import { getRedisClient, isRedisAvailable } from '@/lib/redis'

/**
 * Exécute une tâche planifiée une seule fois par créneau, même avec plusieurs instances
 * de l'application (montée en charge, chevauchement pendant un redéploiement).
 *
 * Le verrou n'est pas libéré en fin de tâche : il expire après `ttlSec`, à choisir
 * inférieur à la période du cron. Une seconde instance déclenchée quelques millisecondes
 * plus tard ne rejoue donc pas le même créneau.
 * Sans Redis (développement, panne), la tâche s'exécute : comportement mono-instance.
 */
export async function runOncePerSlot<T>(name: string, ttlSec: number, task: () => Promise<T>): Promise<T | undefined> {
  if (await isRedisAvailable()) {
    try {
      const owner = `${os.hostname()}:${process.pid}:${new Date().toISOString()}`
      const acquired = await getRedisClient()!.set(`cron-lock:${name}`, owner, 'EX', ttlSec, 'NX')
      if (acquired !== 'OK') {
        console.log(`[cron-lock] ${name} : créneau déjà pris par une autre instance`)
        return undefined
      }
    } catch (err) {
      console.warn(`[cron-lock] ${name} : verrou indisponible, exécution locale`, (err as Error).message)
    }
  }
  return task()
}
