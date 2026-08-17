import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Share,
  ActivityIndicator,
  Animated,
} from 'react-native'
import { Image } from 'expo-image'
import { router, useLocalSearchParams } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useTranslation } from 'react-i18next'
import { LinearGradient } from 'expo-linear-gradient'
import {
  ArrowLeft,
  Share2,
  Check,
  Star,
  BadgeCheck,
  Wallet,
  Search,
  FileText,
  Hash,
  Tag,
  MapPin,
  Clock,
  Handshake,
  Award,
} from 'lucide-react-native'

import * as FileSystem from 'expo-file-system'

import { apiGet } from '../../src/api'
import { getAuthToken } from '../../src/auth'
import { withScreenBoundary } from '../../src/components/withScreenBoundary'
import { toast } from '../../src/toast'
import { humanErrorMessage } from '../../src/errorMessages'
import { resolveMediaUrl } from '../../src/media'
import { formatDuration } from '../../src/utils/duration'
import { resolvePaymentLabel, paymentLabelI18nKey } from '../../src/utils/missionStatus'

function normalizeId(value: string | string[] | undefined): string | null {
  if (Array.isArray(value)) return value[0] || null
  return value || null
}

function formatFcfa(amount: number): string {
  return `${Number(amount).toLocaleString('fr-FR')} FCFA`
}

type MissionCompletedData = {
  _id: string
  status: string
  reference?: string
  category?: string
  location?: { address?: string }
  metrics?: { activeMs?: number; activeFormatted?: string }
  acceptedOffer?: { price?: number } | null
  payment?: { status?: string | null; provider?: string | null } | null
  earnings?: {
    grossAmountFcfa: number
    platformFeeFcfa?: number
    bonusFcfa?: number
    netAmountFcfa: number
  } | null
  clientName?: string
  clientAvatar?: string | null
  clientVerified?: boolean
  clientReview?: { rating?: number; comment?: string | null } | null
  clientValidatedAt?: string | null
  weeklyCompletedMissions?: number | null
}

function MissionCompletedScreen() {
  const { t } = useTranslation()
  const { id } = useLocalSearchParams<{ id?: string | string[] }>()
  const requestId = normalizeId(id)

  const [item, setItem] = useState<MissionCompletedData | null>(null)
  const [loading, setLoading] = useState(true)
  const [downloading, setDownloading] = useState(false)

  const checkScale = useRef(new Animated.Value(0)).current
  const heroOpacity = useRef(new Animated.Value(0)).current

  const load = useCallback(async () => {
    if (!requestId) return
    try {
      const r = await apiGet(`/api/services/requests/${requestId}`)
      setItem(r.item)
    } catch (e: any) {
      toast.error(t('common.error', { defaultValue: 'Erreur' }), humanErrorMessage(e))
    } finally {
      setLoading(false)
    }
  }, [requestId, t])

  useEffect(() => { load() }, [load])

  // Animation de réussite : légère, une seule fois, au montage
  useEffect(() => {
    if (!item) return
    Animated.parallel([
      Animated.spring(checkScale, { toValue: 1, useNativeDriver: true, tension: 60, friction: 7 }),
      Animated.timing(heroOpacity, { toValue: 1, duration: 350, useNativeDriver: true }),
    ]).start()
  }, [item, checkScale, heroOpacity])

  const refCode = useMemo(() => {
    if (item?.reference) return `#${item.reference}`
    return item?._id ? `#${item._id.slice(-6).toUpperCase()}` : ''
  }, [item?.reference, item?._id])

  const validatedTime = useMemo(() => {
    if (!item?.clientValidatedAt) return null
    const d = new Date(item.clientValidatedAt)
    return d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
  }, [item?.clientValidatedAt])

  const paymentLabel = resolvePaymentLabel(item?.payment)
  const paymentKey = paymentLabelI18nKey(paymentLabel)

  const durationText = useMemo(() => {
    const ms = item?.metrics?.activeMs
    if (typeof ms === 'number' && ms > 0) return formatDuration(Math.round(ms / 1000))
    return item?.metrics?.activeFormatted || null
  }, [item?.metrics])

  const earnings = item?.earnings || null
  const acceptedPrice = earnings?.grossAmountFcfa ?? item?.acceptedOffer?.price ?? null
  const weeklyCount = item?.weeklyCompletedMissions ?? null

  // Le reçu n'existe réellement que si la mission est terminée (endpoint backend dédié)
  const canDownloadReceipt = item?.status === 'completed'

  const downloadReceipt = async () => {
    if (!requestId || downloading) return
    setDownloading(true)
    try {
      const token = getAuthToken()
      const base = process.env.EXPO_PUBLIC_API_BASE_URL || ''
      const fileUri = `${FileSystem.cacheDirectory}recu-${refCode.replace('#', '')}.pdf`
      const res = await FileSystem.downloadAsync(
        `${base}/api/services/requests/${requestId}/receipt`,
        fileUri,
        { headers: token ? { Authorization: `Bearer ${token}` } : {} }
      )
      if (res.status !== 200) throw new Error(`HTTP ${res.status}`)
      try { await Share.share({ url: res.uri }) } catch {}
      toast.success(
        t('providerMissionCompleted.receiptSaved', { defaultValue: 'Reçu enregistré' }),
        t('providerMissionCompleted.receiptSavedBody', { defaultValue: 'Le reçu PDF a été téléchargé.' })
      )
    } catch {
      toast.error(
        t('common.error', { defaultValue: 'Erreur' }),
        t('providerMissionCompleted.receiptError', { defaultValue: 'Impossible de télécharger le reçu' })
      )
    } finally {
      setDownloading(false)
    }
  }

  const handleShare = async () => {
    try {
      await Share.share({
        message: `Mission Xeuy ${refCode} — ${item?.category || ''} — ${t('providerMissionCompleted.title', { defaultValue: 'Mission terminée' })}`,
      })
    } catch {}
  }

  if (loading && !item) {
    return (
      <SafeAreaView style={s.loadingContainer}>
        <ActivityIndicator size="large" color="#0F7B4F" />
        <Text style={s.loadingText}>{t('common.loading', { defaultValue: 'Chargement…' })}</Text>
      </SafeAreaView>
    )
  }

  if (!item) {
    return (
      <SafeAreaView style={s.loadingContainer}>
        <Text style={s.loadingText}>
          {t('providerMissionCompleted.loadError', { defaultValue: 'Impossible de charger la mission' })}
        </Text>
        <TouchableOpacity style={s.retryBtn} onPress={() => router.back()}>
          <Text style={s.retryText}>{t('common.back', { defaultValue: 'Retour' })}</Text>
        </TouchableOpacity>
      </SafeAreaView>
    )
  }

  const review = item.clientReview

  return (
    <SafeAreaView style={s.safe} edges={['top', 'left', 'right']}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity style={s.headerBtn} onPress={() => router.back()} activeOpacity={0.8} accessibilityLabel={t('common.back', { defaultValue: 'Retour' })}>
          <ArrowLeft size={20} color="#0A1628" strokeWidth={2.2} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>
          {t('providerMissionCompleted.title', { defaultValue: 'Mission terminée' })}
        </Text>
        <TouchableOpacity style={s.headerBtn} onPress={handleShare} activeOpacity={0.8} accessibilityLabel="Partager">
          <Share2 size={18} color="#0A1628" strokeWidth={2.2} />
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.scroll}>
        {/* Success Hero */}
        <Animated.View style={{ opacity: heroOpacity }}>
          <LinearGradient
            colors={['#0F7B4F', '#0A5C3B']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={s.hero}
          >
            <Animated.View style={[s.heroCheck, { transform: [{ scale: checkScale }] }]}>
              <Check size={34} color="#0F7B4F" strokeWidth={3} />
            </Animated.View>
            <Text style={s.heroTitle}>
              {t('providerMissionCompleted.heroTitle', { defaultValue: 'Mission terminée avec succès' })}
            </Text>
            {validatedTime && (
              <Text style={s.heroSubtitle}>
                {t('providerMissionCompleted.heroValidatedAt', {
                  time: validatedTime,
                  defaultValue: 'Validée par le client à {{time}}',
                })}
              </Text>
            )}
            {earnings && (
              <View style={s.heroAmountBox}>
                <Text style={s.heroAmount}>{Number(earnings.netAmountFcfa).toLocaleString('fr-FR')}</Text>
                <Text style={s.heroAmountSub}>
                  {t('providerMissionCompleted.heroEarned', { defaultValue: 'FCFA gagnés' })}
                </Text>
              </View>
            )}
            {paymentKey && (
              <View style={s.heroPaymentPill}>
                <BadgeCheck size={13} color="#D1FAE5" />
                <Text style={s.heroPaymentText}>
                  {t(paymentKey, { defaultValue: 'Paiement sécurisé' })}
                </Text>
              </View>
            )}
          </LinearGradient>
        </Animated.View>

        {/* Avis client — uniquement si un avis réel existe */}
        {review && (
          <View style={s.card}>
            <View style={s.clientRow}>
              {item.clientAvatar ? (
                <Image source={{ uri: resolveMediaUrl(item.clientAvatar) }} style={s.avatar} contentFit="cover" />
              ) : (
                <View style={[s.avatar, s.avatarFallback]}>
                  <Text style={s.avatarInitial}>
                    {(item.clientName || '?').trim().charAt(0).toUpperCase()}
                  </Text>
                </View>
              )}
              <View style={{ flex: 1 }}>
                <View style={s.clientNameRow}>
                  <Text style={s.clientName}>{item.clientName || '—'}</Text>
                  {item.clientVerified && <BadgeCheck size={15} color="#0F7B4F" />}
                </View>
                {item.clientVerified && (
                  <Text style={s.clientVerifiedText}>
                    {t('providerMissionCompleted.clientVerified', { defaultValue: 'Client vérifié' })}
                  </Text>
                )}
              </View>
              {typeof review.rating === 'number' && (
                <View style={s.ratingPill}>
                  <Star size={13} color="#F59E0B" fill="#F59E0B" />
                  <Text style={s.ratingText}>{review.rating.toFixed(1)}</Text>
                </View>
              )}
            </View>
            {review.comment ? (
              <Text style={s.reviewComment}>“{review.comment}”</Text>
            ) : null}
          </View>
        )}

        {/* Récap mission */}
        <View style={s.card}>
          <Text style={s.sectionTitle}>
            {t('providerMissionCompleted.recapTitle', { defaultValue: 'RÉCAP MISSION' })}
          </Text>
          <View style={s.recapRow}>
            <Hash size={15} color="#64748B" />
            <Text style={s.recapLabel}>{t('providerMissionCompleted.reference', { defaultValue: 'Référence' })}</Text>
            <Text style={s.recapValue}>{refCode}</Text>
          </View>
          <View style={s.recapRow}>
            <Tag size={15} color="#64748B" />
            <Text style={s.recapLabel}>{t('providerMissionCompleted.service', { defaultValue: 'Service' })}</Text>
            <Text style={s.recapValue}>{item.category || '—'}</Text>
          </View>
          {!!item.location?.address && (
            <View style={s.recapRow}>
              <MapPin size={15} color="#64748B" />
              <Text style={s.recapLabel}>{t('providerMissionCompleted.location', { defaultValue: 'Lieu' })}</Text>
              <Text style={s.recapValue} numberOfLines={1}>{item.location.address}</Text>
            </View>
          )}
          {!!durationText && (
            <View style={s.recapRow}>
              <Clock size={15} color="#64748B" />
              <Text style={s.recapLabel}>{t('providerMissionCompleted.duration', { defaultValue: 'Durée' })}</Text>
              <Text style={s.recapValue}>{durationText}</Text>
            </View>
          )}
          {acceptedPrice != null && (
            <View style={s.recapRow}>
              <Handshake size={15} color="#64748B" />
              <Text style={s.recapLabel}>{t('providerMissionCompleted.acceptedOffer', { defaultValue: 'Offre acceptée' })}</Text>
              <Text style={s.recapValue}>{formatFcfa(acceptedPrice)}</Text>
            </View>
          )}
          {paymentLabel === 'received' && (
            <View style={s.paymentPill}>
              <Check size={14} color="#0F7B4F" strokeWidth={3} />
              <Text style={s.paymentPillText}>
                {t('providerMissionCompleted.paymentReceived', { defaultValue: 'Paiement reçu' })}
              </Text>
            </View>
          )}
        </View>

        {/* Détail des gains — reflète exactement le ledger backend */}
        {earnings && (
          <View style={s.card}>
            <Text style={s.sectionTitle}>
              {t('providerMissionCompleted.earningsTitle', { defaultValue: 'DÉTAIL DES GAINS' })}
            </Text>
            <View style={s.earnRow}>
              <Text style={s.earnLabel}>{t('providerMissionCompleted.labor', { defaultValue: "Main d'œuvre" })}</Text>
              <Text style={s.earnValue}>{formatFcfa(earnings.grossAmountFcfa)}</Text>
            </View>
            {typeof earnings.platformFeeFcfa === 'number' && earnings.platformFeeFcfa > 0 && (
              <View style={s.earnRow}>
                <Text style={s.earnLabel}>{t('providerMissionCompleted.platformFee', { defaultValue: 'Commission plateforme' })}</Text>
                <Text style={s.earnValue}>-{formatFcfa(earnings.platformFeeFcfa)}</Text>
              </View>
            )}
            {typeof earnings.bonusFcfa === 'number' && earnings.bonusFcfa > 0 && (
              <View style={s.earnRow}>
                <Text style={s.earnLabel}>{t('providerMissionCompleted.bonus', { defaultValue: 'Bonus rapidité' })}</Text>
                <Text style={[s.earnValue, { color: '#0F7B4F' }]}>+{formatFcfa(earnings.bonusFcfa)}</Text>
              </View>
            )}
            <View style={s.earnDivider} />
            <View style={s.earnRow}>
              <Text style={s.earnTotalLabel}>{t('providerMissionCompleted.totalCredited', { defaultValue: 'Total crédité' })}</Text>
              <Text style={s.earnTotalValue}>{formatFcfa(earnings.netAmountFcfa)}</Text>
            </View>
          </View>
        )}

        {/* Actions */}
        <TouchableOpacity style={s.primaryBtn} activeOpacity={0.88} onPress={() => router.push('/wallet')}>
          <Wallet size={17} color="#FFFFFF" style={{ marginRight: 8 }} />
          <Text style={s.primaryBtnText}>
            {t('providerMissionCompleted.viewEarnings', { defaultValue: 'Voir mes gains' })}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity style={s.secondaryBtn} activeOpacity={0.88} onPress={() => router.push('/nearby-requests')}>
          <Search size={17} color="#0A1628" style={{ marginRight: 8 }} />
          <Text style={s.secondaryBtnText}>
            {t('providerMissionCompleted.findNewMission', { defaultValue: 'Trouver une nouvelle mission' })}
          </Text>
        </TouchableOpacity>

        {/* Reçu : affiché uniquement si un reçu existe réellement côté backend */}
        {canDownloadReceipt && (
          <TouchableOpacity style={s.tertiaryBtn} activeOpacity={0.8} onPress={downloadReceipt} disabled={downloading}>
            {downloading
              ? <ActivityIndicator size="small" color="#0F7B4F" style={{ marginRight: 6 }} />
              : <FileText size={15} color="#0F7B4F" style={{ marginRight: 6 }} />}
            <Text style={s.tertiaryBtnText}>
              {t('providerMissionCompleted.downloadReceipt', { defaultValue: 'Télécharger le reçu' })}
            </Text>
          </TouchableOpacity>
        )}

        {/* Achievement — données réelles hebdomadaires */}
        {typeof weeklyCount === 'number' && weeklyCount > 0 && (
          <View style={s.achievementCard}>
            <Award size={22} color="#F59E0B" />
            <View style={{ flex: 1 }}>
              <Text style={s.achievementTitle}>
                {t('providerMissionCompleted.achievement', {
                  count: weeklyCount,
                  defaultValue: weeklyCount > 1
                    ? '{{count}} missions terminées cette semaine'
                    : '{{count}} mission terminée cette semaine',
                })}
              </Text>
              <Text style={s.achievementSub}>
                {t('providerMissionCompleted.achievementSub', { defaultValue: 'Continuez, vous êtes sur la bonne voie !' })}
              </Text>
            </View>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  )
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F5F6FA' },
  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F5F6FA', gap: 12 },
  loadingText: { fontSize: 14, color: '#6B7280' },
  retryBtn: { paddingHorizontal: 24, paddingVertical: 12, backgroundColor: '#0F7B4F', borderRadius: 14 },
  retryText: { color: '#FFFFFF', fontWeight: '700' },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12 },
  headerBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center' },
  headerTitle: { flex: 1, textAlign: 'center', fontSize: 17, fontWeight: '800', color: '#0A1628' },
  scroll: { padding: 16, gap: 14, paddingBottom: 40 },
  hero: { borderRadius: 24, padding: 24, alignItems: 'center', gap: 8 },
  heroCheck: { width: 64, height: 64, borderRadius: 32, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  heroTitle: { fontSize: 19, fontWeight: '800', color: '#FFFFFF', textAlign: 'center' },
  heroSubtitle: { fontSize: 13, color: '#D1FAE5' },
  heroAmountBox: { backgroundColor: 'rgba(255,255,255,0.16)', borderRadius: 16, paddingHorizontal: 22, paddingVertical: 12, alignItems: 'center', marginTop: 8 },
  heroAmount: { fontSize: 28, fontWeight: '800', color: '#FFFFFF' },
  heroAmountSub: { fontSize: 12, fontWeight: '600', color: '#D1FAE5', marginTop: 2 },
  heroPaymentPill: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8, backgroundColor: 'rgba(255,255,255,0.12)', borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6 },
  heroPaymentText: { fontSize: 12, fontWeight: '700', color: '#D1FAE5' },
  card: { backgroundColor: '#FFFFFF', borderRadius: 20, padding: 16, gap: 10 },
  sectionTitle: { fontSize: 11, fontWeight: '800', color: '#6B7280', letterSpacing: 0.8, marginBottom: 2 },
  clientRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatar: { width: 48, height: 48, borderRadius: 24 },
  avatarFallback: { backgroundColor: '#E6F4EC', alignItems: 'center', justifyContent: 'center' },
  avatarInitial: { fontSize: 18, fontWeight: '800', color: '#0F7B4F' },
  clientNameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  clientName: { fontSize: 15, fontWeight: '800', color: '#0A1628' },
  clientVerifiedText: { fontSize: 12, color: '#6B7280', marginTop: 1 },
  ratingPill: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#FFFBEB', borderRadius: 10, paddingHorizontal: 8, paddingVertical: 4 },
  ratingText: { fontSize: 13, fontWeight: '800', color: '#B45309' },
  reviewComment: { fontSize: 13, fontStyle: 'italic', color: '#374151', lineHeight: 19 },
  recapRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  recapLabel: { flex: 1, fontSize: 13, color: '#6B7280' },
  recapValue: { fontSize: 13, fontWeight: '700', color: '#0A1628', maxWidth: '55%', textAlign: 'right' },
  paymentPill: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: '#E6F4EC', borderRadius: 12, paddingVertical: 10, marginTop: 4 },
  paymentPillText: { fontSize: 13, fontWeight: '800', color: '#0F7B4F' },
  earnRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  earnLabel: { fontSize: 13, color: '#6B7280' },
  earnValue: { fontSize: 13, fontWeight: '700', color: '#0A1628' },
  earnDivider: { height: 1, backgroundColor: '#F1F5F9', marginVertical: 4 },
  earnTotalLabel: { fontSize: 14, fontWeight: '800', color: '#0A1628' },
  earnTotalValue: { fontSize: 16, fontWeight: '800', color: '#0F7B4F' },
  primaryBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#0F7B4F', borderRadius: 16, paddingVertical: 15 },
  primaryBtnText: { fontSize: 15, fontWeight: '800', color: '#FFFFFF' },
  secondaryBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFFFFF', borderRadius: 16, paddingVertical: 15, borderWidth: 1, borderColor: '#E2E8F0' },
  secondaryBtnText: { fontSize: 15, fontWeight: '700', color: '#0A1628' },
  tertiaryBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 8 },
  tertiaryBtnText: { fontSize: 13, fontWeight: '700', color: '#0F7B4F' },
  achievementCard: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#FFFFFF', borderRadius: 20, padding: 16, borderWidth: 1, borderColor: '#FDE68A' },
  achievementTitle: { fontSize: 14, fontWeight: '800', color: '#0A1628' },
  achievementSub: { fontSize: 12, color: '#6B7280', marginTop: 2 },
})

export default withScreenBoundary(MissionCompletedScreen, 'MissionCompleted')
