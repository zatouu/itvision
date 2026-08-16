import React from 'react'
import { View, Text, StyleSheet } from 'react-native'
import { Check } from 'lucide-react-native'
import { useTranslation } from 'react-i18next'
import { radius, spacing } from '../../design'

interface Props {
  status: string
}

interface StepItem {
  key: string
  labelKey: string
  defaultLabel: string
}

const STEPS: StepItem[] = [
  { key: 'assigned', labelKey: 'providerMissionActive.progressAssigned', defaultLabel: 'Assignée' },
  { key: 'on_the_way', labelKey: 'providerMissionActive.progressEnRoute', defaultLabel: 'En route' },
  { key: 'arrived', labelKey: 'providerMissionActive.progressArrived', defaultLabel: 'Arrivé' },
  { key: 'in_progress', labelKey: 'providerMissionActive.progressInProgress', defaultLabel: 'En cours' },
  { key: 'completed', labelKey: 'providerMissionActive.progressCompleted', defaultLabel: 'Terminée' },
]

function getStepIndex(status: string): number {
  switch (status) {
    case 'created':
    case 'broadcasted':
    case 'accepted':
    case 'assigned':
      return 0
    case 'on_the_way':
    case 'provider_arriving':
      return 1
    case 'arrived':
      return 2
    case 'in_progress':
    case 'paused':
      return 3
    case 'awaiting_validation':
    case 'completed':
      return 4
    default:
      return 0
  }
}

export const HorizontalProgressionTimeline: React.FC<Props> = ({ status }) => {
  const { t } = useTranslation()
  const currentIndex = getStepIndex(status)

  return (
    <View style={s.card}>
      <View style={s.timelineRow}>
        {STEPS.map((step, idx) => {
          const isDone = idx < currentIndex
          const isActive = idx === currentIndex
          const isPending = idx > currentIndex
          const hasRightLine = idx < STEPS.length - 1
          const isLineActive = idx < currentIndex

          return (
            <React.Fragment key={step.key}>
              <View style={s.stepWrapper}>
                <View style={s.nodeSlot}>
                  {isDone && (
                    <View style={s.doneNode}>
                      <Check size={11} color="#FFFFFF" strokeWidth={3} />
                    </View>
                  )}

                  {isActive && (
                    <View style={s.activeNodeOuter}>
                      <View style={s.activeNodeInner} />
                    </View>
                  )}

                  {isPending && <View style={s.pendingNode} />}
                </View>

                <Text
                  style={[
                    s.stepLabel,
                    isActive && s.stepLabelActive,
                    isDone && s.stepLabelDone,
                    isPending && s.stepLabelPending,
                  ]}
                  numberOfLines={1}
                >
                  {t(step.labelKey, { defaultValue: step.defaultLabel })}
                </Text>
              </View>

              {hasRightLine && (
                <View
                  style={[
                    s.connectingLine,
                    isLineActive ? s.connectingLineActive : s.connectingLineInactive,
                  ]}
                />
              )}
            </React.Fragment>
          )
        })}
      </View>
    </View>
  )
}

const s = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: radius['2xl'],
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.md,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  timelineRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    width: '100%',
  },
  stepWrapper: {
    alignItems: 'center',
    width: 58,
  },
  nodeSlot: {
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  doneNode: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#0F7B4F',
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeNodeOuter: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#0F7B4F',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: '#E8F5EE',
  },
  activeNodeInner: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FFFFFF',
  },
  pendingNode: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#CBD5E1',
  },
  connectingLine: {
    flex: 1,
    height: 2,
    marginTop: 13, // align with node center (28px height / 2 - 1px)
    marginHorizontal: -4,
  },
  connectingLineActive: {
    backgroundColor: '#0F7B4F',
  },
  connectingLineInactive: {
    backgroundColor: '#E2E8F0',
  },
  stepLabel: {
    fontSize: 11,
    textAlign: 'center',
    fontWeight: '500',
  },
  stepLabelActive: {
    color: '#0F7B4F',
    fontWeight: '800',
  },
  stepLabelDone: {
    color: '#64748B',
  },
  stepLabelPending: {
    color: '#94A3B8',
  },
})
