import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useTranslation } from 'react-i18next'
import AppHeader from '../../src/components/AppHeader'
import StatusChip from '../../src/components/StatusChip'
import { colors, spacing, radius, shadows, typography } from '../../src/design'
import { mockWalletHistory } from '../../src/mock'
import type { WalletEntry } from '../../src/types'

const TODAY = 12500
const WEEK = 68000
const MONTH = 214000
const BALANCE = 48500

export default function Wallet() {
  const { t } = useTranslation()
  const format = (n: number) => n.toLocaleString('fr-FR').replace(/\s/g, ' ')

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <AppHeader title={t('providerWallet.title')} showBell onBell={() => {}} />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: spacing.xxl }}>
        <View style={s.balanceCard}>
          <View style={s.balanceHeader}>
            <View>
              <Text style={s.balanceLabel}>{t('providerWallet.available')}</Text>
              <Text style={s.balanceValue}>{format(BALANCE)} <Text style={s.currency}>FCFA</Text></Text>
              <Text style={s.balanceSub}>{t('providerWallet.nextTransfer')}</Text>
            </View>
            <View style={s.walletIcon}>
              <Text style={s.walletIconText}>👛</Text>
            </View>
          </View>
          <View style={s.statusPill}>
            <Text style={s.statusPillText}>✓ {t('providerWallet.activeAccount')}</Text>
          </View>
        </View>

        <View style={s.kpiGrid}>
          <View style={s.kpiCard}>
            <Text style={s.kpiIcon}>📅</Text>
            <Text style={s.kpiValue}>{format(TODAY)}</Text>
            <Text style={s.kpiLabel}>{t('providerWallet.today')}</Text>
          </View>
          <View style={s.kpiCard}>
            <Text style={s.kpiIcon}>📆</Text>
            <Text style={s.kpiValue}>{format(WEEK)}</Text>
            <Text style={s.kpiLabel}>{t('providerWallet.week')}</Text>
          </View>
          <View style={s.kpiCard}>
            <Text style={s.kpiIcon}>🗓️</Text>
            <Text style={s.kpiValue}>{format(MONTH)}</Text>
            <Text style={s.kpiLabel}>{t('providerWallet.month')}</Text>
          </View>
        </View>

        <TouchableOpacity style={s.withdrawBtn} activeOpacity={0.85}>
          <Text style={s.withdrawIcon}>↗</Text>
          <Text style={s.withdrawText}>{t('providerWallet.withdraw')}</Text>
        </TouchableOpacity>

        <TouchableOpacity style={s.addMethodBtn} activeOpacity={0.85}>
          <Text style={s.addMethodIcon}>💳</Text>
          <Text style={s.addMethodText}>{t('providerWallet.addMethod')}</Text>
        </TouchableOpacity>

        <View style={s.sectionHeader}>
          <Text style={s.sectionTitle}>{t('providerWallet.recentHistory')}</Text>
          <TouchableOpacity activeOpacity={0.7}>
            <Text style={s.sectionAction}>{t('providerWallet.seeAll')}</Text>
          </TouchableOpacity>
        </View>

        <View style={s.historyList}>
          {mockWalletHistory.map((item: WalletEntry) => (
            <View key={item.id} style={s.historyRow}>
              <View style={[s.historyIcon, item.kind === 'commission' && s.historyIconRed, item.kind === 'withdrawal' && s.historyIconRed]}>
                <Text style={s.historyIconText}>
                  {item.kind === 'income' ? '⚡' : item.kind === 'commission' ? '−' : '↗'}
                </Text>
              </View>
              <View style={s.historyText}>
                <Text style={s.historyLabel}>{item.label}</Text>
                <Text style={s.historyDate}>{new Date(item.date).toLocaleDateString('fr-FR')}</Text>
              </View>
              <View style={s.historyRight}>
                <Text style={[s.historyAmount, item.amount < 0 && s.historyAmountRed]}>
                  {item.amount > 0 ? '+' : ''}{format(item.amount)} FCFA
                </Text>
                <StatusChip
                  label={item.status === 'available' ? t('providerWallet.available') : t('providerWallet.debit')}
                  variant={item.status === 'available' ? 'success' : 'danger'}
                  small
                />
              </View>
            </View>
          ))}
        </View>

        <View style={s.infoCard}>
          <Text style={s.infoIcon}>ℹ️</Text>
          <View style={{ flex: 1 }}>
            <Text style={s.infoTitle}>{t('providerWallet.transferInfo')}</Text>
            <Text style={s.infoText}>{t('providerWallet.transferInfoSub')}</Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}

const s = StyleSheet.create({
  balanceCard: {
    marginHorizontal: spacing.lg,
    marginTop: spacing.md,
    backgroundColor: colors.navy,
    borderRadius: radius.xl,
    padding: spacing.lg,
    ...shadows.lg,
  },
  balanceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  balanceLabel: { fontSize: typography.sm.fontSize, color: 'rgba(255,255,255,0.7)', marginBottom: spacing.xs },
  balanceValue: { fontSize: 40, fontWeight: typography.weight.extrabold as any, color: colors.surface, letterSpacing: -1 },
  currency: { fontSize: typography.md.fontSize, fontWeight: typography.weight.bold as any },
  balanceSub: { fontSize: typography.sm.fontSize, color: 'rgba(255,255,255,0.7)', marginTop: spacing.xs },
  walletIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  walletIconText: { fontSize: 24 },
  statusPill: {
    alignSelf: 'flex-start',
    marginTop: spacing.md,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  statusPillText: { fontSize: typography.sm.fontSize, color: colors.surface, fontWeight: typography.weight.extrabold as any },
  kpiGrid: {
    flexDirection: 'row',
    gap: spacing.md,
    marginHorizontal: spacing.lg,
    marginTop: spacing.md,
  },
  kpiCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
  },
  kpiIcon: { fontSize: 20, marginBottom: spacing.sm },
  kpiValue: {
    fontSize: typography.lg.fontSize,
    fontWeight: typography.weight.extrabold as any,
    color: colors.text,
  },
  kpiLabel: { fontSize: typography.xs.fontSize, color: colors.textSecondary, marginTop: 2 },
  withdrawBtn: {
    marginHorizontal: spacing.lg,
    marginTop: spacing.xl,
    backgroundColor: colors.primary,
    borderRadius: radius.xl,
    padding: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  withdrawIcon: { fontSize: 18, color: colors.surface },
  withdrawText: { fontSize: typography.md.fontSize, color: colors.surface, fontWeight: typography.weight.extrabold as any },
  addMethodBtn: {
    marginHorizontal: spacing.lg,
    marginTop: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    padding: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    borderWidth: 1.5,
    borderColor: colors.primary,
  },
  addMethodIcon: { fontSize: 18 },
  addMethodText: { fontSize: typography.md.fontSize, color: colors.primary, fontWeight: typography.weight.extrabold as any },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: spacing.lg,
    marginTop: spacing.xxl,
    marginBottom: spacing.md,
  },
  sectionTitle: {
    fontSize: typography.md.fontSize,
    fontWeight: typography.weight.extrabold as any,
    color: colors.text,
  },
  sectionAction: { fontSize: typography.sm.fontSize, color: colors.primary, fontWeight: typography.weight.semibold as any },
  historyList: {
    marginHorizontal: spacing.lg,
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  historyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  historyIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.successLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  historyIconRed: { backgroundColor: colors.dangerLight },
  historyIconText: { fontSize: 16, color: colors.success, fontWeight: typography.weight.extrabold as any },
  historyText: { flex: 1, gap: 2 },
  historyLabel: { fontSize: typography.base.fontSize, fontWeight: typography.weight.extrabold as any, color: colors.text },
  historyDate: { fontSize: typography.xs.fontSize, color: colors.textMuted },
  historyRight: { alignItems: 'flex-end', gap: 4 },
  historyAmount: { fontSize: typography.base.fontSize, fontWeight: typography.weight.extrabold as any, color: colors.success },
  historyAmountRed: { color: colors.danger },
  infoCard: {
    marginHorizontal: spacing.lg,
    marginTop: spacing.md,
    backgroundColor: colors.infoLight,
    borderRadius: radius.xl,
    padding: spacing.md,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  infoIcon: { fontSize: 18 },
  infoTitle: { fontSize: typography.sm.fontSize, fontWeight: typography.weight.extrabold as any, color: colors.info },
  infoText: { fontSize: typography.sm.fontSize, color: colors.info, marginTop: 2 },
})
