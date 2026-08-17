import React, { useEffect, useMemo, useRef, useState } from 'react'
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  useWindowDimensions,
  BackHandler,
} from 'react-native'
import { Image } from 'expo-image'
import { Audio } from 'expo-av'
import { useTranslation } from 'react-i18next'
import {
  X,
  ShieldCheck,
  Clock,
  Pause as PauseIcon,
  ListOrdered,
  Hash,
  Tag,
  Lock,
  Timer,
  Smartphone,
  Signal,
  Play,
  AlertTriangle,
  ChevronRight,
} from 'lucide-react-native'

import BottomSheet from '../BottomSheet'
import { getSocket } from '../../socket'
import { resolveMediaUrl } from '../../media'
import { formatDuration } from '../../utils/duration'
import { statusLabelKey } from '../../utils/missionStatus'

type StatusLogEntry = {
  timestamp: string
  action?: string
  fromStatus?: string | null
  toStatus?: string | null
}

type Props = {
  visible: boolean
  onClose: () => void
  mission: any
  status: string
  elapsedSeconds: number
  pausedSeconds: number
  pauseCount: number
  lastActivityAt: number | null
  /** Fourni uniquement si la pause est métier-disponible pour le statut courant */
  onPause?: (() => void) | null
  /** Fourni uniquement si le signalement de litige est disponible */
  onDispute?: (() => void) | null
}

function timeHM(ts: string | number | Date): string {
  const d = new Date(ts)
  return d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
}

/** Petit player audio réutilisant expo-av (dépendance existante). */
function AudioRow({ url }: { url: string }) {
  const [playing, setPlaying] = useState(false)
  const soundRef = useRef<Audio.Sound | null>(null)

  useEffect(() => {
    return () => {
      soundRef.current?.unloadAsync().catch(() => {})
    }
  }, [])

  const toggle = async () => {
    try {
      if (playing && soundRef.current) {
        await soundRef.current.stopAsync()
        setPlaying(false)
        return
      }
      if (!soundRef.current) {
        const { sound } = await Audio.Sound.createAsync({ uri: url })
        soundRef.current = sound
        sound.setOnPlaybackStatusUpdate((st) => {
          if (st.isLoaded && st.didJustFinish) setPlaying(false)
        })
      }
      await soundRef.current.playAsync()
      setPlaying(true)
    } catch {}
  }

  return (
    <TouchableOpacity style={s.audioRow} onPress={toggle} activeOpacity={0.8} accessibilityRole="button">
      <View style={s.audioPlayBtn}>
        {playing ? <PauseIcon size={14} color="#0F7B4F" /> : <Play size={14} color="#0F7B4F" />}
      </View>
      <View style={s.audioWave}>
        {Array.from({ length: 18 }).map((_, i) => (
          <View key={i} style={[s.audioBar, { height: 4 + ((i * 7) % 14) }]} />
        ))}
      </View>
    </TouchableOpacity>
  )
}

export function MissionDetailsSheet({
  visible,
  onClose,
  mission,
  status,
  elapsedSeconds,
  pausedSeconds,
  pauseCount,
  lastActivityAt,
  onPause,
  onDispute,
}: Props) {
  const { t } = useTranslation()
  const { height: screenH } = useWindowDimensions()

  // Fermeture via bouton back Android
  useEffect(() => {
    if (!visible) return
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      onClose()
      return true
    })
    return () => sub.remove()
  }, [visible, onClose])

  const refCode = useMemo(() => {
    if (mission?.reference) return `#${mission.reference}`
    return mission?._id ? `#${mission._id.slice(-6).toUpperCase()}` : ''
  }, [mission?.reference, mission?._id])

  const lastActivityText = useMemo(() => {
    if (!lastActivityAt) return '—'
    const secs = Math.max(0, Math.round((Date.now() - lastActivityAt) / 1000))
    return t('providerMissionDetails.ago', {
      duration: formatDuration(secs),
      defaultValue: 'il y a {{duration}}',
    })
  }, [lastActivityAt, t, visible])

  const activeSeconds = Math.max(0, elapsedSeconds - pausedSeconds)

  const timeline = useMemo(() => {
    const log: StatusLogEntry[] = Array.isArray(mission?.statusLog) ? mission.statusLog : []
    const entries = log
      .filter((e) => e.toStatus)
      .map((e) => ({
        timestamp: e.timestamp,
        status: e.toStatus as string,
        label: t(`providerMissionDetails.${statusLabelKey(e.toStatus as string)}`, { defaultValue: String(e.toStatus) }),
      }))
    if (entries.length === 0 && mission) {
      entries.push({
        timestamp: mission.lastActivityAt || mission.updatedAt || new Date().toISOString(),
        status,
        label: t(`providerMissionDetails.${statusLabelKey(status)}`, { defaultValue: status }),
      })
    }
    return entries.map((e, i) => ({ ...e, isCurrent: i === entries.length - 1 }))
  }, [mission?.statusLog, status, t, visible])

  const socketConnected = useMemo(() => {
    try { return getSocket().connected } catch { return false }
  }, [visible])

  const media: Array<{ url: string; type?: string }> = Array.isArray(mission?.media) ? mission.media : []
  const images = media.filter((m) => m?.url && (m.type === 'image' || !m.type))
  const audios = media.filter((m) => m?.url && m.type === 'audio')

  const etaMinutes = mission?.acceptedOffer?.etaMinutes

  const paymentText = mission?.payment?.provider === 'cash'
    ? t('providerMissionDetails.paymentCashSecured', { defaultValue: 'Cash sécurisé' })
    : mission?.payment
      ? t('providerMissionDetails.paymentCard', { defaultValue: 'Paiement en ligne' })
      : '—'

  return (
    <BottomSheet visible={visible} onClose={onClose} maxHeight={screenH * 0.72} borderRadius={28}>
      {/* Header */}
      <View style={s.header}>
        <View style={{ width: 32 }} />
        <Text style={s.headerTitle}>
          {t('providerMissionDetails.title', { defaultValue: 'Détails de la mission' })}
        </Text>
        <TouchableOpacity style={s.closeX} onPress={onClose} activeOpacity={0.8} accessibilityRole="button" accessibilityLabel={t('providerMissionDetails.close', { defaultValue: 'Fermer' })}>
          <X size={18} color="#0A1628" />
        </TouchableOpacity>
      </View>

      {/* Info strip */}
      <View style={s.infoStrip}>
        <ShieldCheck size={18} color="#0F7B4F" />
        <View style={{ flex: 1 }}>
          <Text style={s.infoTitle}>{t('providerMissionDetails.infoTitle', { defaultValue: 'Données internes de suivi' })}</Text>
          <Text style={s.infoSub}>{t('providerMissionDetails.infoSub', { defaultValue: 'Visibles uniquement par vous' })}</Text>
        </View>
      </View>

      {/* Cycle de vie */}
      <Text style={s.sectionTitle}>{t('providerMissionDetails.lifecycleTitle', { defaultValue: 'CYCLE DE VIE' })}</Text>
      <View style={s.card}>
        <View style={s.lifeRow}>
          <Clock size={14} color="#64748B" />
          <Text style={s.lifeLabel}>{t('providerMissionDetails.lastActivity', { defaultValue: 'Dernière activité' })}</Text>
          <Text style={s.lifeValue}>{lastActivityText}</Text>
        </View>
        <View style={s.lifeRow}>
          <Clock size={14} color="#64748B" />
          <Text style={s.lifeLabel}>{t('providerMissionDetails.totalDuration', { defaultValue: 'Durée totale' })}</Text>
          <Text style={s.lifeValue}>{formatDuration(elapsedSeconds)}</Text>
        </View>
        <View style={s.lifeRow}>
          <Clock size={14} color="#64748B" />
          <Text style={s.lifeLabel}>{t('providerMissionDetails.activeDuration', { defaultValue: 'Temps actif' })}</Text>
          <Text style={s.lifeValue}>{formatDuration(activeSeconds)}</Text>
        </View>
        <View style={s.lifeRow}>
          <Clock size={14} color="#64748B" />
          <Text style={s.lifeLabel}>{t('providerMissionDetails.pausedDuration', { defaultValue: 'Temps en pause' })}</Text>
          <Text style={s.lifeValue}>{formatDuration(pausedSeconds)}</Text>
        </View>
        <View style={s.lifeRow}>
          <ListOrdered size={14} color="#64748B" />
          <Text style={s.lifeLabel}>{t('providerMissionDetails.pauseCount', { defaultValue: 'Nombre de pauses' })}</Text>
          <Text style={s.lifeValue}>{pauseCount}</Text>
        </View>
      </View>

      {/* Journal d'état */}
      <Text style={s.sectionTitle}>{t('providerMissionDetails.timelineTitle', { defaultValue: "JOURNAL D'ÉTAT" })}</Text>
      <View style={s.card}>
        {timeline.map((entry, i) => (
          <View key={`${entry.timestamp}-${i}`} style={s.timelineRow}>
            <View style={s.timelineRail}>
              <View style={[s.timelineDot, entry.isCurrent && s.timelineDotCurrent]} />
              {i < timeline.length - 1 && <View style={s.timelineLine} />}
            </View>
            <Text style={s.timelineTime}>{timeHM(entry.timestamp)}</Text>
            <Text style={[s.timelineLabel, entry.isCurrent && s.timelineLabelCurrent]} numberOfLines={1}>
              {entry.label}
            </Text>
          </View>
        ))}
      </View>

      {/* Données techniques */}
      <Text style={s.sectionTitle}>{t('providerMissionDetails.technicalTitle', { defaultValue: 'DONNÉES TECHNIQUES' })}</Text>
      <View style={s.techGrid}>
        <View style={s.techCell}>
          <Hash size={15} color="#0F7B4F" />
          <Text style={s.techLabel}>{t('providerMissionDetails.techRef', { defaultValue: 'Réf mission' })}</Text>
          <Text style={s.techValue} numberOfLines={1}>{refCode}</Text>
        </View>
        <View style={s.techCell}>
          <Tag size={15} color="#0F7B4F" />
          <Text style={s.techLabel}>{t('providerMissionDetails.techCategory', { defaultValue: 'Catégorie' })}</Text>
          <Text style={s.techValue} numberOfLines={1}>{mission?.category || '—'}</Text>
        </View>
        <View style={s.techCell}>
          <Lock size={15} color="#0F7B4F" />
          <Text style={s.techLabel}>{t('providerMissionDetails.techPayment', { defaultValue: 'Paiement' })}</Text>
          <Text style={s.techValue} numberOfLines={1}>{paymentText}</Text>
        </View>
        <View style={s.techCell}>
          <Timer size={15} color="#0F7B4F" />
          <Text style={s.techLabel}>{t('providerMissionDetails.techEta', { defaultValue: 'ETA promis' })}</Text>
          <Text style={s.techValue} numberOfLines={1}>
            {typeof etaMinutes === 'number' && etaMinutes > 0
              ? t('providerMissionDetails.etaMinutes', { minutes: etaMinutes, defaultValue: '{{minutes}} min' })
              : '—'}
          </Text>
        </View>
        <View style={s.techCell}>
          <Smartphone size={15} color="#0F7B4F" />
          <Text style={s.techLabel}>{t('providerMissionDetails.techChannel', { defaultValue: 'Canal' })}</Text>
          <Text style={s.techValue} numberOfLines={1}>
            {mission?.channel === 'mobile'
              ? t('providerMissionDetails.channelMobile', { defaultValue: 'App mobile' })
              : mission?.channel || '—'}
          </Text>
        </View>
        <View style={s.techCell}>
          <Signal size={15} color="#0F7B4F" />
          <Text style={s.techLabel}>{t('providerMissionDetails.techConnection', { defaultValue: 'Connexion' })}</Text>
          <Text style={[s.techValue, { color: socketConnected ? '#0F7B4F' : '#EF4444' }]} numberOfLines={1}>
            {socketConnected
              ? t('providerMissionDetails.connectionActive', { defaultValue: 'Active' })
              : t('providerMissionDetails.connectionOffline', { defaultValue: 'Hors ligne' })}
          </Text>
        </View>
      </View>

      {/* Media client — masqué si aucun média */}
      {(images.length > 0 || audios.length > 0) && (
        <>
          <Text style={s.sectionTitle}>{t('providerMissionDetails.mediaTitle', { defaultValue: 'MEDIA CLIENT' })}</Text>
          <View style={s.card}>
            <View style={s.mediaRow}>
              {images.map((m, i) => (
                <Image key={`img-${i}`} source={{ uri: resolveMediaUrl(m.url) }} style={s.mediaImage} contentFit="cover" />
              ))}
              {audios.map((m, i) => (
                <AudioRow key={`aud-${i}`} url={resolveMediaUrl(m.url)} />
              ))}
            </View>
            <Text style={s.mediaCaption}>{t('providerMissionDetails.mediaViewed', { defaultValue: 'Pièces jointes consultées' })}</Text>
          </View>
        </>
      )}

      {/* Actions avancées — uniquement si la fonctionnalité existe réellement */}
      {(onPause || onDispute) && (
        <>
          <Text style={s.sectionTitle}>{t('providerMissionDetails.advancedTitle', { defaultValue: 'ACTIONS AVANCÉES' })}</Text>
          <View style={s.card}>
            {onPause && (
              <TouchableOpacity style={s.actionRow} onPress={() => { onClose(); onPause() }} activeOpacity={0.8} accessibilityRole="button">
                <View style={[s.actionIcon, { backgroundColor: '#FFFBEB' }]}>
                  <PauseIcon size={15} color="#D97706" />
                </View>
                <Text style={[s.actionLabel, { color: '#B45309' }]}>
                  {t('providerMissionDetails.pauseAction', { defaultValue: 'Mettre en pause' })}
                </Text>
                <ChevronRight size={16} color="#D97706" />
              </TouchableOpacity>
            )}
            {onDispute && (
              <TouchableOpacity style={s.actionRow} onPress={() => { onClose(); onDispute() }} activeOpacity={0.8} accessibilityRole="button">
                <View style={[s.actionIcon, { backgroundColor: '#FEE2E2' }]}>
                  <AlertTriangle size={15} color="#EF4444" />
                </View>
                <Text style={[s.actionLabel, { color: '#B91C1C' }]}>
                  {t('providerMissionDetails.disputeAction', { defaultValue: 'Signaler un litige' })}
                </Text>
                <ChevronRight size={16} color="#EF4444" />
              </TouchableOpacity>
            )}
          </View>
        </>
      )}

      {/* Fermeture */}
      <TouchableOpacity style={s.closeBtn} onPress={onClose} activeOpacity={0.88} accessibilityRole="button">
        <Text style={s.closeBtnText}>{t('providerMissionDetails.close', { defaultValue: 'Fermer' })}</Text>
      </TouchableOpacity>
    </BottomSheet>
  )
}

const s = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 },
  headerTitle: { fontSize: 16, fontWeight: '800', color: '#0A1628' },
  closeX: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#F1F5F9', alignItems: 'center', justifyContent: 'center' },
  infoStrip: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#E6F4EC', borderRadius: 14, padding: 12, marginBottom: 18 },
  infoTitle: { fontSize: 13, fontWeight: '800', color: '#0A1628' },
  infoSub: { fontSize: 12, color: '#64748B', marginTop: 1 },
  sectionTitle: { fontSize: 11, fontWeight: '800', color: '#6B7280', letterSpacing: 0.8, marginBottom: 8 },
  card: { backgroundColor: '#FFFFFF', borderRadius: 16, padding: 14, gap: 10, marginBottom: 18, borderWidth: 1, borderColor: '#F1F5F9' },
  lifeRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  lifeLabel: { flex: 1, fontSize: 13, color: '#64748B' },
  lifeValue: { fontSize: 13, fontWeight: '700', color: '#0A1628' },
  timelineRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  timelineRail: { width: 14, alignItems: 'center' },
  timelineDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#CBD5E1' },
  timelineDotCurrent: { backgroundColor: '#0F7B4F', borderWidth: 3, borderColor: '#E6F4EC' },
  timelineLine: { position: 'absolute', top: 12, width: 2, height: 24, backgroundColor: '#E2E8F0' },
  timelineTime: { fontSize: 12, fontWeight: '700', color: '#64748B', width: 44 },
  timelineLabel: { flex: 1, fontSize: 13, color: '#475569' },
  timelineLabelCurrent: { fontWeight: '800', color: '#0F7B4F' },
  techGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 18 },
  techCell: { width: '47%', flexGrow: 1, backgroundColor: '#FFFFFF', borderRadius: 14, padding: 12, gap: 4, borderWidth: 1, borderColor: '#F1F5F9' },
  techLabel: { fontSize: 11, fontWeight: '700', color: '#64748B' },
  techValue: { fontSize: 13, fontWeight: '700', color: '#0A1628' },
  mediaRow: { flexDirection: 'row', alignItems: 'center', gap: 10, flexWrap: 'wrap' },
  mediaImage: { width: 72, height: 72, borderRadius: 12 },
  mediaCaption: { fontSize: 11, color: '#94A3B8' },
  audioRow: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#F8FAFC', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 8 },
  audioPlayBtn: { width: 28, height: 28, borderRadius: 14, backgroundColor: '#E6F4EC', alignItems: 'center', justifyContent: 'center' },
  audioWave: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  audioBar: { width: 2, borderRadius: 1, backgroundColor: '#94A3B8' },
  actionRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  actionIcon: { width: 32, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  actionLabel: { flex: 1, fontSize: 14, fontWeight: '700' },
  closeBtn: { backgroundColor: '#0F7B4F', borderRadius: 16, paddingVertical: 15, alignItems: 'center', marginBottom: 8 },
  closeBtnText: { fontSize: 15, fontWeight: '800', color: '#FFFFFF' },
})
