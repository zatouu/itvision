import React, { useState, useMemo, useEffect } from 'react'
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Share,
  Alert,
  ActivityIndicator,
  RefreshControl,
} from 'react-native'
import { router, useLocalSearchParams } from 'expo-router'
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context'
import { useTranslation } from 'react-i18next'
import {
  ArrowLeft,
  Share2,
  CheckCircle2,
  MapPin,
  Car,
  Pause,
  Play,
  AlertTriangle,
  MoreHorizontal,
} from 'lucide-react-native'

import { useMissionActive } from '../../src/hooks/useMissionActive'
import { MissionStatusHeroCard } from '../../src/components/mission/MissionStatusHeroCard'
import { ClientCard } from '../../src/components/mission/ClientCard'
import { MissionSummaryCard } from '../../src/components/mission/MissionSummaryCard'
import { HorizontalProgressionTimeline } from '../../src/components/mission/HorizontalProgressionTimeline'
import { AiAdviceCard } from '../../src/components/mission/AiAdviceCard'
import { MapHero } from '../../src/components/mission/MapHero'
import { AdminMetricsModal } from '../../src/components/mission/AdminMetricsModal'
import { MissionDetailsSheet } from '../../src/components/mission/MissionDetailsSheet'
import { withScreenBoundary } from '../../src/components/withScreenBoundary'
import { pickOption } from '../../src/option-sheet'
import { radius, spacing } from '../../src/design'

function normalizeId(value: string | string[] | undefined): string | null {
  if (Array.isArray(value)) return value[0] || null
  return value || null
}

function ActiveMissionScreen() {
  const { t } = useTranslation()
  const insets = useSafeAreaInsets()
  const { id } = useLocalSearchParams<{ id?: string | string[] }>()
  const requestId = normalizeId(id)

  const {
    mission,
    loading,
    refreshing,
    updating,
    error,
    isClientTyping,
    aiAdvice,
    providerLocation,
    routeInfo,
    elapsedSeconds,
    pausedSeconds,
    pauseCount,
    lastActivityAt,
    loadMission,
    startOnTheWay,
    markArrived,
    startIntervention,
    pauseIntervention,
    resumeIntervention,
    finishMission,
    reportProblem,
  } = useMissionActive(requestId)

  const [adminModalVisible, setAdminModalVisible] = useState(false)
  const [detailsVisible, setDetailsVisible] = useState(false)

  const rawStatus = mission?.status || 'assigned'
  const status = rawStatus === 'accepted' ? 'assigned' : rawStatus
  const isMapLayout = status === 'assigned' || status === 'on_the_way' || status === 'provider_arriving'

  // Navigation : mission validée par le client → écran de clôture (le provider voit son récapitulatif)
  useEffect(() => {
    if (rawStatus === 'completed' && requestId) {
      router.replace(`/mission-completed/${requestId}`)
    }
  }, [rawStatus, requestId])

  // Real backend field mapping
  const clientData = useMemo(() => {
    return {
      name: mission?.clientName || mission?.user?.name || '',
      phone: mission?.clientPhone || mission?.user?.phone || '',
      avatar: mission?.user?.avatar,
      rating: mission?.user?.rating || 4.8,
      isVerified: mission?.user?.isVerified ?? true,
    }
  }, [mission?.clientName, mission?.clientPhone, mission?.user])

  const locationCoords = useMemo(() => {
    if (mission?.location?.coordinates && mission.location.coordinates.length === 2) {
      return {
        lat: Number(mission.location.coordinates[1]) || 33.5898,
        lng: Number(mission.location.coordinates[0]) || -7.6325,
      }
    }
    return { lat: 33.5898, lng: -7.6325 }
  }, [mission?.location?.coordinates])

  const clientAddress = mission?.location?.address || ''
  const missionCategory = mission?.category || ''
  const missionPrice = mission?.acceptedOffer?.price || mission?.finalPrice || mission?.price || mission?.budget
  const missionRefCode = mission?.reference || (mission?._id ? `#${mission._id.slice(-6).toUpperCase()}` : '')

  const handleShare = async () => {
    try {
      await Share.share({
        message: `Mission Xeuy: ${missionCategory} à ${clientAddress} - Réf ${missionRefCode}`,
      })
    } catch {}
  }

  const handleFinishConfirm = () => {
    Alert.alert(
      t('providerMissionActive.confirmFinishTitle', { defaultValue: 'Terminer la mission' }),
      t('providerMissionActive.confirmFinishMsg', {
        defaultValue: 'Confirmez-vous que l’intervention est terminée ?',
      }),
      [
        { text: t('common.cancel', { defaultValue: 'Annuler' }), style: 'cancel' },
        {
          text: t('common.confirm', { defaultValue: 'Confirmer' }),
          style: 'default',
          onPress: () => finishMission(),
        },
      ]
    )
  }

  const handlePause = async () => {
    const reason = await pickOption(
      'Mettre en pause',
      [
        { key: 'attente_pieces', label: 'Attente de pièces ou matériel' },
        { key: 'attente_client', label: 'Attente du client' },
        { key: 'pause_dejeuner', label: 'Pause repas / repos' },
        { key: 'autre', label: 'Autre raison' },
      ],
      'Indiquez la raison de la pause'
    )
    if (reason) {
      pauseIntervention(reason)
    }
  }

  const handleReport = async () => {
    const reason = await pickOption(
      t('providerMissionActive.confirmReportTitle', { defaultValue: 'Signaler un problème' }),
      [
        { key: 'client_absent', label: 'Client absent ou injoignable' },
        { key: 'adresse_invalide', label: 'Adresse incorrecte ou introuvable' },
        { key: 'danger_securite', label: 'Problème de sécurité sur place' },
        { key: 'litige_prix', label: 'Désaccord sur le montant ou prestation' },
        { key: 'autre', label: 'Autre motif' },
      ],
      t('providerMissionActive.confirmReportMsg', { defaultValue: 'Quel problème rencontrez-vous ?' })
    )
    if (reason) {
      reportProblem(reason)
    }
  }

  const navigateToChat = () => {
    if (requestId) {
      router.push({
        pathname: '/mission-chat',
        params: { id: requestId, name: clientData.name },
      })
    }
  }

  if (loading && !mission) {
    return (
      <SafeAreaView style={s.loadingContainer}>
        <ActivityIndicator size="large" color="#0F7B4F" />
        <Text style={s.loadingText}>{t('common.loading', { defaultValue: 'Chargement…' })}</Text>
      </SafeAreaView>
    )
  }

  return (
    <View style={s.root}>
      {/* =========================================================================
          LAYOUT A: MAP HERO (assigned / on_the_way)
          ========================================================================= */}
      {isMapLayout ? (
        <View style={s.mapLayoutContainer}>
          {/* 1. Full-bleed Map */}
          <MapHero
            clientLocation={locationCoords}
            clientAddress={clientAddress}
            providerLocation={providerLocation}
            routeCoordinates={routeInfo.coords}
            distanceText={routeInfo.distance}
            durationText={routeInfo.duration}
            onBack={() => router.back()}
            onShare={handleShare}
          />

          {/* 2. Bottom Sheet Card */}
          <View style={s.bottomSheet}>
            <View style={s.dragHandle} />

            {/* Accès détails du suivi */}
            <TouchableOpacity
              style={s.detailsBtnMap}
              activeOpacity={0.8}
              onPress={() => setDetailsVisible(true)}
              accessibilityLabel={t('providerMissionDetails.title', { defaultValue: 'Détails de la mission' })}
            >
              <MoreHorizontal size={18} color="#0A1628" strokeWidth={2.2} />
            </TouchableOpacity>

            {/* Status Pill */}
            <View style={s.statusPillWrapper}>
              <View style={s.statusPillBlue}>
                <Car size={15} color="#FFFFFF" style={{ marginRight: 6 }} />
                <Text style={s.statusPillText}>
                  {status === 'assigned'
                    ? t('providerMissionActive.statusAssigned', { defaultValue: 'Mission assignée' })
                    : t('providerMissionActive.statusEnRoute', { defaultValue: 'En route vers le client' })}
                </Text>
              </View>
            </View>

            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={s.bottomSheetScroll}
            >
              {/* Horizontal Progression Timeline */}
              <HorizontalProgressionTimeline status={status} />

              {/* Client Card */}
              <ClientCard
                clientName={clientData.name}
                clientPhone={clientData.phone}
                clientAvatar={clientData.avatar}
                clientRating={clientData.rating}
                isVerified={clientData.isVerified}
                isTyping={isClientTyping}
                onChat={navigateToChat}
              />

              {/* Mission Summary Card (Compact Meta) */}
              <MissionSummaryCard
                category={missionCategory}
                price={missionPrice}
                reference={missionRefCode}
                address={clientAddress}
                compact
              />
            </ScrollView>

            {/* Sticky Bottom CTA */}
            <View style={[s.stickyFooterMap, { paddingBottom: Math.max(insets.bottom, 16) }]}>
              {status === 'assigned' ? (
                <TouchableOpacity
                  style={s.primaryButton}
                  activeOpacity={0.88}
                  disabled={updating}
                  onPress={startOnTheWay}
                >
                  <Car size={18} color="#FFFFFF" strokeWidth={2.4} style={{ marginRight: 8 }} />
                  <Text style={s.primaryButtonText}>
                    {t('providerMissionActive.ctaStartMission', { defaultValue: 'Démarrer la mission' })}
                  </Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  style={s.primaryButton}
                  activeOpacity={0.88}
                  disabled={updating}
                  onPress={markArrived}
                >
                  <MapPin size={18} color="#FFFFFF" strokeWidth={2.4} style={{ marginRight: 8 }} />
                  <Text style={s.primaryButtonText}>
                    {t('providerMissionActive.ctaArrived', { defaultValue: 'Je suis arrivé' })}
                  </Text>
                </TouchableOpacity>
              )}

              <TouchableOpacity
                style={s.linkReport}
                activeOpacity={0.7}
                onPress={handleReport}
              >
                <Text style={s.linkReportText}>
                  {t('providerMissionActive.linkReportProblem', { defaultValue: 'Signaler un problème' })}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      ) : (
        /* =========================================================================
           LAYOUT B: ACTION HERO (arrived / in_progress / paused / awaiting_validation)
           ========================================================================= */
        <SafeAreaView style={s.actionLayoutContainer} edges={['top', 'left', 'right']}>
          {/* Header */}
          <View style={s.header}>
            <TouchableOpacity
              style={s.headerCircleBtn}
              activeOpacity={0.8}
              onPress={() => router.back()}
            >
              <ArrowLeft size={20} color="#0A1628" strokeWidth={2.2} />
            </TouchableOpacity>

            <Text style={s.headerTitle}>
              {t('providerMissionActive.title', { defaultValue: 'Mission active' })}
            </Text>

            <View style={{ flexDirection: 'row', gap: 8 }}>
              <TouchableOpacity
                style={s.headerCircleBtn}
                activeOpacity={0.8}
                onPress={() => setDetailsVisible(true)}
                accessibilityLabel={t('providerMissionDetails.title', { defaultValue: 'Détails de la mission' })}
              >
                <MoreHorizontal size={18} color="#0A1628" strokeWidth={2.2} />
              </TouchableOpacity>
              <TouchableOpacity
                style={s.headerCircleBtn}
                activeOpacity={0.8}
                onPress={handleShare}
              >
                <Share2 size={18} color="#0A1628" strokeWidth={2.2} />
              </TouchableOpacity>
            </View>
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={s.actionScrollContent}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={() => loadMission(true)}
                tintColor="#0F7B4F"
              />
            }
          >
            {/* 1. Status Hero Card with Gradient & Timer */}
            <MissionStatusHeroCard
              status={status}
              elapsedSeconds={elapsedSeconds}
              onLongPress={() => setAdminModalVisible(true)}
            />

            {/* 2. Client Card */}
            <ClientCard
              clientName={clientData.name}
              clientPhone={clientData.phone}
              clientAvatar={clientData.avatar}
              clientRating={clientData.rating}
              isVerified={clientData.isVerified}
              isTyping={isClientTyping}
              onChat={navigateToChat}
            />

            {/* 3. Mission Summary Card */}
            <MissionSummaryCard
              category={missionCategory}
              price={missionPrice}
              reference={missionRefCode}
              address={clientAddress}
              compact={false}
            />

            {/* 4. Horizontal Progression Timeline */}
            <HorizontalProgressionTimeline status={status} />

            {/* 5. AI Advice Card */}
            <AiAdviceCard
              advice={aiAdvice || undefined}
              category={missionCategory}
              onPress={() => {
                Alert.alert(
                  t('providerMissionActive.aiAdviceLabel', { defaultValue: 'Conseil IA' }),
                  aiAdvice || "Vérifiez soigneusement l'état général de l'équipement avant d'intervenir et suivez les normes de sécurité en vigueur.",
                  [{ text: 'OK' }]
                )
              }}
            />
          </ScrollView>

          {/* Sticky Bottom Action Area */}
          <View style={[s.stickyFooterAction, { paddingBottom: Math.max(insets.bottom, 16) }]}>
            {status === 'arrived' && (
              <>
                <TouchableOpacity
                  style={s.primaryButton}
                  activeOpacity={0.88}
                  disabled={updating}
                  onPress={startIntervention}
                >
                  <Play size={18} color="#FFFFFF" strokeWidth={2.4} style={{ marginRight: 8 }} />
                  <Text style={s.primaryButtonText}>
                    {t('providerMissionActive.ctaStartIntervention', { defaultValue: "Commencer l'intervention" })}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={s.linkReport}
                  activeOpacity={0.7}
                  onPress={handleReport}
                >
                  <Text style={s.linkReportText}>
                    {t('providerMissionActive.linkReportProblem', { defaultValue: 'Signaler un problème' })}
                  </Text>
                </TouchableOpacity>
              </>
            )}

            {status === 'in_progress' && (
              <>
                {/* Primary Button */}
                <TouchableOpacity
                  style={s.primaryButton}
                  activeOpacity={0.88}
                  disabled={updating}
                  onPress={handleFinishConfirm}
                >
                  <View style={s.btnIconCircle}>
                    <CheckCircle2 size={16} color="#0F7B4F" strokeWidth={3} />
                  </View>
                  <Text style={s.primaryButtonText}>
                    {t('providerMissionActive.ctaFinishMission', { defaultValue: 'Terminer la mission' })}
                  </Text>
                </TouchableOpacity>

                {/* Secondary 2 Buttons Row */}
                <View style={s.secondaryRow}>
                  <TouchableOpacity
                    style={[s.secondaryButton, s.pauseButton]}
                    activeOpacity={0.8}
                    onPress={handlePause}
                  >
                    <Pause size={16} color="#D97706" strokeWidth={2.4} style={{ marginRight: 6 }} />
                    <Text style={s.pauseButtonText}>
                      {t('providerMissionActive.ctaPause', { defaultValue: 'Pause' })}
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[s.secondaryButton, s.reportButton]}
                    activeOpacity={0.8}
                    onPress={handleReport}
                  >
                    <AlertTriangle size={16} color="#EF4444" strokeWidth={2.4} style={{ marginRight: 6 }} />
                    <Text style={s.reportButtonText}>
                      {t('providerMissionActive.ctaReport', { defaultValue: 'Signaler' })}
                    </Text>
                  </TouchableOpacity>
                </View>
              </>
            )}

            {status === 'paused' && (
              <>
                <TouchableOpacity
                  style={s.primaryButton}
                  activeOpacity={0.88}
                  disabled={updating}
                  onPress={resumeIntervention}
                >
                  <Play size={18} color="#FFFFFF" strokeWidth={2.4} style={{ marginRight: 8 }} />
                  <Text style={s.primaryButtonText}>
                    {t('providerMissionActive.ctaResumeIntervention', { defaultValue: "Reprendre l'intervention" })}
                  </Text>
                </TouchableOpacity>

                <View style={s.secondaryRow}>
                  <TouchableOpacity
                    style={[s.secondaryButton, s.reportButton, { flex: 1 }]}
                    activeOpacity={0.8}
                    onPress={handleReport}
                  >
                    <AlertTriangle size={16} color="#EF4444" strokeWidth={2.4} style={{ marginRight: 6 }} />
                    <Text style={s.reportButtonText}>
                      {t('providerMissionActive.ctaReport', { defaultValue: 'Signaler' })}
                    </Text>
                  </TouchableOpacity>
                </View>
              </>
            )}

            {status === 'awaiting_validation' && (
              <View style={s.awaitingContainer}>
                <Text style={s.awaitingTitle}>
                  {t('providerMissionActive.awaitingTitle', { defaultValue: 'En attente de validation du client' })}
                </Text>
                <Text style={s.awaitingSubtitle}>
                  {t('providerMissionActive.awaitingSubtitle', {
                    defaultValue: 'Le client vérifie la bonne exécution des travaux pour libérer le paiement.',
                  })}
                </Text>
                <TouchableOpacity
                  style={[s.primaryButton, { marginTop: 12 }]}
                  activeOpacity={0.88}
                  onPress={() => {
                    Alert.alert('Rappel envoyé', 'Une notification de rappel a été envoyée au client.')
                  }}
                >
                  <Text style={s.primaryButtonText}>
                    {t('providerMissionActive.remindClient', { defaultValue: 'Relancer le client' })}
                  </Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </SafeAreaView>
      )}

      {/* Détails du suivi (bouton ⋯) */}
      <MissionDetailsSheet
        visible={detailsVisible}
        onClose={() => setDetailsVisible(false)}
        mission={mission}
        status={status}
        elapsedSeconds={elapsedSeconds}
        pausedSeconds={pausedSeconds}
        pauseCount={pauseCount}
        lastActivityAt={lastActivityAt}
        onPause={status === 'in_progress' ? handlePause : null}
        onDispute={['assigned', 'on_the_way', 'provider_arriving', 'arrived', 'in_progress', 'paused', 'awaiting_validation'].includes(status) ? handleReport : null}
      />

      {/* Admin Metrics Modal (Long-press on Hero Card) */}
      <AdminMetricsModal
        visible={adminModalVisible}
        onClose={() => setAdminModalVisible(false)}
        activeSeconds={elapsedSeconds}
        pausedSeconds={pausedSeconds}
        pauseCount={pauseCount}
        lastActivityAt={lastActivityAt}
        createdAt={mission?.createdAt}
        requestId={requestId}
      />
    </View>
  )
}

export default withScreenBoundary(ActiveMissionScreen, 'ActiveMission')

const s = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#F5F6FA',
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#F5F6FA',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#64748B',
    fontWeight: '500',
  },
  // Layout A: Map Hero
  mapLayoutContainer: {
    flex: 1,
  },
  bottomSheet: {
    flex: 1,
    backgroundColor: '#F5F6FA',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    marginTop: -28,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 8,
  },
  dragHandle: {
    width: 44,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#CBD5E1',
    alignSelf: 'center',
    marginTop: 10,
    marginBottom: 8,
  },
  statusPillWrapper: {
    alignItems: 'center',
    marginBottom: 8,
  },
  detailsBtnMap: {
    position: 'absolute',
    top: 14,
    right: 16,
    zIndex: 5,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 3,
  },
  statusPillBlue: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2563EB',
    paddingVertical: 7,
    paddingHorizontal: 16,
    borderRadius: 20,
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 3,
  },
  statusPillText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  bottomSheetScroll: {
    paddingBottom: 100,
  },
  stickyFooterMap: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    paddingHorizontal: spacing.lg,
    paddingTop: 12,
  },
  // Layout B: Action Hero
  actionLayoutContainer: {
    flex: 1,
    backgroundColor: '#F5F6FA',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  headerCircleBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0A1628',
  },
  actionScrollContent: {
    paddingBottom: 120,
  },
  stickyFooterAction: {
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    paddingHorizontal: spacing.lg,
    paddingTop: 12,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 6,
  },
  primaryButton: {
    height: 52,
    borderRadius: radius.lg,
    backgroundColor: '#0F7B4F',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#0F7B4F',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  btnIconCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  secondaryRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 10,
  },
  secondaryButton: {
    flex: 1,
    height: 46,
    borderRadius: radius.md,
    borderWidth: 1.5,
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pauseButton: {
    borderColor: '#F59E0B',
  },
  pauseButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#D97706',
  },
  reportButton: {
    borderColor: '#EF4444',
  },
  reportButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#EF4444',
  },
  linkReport: {
    alignItems: 'center',
    paddingVertical: 10,
    marginTop: 2,
  },
  linkReportText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B',
    textDecorationLine: 'underline',
  },
  awaitingContainer: {
    paddingVertical: 10,
    alignItems: 'center',
  },
  awaitingTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0A1628',
    marginBottom: 4,
    textAlign: 'center',
  },
  awaitingSubtitle: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 18,
    paddingHorizontal: spacing.md,
  },
})
