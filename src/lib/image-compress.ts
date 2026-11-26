/**
 * Réduit une photo de téléphone (souvent 3-8 Mo, parfois plus de 10 Mo en haute
 * résolution) à ~1600 px JPEG avant envoi : upload rapide en 3G/4G et passage
 * sous la limite serveur de 10 Mo. Safari décode le HEIC des iPhone : la photo
 * ressort en JPEG lisible partout. En cas d'échec de décodage, le fichier
 * d'origine est renvoyé tel quel.
 */
export async function compressImage(f: File, maxSide = 1600): Promise<File> {
  if (f.type === 'image/gif' || f.size < 600 * 1024) return f
  try {
    const bitmap = await createImageBitmap(f)
    const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height))
    const canvas = document.createElement('canvas')
    canvas.width = Math.round(bitmap.width * scale)
    canvas.height = Math.round(bitmap.height * scale)
    canvas.getContext('2d')?.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
    bitmap.close()
    const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, 'image/jpeg', 0.85))
    if (!blob || blob.size >= f.size) return f
    return new File([blob], f.name.replace(/\.\w+$/, '') + '.jpg', { type: 'image/jpeg' })
  } catch {
    return f
  }
}
