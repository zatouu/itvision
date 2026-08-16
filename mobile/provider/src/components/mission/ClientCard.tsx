import React from 'react'
import { View, Text, StyleSheet, TouchableOpacity, Linking } from 'react-native'
import { Image } from 'expo-image'
import { Phone, MessageSquare, Check, Star } from 'lucide-react-native'
import { useTranslation } from 'react-i18next'
import { radius, spacing } from '../../design'

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

function getInitials(name?: string, phone?: string): string {
  if (name && name.trim()) {
    const parts = name.trim().split(/\s+/)
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase()
    }
    return parts[0].slice(0, 2).toUpperCase()
  }
  if (phone && phone.trim()) {
    const clean = phone.replace(/[^0-9]/g, '')
    return clean.slice(-2) || 'CL'
  }
  return 'CL'
}

export const ClientCard: React.FC<Props> = ({
  clientName,
  clientPhone,
  clientAvatar,
  clientRating = 4.8,
  isVerified = true,
  isTyping = false,
  onCall,
  onChat,
}) => {
  const { t } = useTranslation()

  const displayName = clientName || clientPhone || t('common.client', { defaultValue: 'Client' })
  const initials = getInitials(clientName, clientPhone)
  const hasRealAvatar = !!(
    clientAvatar &&
    typeof clientAvatar === 'string' &&
    clientAvatar.startsWith('http') &&
    !clientAvatar.includes('unsplash.com')
  )

  const handleCall = () => {
    if (onCall) {
      onCall()
      return
    }
    if (clientPhone) {
      Linking.openURL(`tel:${clientPhone}`).catch(() => {})
    }
  }

  return (
    <View style={s.card}>
      <View style={s.avatarWrapper}>
        {hasRealAvatar ? (
          <Image
            source={{ uri: clientAvatar }}
            contentFit="cover"
            transition={200}
            style={s.avatar}
          />
        ) : (
          <View style={s.initialsAvatar}>
            <Text style={s.initialsText}>{initials}</Text>
          </View>
        )}

        {isVerified && (
          <View style={s.verifiedBadge}>
            <Check size={9} color="#FFFFFF" strokeWidth={3.5} />
          </View>
        )}
      </View>

      <View style={s.infoColumn}>
        <Text style={s.name} numberOfLines={1}>
          {displayName}
        </Text>
        <View style={s.metaRow}>
          <Star size={12} color="#F59E0B" fill="#F59E0B" style={{ marginRight: 3 }} />
          <Text style={s.ratingText}>
            {Number(clientRating || 4.8).toFixed(1)}
          </Text>
          <Text style={s.bullet}>·</Text>
          <Text style={s.verifiedText}>
            {t('providerMissionActive.clientVerified', { defaultValue: 'Client vérifié' })}
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
    borderRadius: radius.xl,
    paddingVertical: 14,
    paddingHorizontal: 16,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: '#EEF2F6',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  avatarWrapper: {
    position: 'relative',
    marginRight: 12,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#F1F5F9',
  },
  initialsAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#E0E7FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  initialsText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#3730A3',
    letterSpacing: 0.5,
  },
  verifiedBadge: {
    position: 'absolute',
    bottom: -1,
    right: -1,
    width: 17,
    height: 17,
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
    fontWeight: '800',
    color: '#0A1628',
    marginBottom: 2,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ratingText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#475569',
  },
  bullet: {
    marginHorizontal: 4,
    color: '#94A3B8',
    fontSize: 11,
  },
  verifiedText: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '500',
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginLeft: 6,
  },
  actionButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  callButton: {
    backgroundColor: '#ECFDF5',
  },
  chatButton: {
    backgroundColor: '#EFF6FF',
  },
  typingDot: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#2563EB',
  },
})
