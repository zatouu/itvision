import React from 'react'
import { View, Text, StyleSheet, TouchableOpacity, Linking } from 'react-native'
import { Image } from 'expo-image'
import { Phone, MessageSquare, Check, Star } from 'lucide-react-native'
import { useTranslation } from 'react-i18next'
import { colors, radius, spacing } from '../../design'

interface Props {
  clientName?: string
  clientPhone?: string
  clientAvatar?: string
  clientRating?: number
  isVerified?: boolean
  isTyping?: boolean
  onCall?: () => void
  onChat?: () => void
}

const BLURHASH = 'L6PZfSi_.AyE_3t7t7R**0o#DgR4'
const DEFAULT_AVATAR = 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300&auto=format&fit=crop&q=80'

export const ClientCard: React.FC<Props> = ({
  clientName = 'Aïcha Bâ',
  clientPhone,
  clientAvatar,
  clientRating = 4.8,
  isVerified = true,
  isTyping = false,
  onCall,
  onChat,
}) => {
  const { t } = useTranslation()

  const handleCall = () => {
    if (onCall) {
      onCall()
      return
    }
    if (clientPhone) {
      Linking.openURL(`tel:${clientPhone}`).catch(() => {})
    }
  }

  const avatarUri = clientAvatar || DEFAULT_AVATAR

  return (
    <View style={s.card}>
      <View style={s.avatarWrapper}>
        <Image
          source={{ uri: avatarUri }}
          placeholder={BLURHASH}
          contentFit="cover"
          transition={200}
          style={s.avatar}
        />
        {isVerified && (
          <View style={s.verifiedBadge}>
            <Check size={10} color="#FFFFFF" strokeWidth={3.5} />
          </View>
        )}
      </View>

      <View style={s.infoColumn}>
        <Text style={s.name} numberOfLines={1}>
          {clientName}
        </Text>
        <View style={s.metaRow}>
          <Star size={13} color="#F59E0B" fill="#F59E0B" style={{ marginRight: 3 }} />
          <Text style={s.ratingText}>
            {clientRating.toFixed(1)}
          </Text>
          <Text style={s.bullet}>·</Text>
          <Text style={s.verifiedText}>
            {t('providerMissionActive.clientVerified', { defaultValue: 'Cliente vérifiée' })}
          </Text>
        </View>
      </View>

      <View style={s.actionsRow}>
        <TouchableOpacity
          style={[s.actionButton, s.callButton]}
          activeOpacity={0.75}
          onPress={handleCall}
        >
          <Phone size={18} color="#0F7B4F" strokeWidth={2.2} />
        </TouchableOpacity>

        <TouchableOpacity
          style={[s.actionButton, s.chatButton]}
          activeOpacity={0.75}
          onPress={onChat}
        >
          <MessageSquare size={18} color="#2563EB" strokeWidth={2.2} />
          {isTyping && <View style={s.typingDot} />}
        </TouchableOpacity>
      </View>
    </View>
  )
}

const s = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: radius['2xl'],
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  avatarWrapper: {
    position: 'relative',
    marginRight: spacing.md,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#F1F5F9',
  },
  verifiedBadge: {
    position: 'absolute',
    bottom: -1,
    right: -1,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#0F7B4F',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  infoColumn: {
    flex: 1,
    justifyContent: 'center',
  },
  name: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0A1628',
    marginBottom: 4,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ratingText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#64748B',
  },
  bullet: {
    fontSize: 13,
    color: '#94A3B8',
    marginHorizontal: 5,
  },
  verifiedText: {
    fontSize: 13,
    color: '#64748B',
    fontWeight: '500',
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginLeft: spacing.sm,
  },
  actionButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  callButton: {
    backgroundColor: '#E8F5EE',
  },
  chatButton: {
    backgroundColor: '#EFF6FF',
  },
  typingDot: {
    position: 'absolute',
    top: 3,
    right: 3,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#2563EB',
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
  },
})
