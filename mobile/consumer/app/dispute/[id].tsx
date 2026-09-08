import { useEffect } from 'react'
import { Redirect, useLocalSearchParams } from 'expo-router'

// Compat : l'écran litige vit désormais sur /dispute?requestId=…
export default function DisputeRedirect() {
  const { id } = useLocalSearchParams<{ id?: string | string[] }>()
  const requestId = Array.isArray(id) ? id[0] : id
  if (!requestId) return <Redirect href="/my-requests" />
  return <Redirect href={`/dispute?requestId=${requestId}`} />
}
