import { Platform } from 'react-native'
import * as ImagePicker from 'expo-image-picker'

export interface PickedMedia {
  uri: string
  name: string
  type: 'image' | 'video'
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
