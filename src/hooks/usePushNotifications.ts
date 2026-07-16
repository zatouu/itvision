'use client'

import { useCallback, useEffect, useState } from 'react'

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/\-/g, '+').replace(/_/g, '/')
  const rawData = window.atob(base64)
  const outputArray = new Uint8Array(rawData.length)
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i)
  }
  return outputArray
}

export type PushPermissionState = 'default' | 'granted' | 'denied' | 'unsupported'

interface UsePushNotificationsOptions {
  orderId?: string
}

export function usePushNotifications({ orderId }: UsePushNotificationsOptions = {}) {
  const [permission, setPermission] = useState<PushPermissionState>('unsupported')
  const [subscribing, setSubscribing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [supported, setSupported] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined') return
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      setPermission('unsupported')
      setSupported(false)
      return
    }
    setSupported(true)
    setPermission(Notification.permission as PushPermissionState)
  }, [])

  const subscribe = useCallback(async () => {
    setError(null)
    if (typeof window === 'undefined' || !supported) {
      setError('Push notifications non supportées')
      return
    }
    setSubscribing(true)
    try {
      const registration = await navigator.serviceWorker.ready
      const res = await fetch('/api/notifications/vapid-public-key')
      const data = await res.json()
      if (!res.ok || !data.publicKey) {
        throw new Error(data.error || 'Clé publique VAPID non disponible')
      }

      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(data.publicKey) as any,
      })

      const subJson = subscription.toJSON()
      if (!subJson || !subJson.endpoint || !subJson.keys) {
        throw new Error('Impossible de créer l\'abonnement push')
      }

      const saveRes = await fetch('/api/notifications/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subscription: subJson,
          orderId,
        }),
      })
      const saveData = await saveRes.json()
      if (!saveRes.ok) throw new Error(saveData.error || 'Erreur enregistrement abonnement')

      setPermission('granted')
    } catch (e: any) {
      console.error('usePushNotifications subscribe error:', e)
      setError(e.message || 'Erreur lors de l\'abonnement')
    } finally {
      setSubscribing(false)
    }
  }, [orderId, supported])

  const requestPermission = useCallback(async () => {
    setError(null)
    if (!supported) {
      setError('Push notifications non supportées')
      return
    }
    try {
      const result = await Notification.requestPermission()
      setPermission(result as PushPermissionState)
      if (result === 'granted') {
        await subscribe()
      }
    } catch (e: any) {
      setError(e.message || 'Erreur permission')
    }
  }, [subscribe, supported])

  return { supported, permission, subscribing, error, subscribe, requestPermission }
}
