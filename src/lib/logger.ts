/**
 * Logs JSON sur une ligne (stdout) : collectés tels quels par Filebeat → Kafka → Logstash → Elasticsearch.
 * Champs stables pour les tableaux de bord : @timestamp, level, message, service, domain, category.
 * En développement (LOG_FORMAT=pretty ou hors production), sortie lisible.
 */
type Level = 'debug' | 'info' | 'warn' | 'error'
export type LogCategory = 'application' | 'web' | 'security' | 'audit' | 'database' | 'payment' | 'job'
export type LogFields = Record<string, unknown> & { domain?: string; category?: LogCategory; err?: unknown }

const RANK: Record<Level, number> = { debug: 10, info: 20, warn: 30, error: 40 }
const minRank = RANK[(process.env.LOG_LEVEL || 'info').toLowerCase() as Level] ?? RANK.info
const asJson = process.env.LOG_FORMAT === 'json' || (process.env.NODE_ENV === 'production' && process.env.LOG_FORMAT !== 'pretty')
const SECRET_KEY = /pass(word)?|token|secret|authorization|cookie|otp|pin/i

function serializeError(err: unknown) {
  if (err instanceof Error) {
    return { type: err.name, message: err.message, stack: err.stack?.split('\n').slice(0, 8).join('\n'), digest: (err as any).digest }
  }
  return { message: String(err) }
}

/** Retire les valeurs sensibles avant écriture (un log finit dans Elasticsearch, consultable largement). */
function scrub(value: unknown, depth = 0): unknown {
  if (depth > 4 || value === null || typeof value !== 'object') return value
  if (Array.isArray(value)) return value.slice(0, 50).map(v => scrub(v, depth + 1))
  const out: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
    out[k] = SECRET_KEY.test(k) ? '[masqué]' : scrub(v, depth + 1)
  }
  return out
}

function write(level: Level, message: string, fields: LogFields = {}) {
  if (RANK[level] < minRank) return
  const { err, ...rest } = fields
  const entry = {
    '@timestamp': new Date().toISOString(),
    level: level.toUpperCase(),
    message,
    service: process.env.SERVICE_NAME || 'itvision-web',
    env: process.env.APP_ENV || process.env.NODE_ENV,
    ...(scrub(rest) as Record<string, unknown>),
    ...(err !== undefined ? { error: serializeError(err) } : {}),
  }
  const sink = level === 'error' ? console.error : level === 'warn' ? console.warn : console.log
  if (asJson) sink(JSON.stringify(entry))
  else sink(`[${entry.level}] ${message}`, Object.keys(rest).length ? scrub(rest) : '', err ?? '')
}

export interface Logger {
  debug(message: string, fields?: LogFields): void
  info(message: string, fields?: LogFields): void
  warn(message: string, fields?: LogFields): void
  error(message: string, fields?: LogFields): void
  child(bound: LogFields): Logger
}

function make(bound: LogFields): Logger {
  return {
    debug: (m, f) => write('debug', m, { ...bound, ...f }),
    info: (m, f) => write('info', m, { ...bound, ...f }),
    warn: (m, f) => write('warn', m, { ...bound, ...f }),
    error: (m, f) => write('error', m, { ...bound, ...f }),
    child: (more) => make({ ...bound, ...more }),
  }
}

export const logger = make({})
