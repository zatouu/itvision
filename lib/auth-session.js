function isSessionCurrent(payload, user) {
  if (!user || user.isActive === false || user.deletedAt) return false
  if (payload.domain === 'xeuy') {
    return payload.typ !== 'xeuy-refresh' && ['CLIENT', 'PROVIDER'].includes(payload.role) &&
      typeof payload.phone === 'string' && payload.phone.length > 0
  }
  const tokenVersion = payload.sessionVersion ?? 0
  const userVersion = user.sessionVersion ?? 0
  return Number.isSafeInteger(tokenVersion) && tokenVersion >= 0 &&
    Number.isSafeInteger(userVersion) && userVersion >= 0 && tokenVersion === userVersion
}

function guardSocketSession(socket, validateSession, intervalMs = 30000, timeoutMs = 5000) {
  let pending = null
  let stopped = false
  const check = () => {
    if (stopped || !socket.connected) return Promise.resolve(false)
    if (!pending) {
      let timeout
      const deadline = new Promise(resolve => { timeout = setTimeout(() => resolve(false), timeoutMs) })
      pending = Promise.race([Promise.resolve().then(validateSession), deadline]).then(valid => {
        if (!valid) socket.disconnect(true)
        return Boolean(valid)
      }).catch(() => {
        socket.disconnect(true)
        return false
      }).finally(() => { clearTimeout(timeout); pending = null })
    }
    return pending
  }
  socket.use((_packet, next) => {
    void check().then(valid => next(valid ? undefined : new Error('Session revoquee')))
  })
  const timer = setInterval(() => { void check() }, intervalMs)
  timer.unref?.()
  socket.once('disconnect', () => {
    stopped = true
    clearInterval(timer)
  })
  void check()
}

module.exports = { isSessionCurrent, guardSocketSession }