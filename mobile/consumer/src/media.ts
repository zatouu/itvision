import { Platform } from 'react-native'
import * as ImagePicker from 'expo-image-picker'
import { getBaseUrl } from './api'

export interface PickedMedia {
  uri: string
  name: string
  type: 'image' | 'video'
}

export async function captureMedia(options?: { selfie?: boolean }): Promise<PickedMedia[]> {
  if (Platform.OS === 'web') {
    // Web fallback to file picker
    return pickMedia({ maxFiles: 1 })
  }
  const { status } = await ImagePicker.requestCameraPermissionsAsync()
  if (status !== 'granted') {
    throw new Error('Permission appareil photo refusée')
  }
  const result = await ImagePicker.launchCameraAsync({
    mediaTypes: ImagePicker.MediaTypeOptions.Images,
    allowsEditing: true,
    aspect: options?.selfie ? [1, 1] : [4, 3],
    quality: 0.85,
    cameraType: 'front' as any,
  })
  if (result.canceled) return []
  return result.assets.map(a => ({
    uri: a.uri,
    name: a.fileName || `capture-${Date.now()}.jpg`,
    type: 'image',
  }))
}

/**
 * Résout une URL média en URL absolue utilisable par Image/Video/Audio.
 * Gère les URLs absolues et redirige les chemins /uploads/ vers /api/uploads/
 * car c'est la route API /api/uploads/[...path] qui sert les fichiers en standalone.
 */
export function resolveMediaUrl(url?: string | null): string {
  if (!url) return ''
  let v = url.trim()
  if (!v) return ''
  if (/^(https?:|file:|blob:|data:)/i.test(v)) return v
  // En standalone, seule la route API /api/uploads/[...path] sert les fichiers.
  // On convertit donc les anciens/nouveaux chemins /uploads/ en /api/uploads/.
  if (v.startsWith('/uploads/')) {
    v = v.replace('/uploads/', '/api/uploads/')
  }
  const base = getBaseUrl().replace(/\/$/, '')
  return v.startsWith('/') ? `${base}${v}` : `${base}/${v}`
}

export async function pickMedia(options?: { maxFiles?: number }): Promise<PickedMedia[]> {
  if (Platform.OS === 'web') {
    return new Promise((resolve) => {
      const input = document.createElement('input')
      input.type = 'file'
      input.accept = 'image/*,video/*'
      input.multiple = true
      input.onchange = (e) => {
        const files = Array.from((e.target as HTMLInputElement).files || [])
        const results: PickedMedia[] = files.map(f => ({
          uri: URL.createObjectURL(f),
          name: f.name,
          type: f.type.startsWith('video/') ? 'video' : 'image',
        }))
        resolve(results.slice(0, options?.maxFiles ?? 5))
      }
      input.click()
    })
  } else {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.All,
      allowsMultipleSelection: true,
      selectionLimit: options?.maxFiles ?? 5,
      quality: 0.8,
    })
    if (result.canceled) return []
    return result.assets.map(a => ({
      uri: a.uri,
      name: a.fileName || `media-${Date.now()}.${a.type === 'video' ? 'mp4' : 'jpg'}`,
      type: (a.type === 'video' ? 'video' : 'image') as 'image' | 'video',
    }))
  }
}
