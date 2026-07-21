import { useState } from 'react'
import { View, Text, TouchableOpacity, ScrollView, Modal, StyleSheet, FlatList, Dimensions } from 'react-native'

const { width: SCREEN_W } = Dimensions.get('screen')
import { Image } from 'expo-image'
import { Video, ResizeMode } from 'expo-av'
import { Play, X, Volume2 } from 'lucide-react-native'
import { resolveMediaUrl } from '../media'
import VoicePlayer from './VoicePlayer'
import { colors, radius, spacing, typography, shadows } from '../design'

type MediaItem = {
  type?: string
  url?: string
  uri?: string
  title?: string
}

type Props = {
  media: MediaItem[]
  audioLabel?: string
  mediaTitle?: string
  emptyLabel?: string
}

function isImageMedia(type: string | undefined, url: string | null): boolean {
  const t = String(type || '').toLowerCase()
  if (t === 'image') return true
  if (url && /\.(png|jpe?g|gif|webp|bmp|heic|heif)$/i.test(url)) return true
  return false
}

function getMediaLabel(type: string | undefined): string {
  const t = String(type || '').toLowerCase()
  if (t === 'audio') return 'Audio'
  if (t === 'video') return 'Vidéo'
  if (t === 'image') return 'Image'
  return 'Fichier'
}

export default function MissionMediaGallery({ media, audioLabel, mediaTitle, emptyLabel }: Props) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null)

  const validMedia = (media || []).filter(m => m?.url || m?.uri)
  const audioMedia = validMedia.find(m => String(m.type || '').toLowerCase() === 'audio')
  const visualMedia = validMedia.filter(m => {
    const t = String(m.type || '').toLowerCase()
    return t === 'image' || t === 'video' || isImageMedia(m.type, resolveMediaUrl(m.url || m.uri))
  })

  if (!validMedia.length && !emptyLabel) return null

  return (
    <>
      {audioMedia && (
        <View style={s.section}>
          <View style={s.audioBadge}>
            <Volume2 size={16} color={colors.info} />
            <Text style={s.audioBadgeText}>{audioLabel || 'Message vocal'}</Text>
          </View>
          <VoicePlayer uri={resolveMediaUrl(audioMedia.url || audioMedia.uri || '')} />
        </View>
      )}

      {visualMedia.length > 0 && (
        <View style={s.section}>
          {mediaTitle ? <Text style={s.mediaTitle}>{mediaTitle}</Text> : null}
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={{ flexDirection: 'row', gap: spacing.md }}>
              {visualMedia.map((m, i) => {
                const uri = resolveMediaUrl(m.url || m.uri)
                const isVideo = String(m.type || '').toLowerCase() === 'video'
                return (
                  <TouchableOpacity key={i} style={s.thumb} onPress={() => setActiveIndex(i)}>
                    {isVideo ? (
                      <View style={s.thumbImage}>
                        <Video
                          source={{ uri }}
                          style={StyleSheet.absoluteFill}
                          resizeMode={ResizeMode.COVER}
                          shouldPlay={false}
                          isLooping={false}
                          useNativeControls={false}
                        />
                        <View style={s.playOverlay}>
                          <Play size={24} color="#fff" fill="#fff" />
                        </View>
                      </View>
                    ) : (
                      <Image source={{ uri }} style={s.thumbImage} contentFit="cover" />
                    )}
                  </TouchableOpacity>
                )
              })}
            </View>
          </ScrollView>
        </View>
      )}

      {!validMedia.length && emptyLabel ? (
        <Text style={s.emptyLabel}>{emptyLabel}</Text>
      ) : null}

      <Modal visible={activeIndex !== null} transparent animationType="fade" onRequestClose={() => setActiveIndex(null)}>
        <View style={s.mediaModalOverlay}>
          <TouchableOpacity style={s.mediaModalClose} onPress={() => setActiveIndex(null)}>
            <X size={24} color="#fff" />
          </TouchableOpacity>
          {activeIndex !== null && (
            <FlatList
              data={visualMedia}
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              style={{ flex: 1 }}
              initialScrollIndex={activeIndex}
              keyExtractor={(item, index) => `media-${index}`}
              getItemLayout={(data, index) => ({ length: SCREEN_W, offset: SCREEN_W * index, index })}
              renderItem={({ item }) => {
                const uri = resolveMediaUrl(item.url || item.uri)
                const isVideo = String(item.type || '').toLowerCase() === 'video'
                return (
                  <View style={{ width: SCREEN_W, height: '100%' }}>
                    {isVideo ? (
                      <Video
                        source={{ uri }}
                        style={{ width: SCREEN_W, height: '100%' }}
                        resizeMode={ResizeMode.CONTAIN}
                        useNativeControls
                        shouldPlay={false}
                        isLooping={false}
                      />
                    ) : (
                      <Image source={{ uri }} style={{ width: SCREEN_W, height: '100%' }} contentFit="contain" />
                    )}
                  </View>
                )
              }}
            />
          )}
        </View>
      </Modal>
    </>
  )
}

const s = StyleSheet.create({
  section: { gap: spacing.sm },
  audioBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: colors.infoLight, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 20, alignSelf: 'flex-start' },
  audioBadgeText: { fontSize: 12, fontWeight: typography.weight.extrabold as any, color: colors.info },
  mediaTitle: { fontSize: typography.sm.fontSize, fontWeight: typography.weight.extrabold as any, color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5 },
  thumb: { width: 80, height: 80, borderRadius: radius.lg, overflow: 'hidden', backgroundColor: colors.bg },
  thumbImage: { width: '100%', height: '100%' },
  playOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.35)', alignItems: 'center', justifyContent: 'center' },
  mediaModalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.92)' },
  mediaModalClose: { position: 'absolute', top: 48, right: 16, zIndex: 10, padding: spacing.sm },
  emptyLabel: { fontSize: 13, color: colors.textSecondary, fontStyle: 'italic' },
})
