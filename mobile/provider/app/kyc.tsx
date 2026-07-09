import { useState, useEffect } from 'react'
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, Alert, ScrollView } from 'react-native'
import { Image } from 'expo-image'
import { TextInput } from 'react-native'
import { router } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import { apiGet, apiPost, apiUpload } from '../src/api'
import { pickMedia, captureMedia } from '../src/media'
import { withScreenBoundary } from '../src/components/withScreenBoundary'
import { useTranslation } from 'react-i18next'
import { ArrowLeft, CheckCircle2, Clock } from 'lucide-react-native'

type KycStatus = 'none' | 'pending' | 'approved' | 'rejected'

function KycScreen() {
  const { t } = useTranslation()
  const [status, setStatus] = useState<KycStatus>('none')
  const [rejectionReason, setRejectionReason] = useState('')
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  const [fullName, setFullName] = useState('')
  const [trade, setTrade] = useState('')
  const [idFrontUri, setIdFrontUri] = useState<string | null>(null)
  const [idBackUri, setIdBackUri] = useState<string | null>(null)
  const [selfieUri, setSelfieUri] = useState<string | null>(null)

  useEffect(() => {
    apiGet('/api/kyc/status')
      .then(r => {
        setStatus(r.status || 'none')
        if (r.kyc?.rejectionReason) setRejectionReason(r.kyc.rejectionReason)
        if (r.kyc?.fullName) setFullName(r.kyc.fullName)
        if (r.kyc?.trade) setTrade(r.kyc.trade)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const pickImage = async (setter: (uri: string) => void, useCamera = false, selfie = false) => {
    try {
      const picked = useCamera
        ? await captureMedia({ selfie })
        : await pickMedia({ maxFiles: 1 })
      if (picked.length > 0) setter(picked[0].uri)
    } catch (e: any) {
      Alert.alert(t('common.error'), e?.message || t('kyc.uploadError'))
    }
  }

  const submit = async () => {
    if (!fullName.trim() || !trade.trim() || !idFrontUri || !selfieUri) {
      Alert.alert(t('kyc.missingFields'), t('kyc.missingFieldsMsg'))
      return
    }
    setSubmitting(true)
    try {
      // Upload images
      const frontRes = await apiUpload(idFrontUri, 'cni-recto.jpg', 'image/jpeg')
      const frontUrl = frontRes?.staticUrl || frontRes?.url
      if (!frontUrl) throw new Error('Upload CNI recto échoué')

      let backUrl = ''
      if (idBackUri) {
        const backRes = await apiUpload(idBackUri, 'cni-verso.jpg', 'image/jpeg')
        backUrl = backRes?.staticUrl || backRes?.url || ''
      }

      const selfieRes = await apiUpload(selfieUri, 'selfie.jpg', 'image/jpeg')
      const selfieUrl = selfieRes?.staticUrl || selfieRes?.url
      if (!selfieUrl) throw new Error('Upload selfie échoué')

      await apiPost('/api/kyc/submit', {
        fullName: fullName.trim(),
        trade: trade.trim(),
        idCardFrontUrl: frontUrl,
        idCardBackUrl: backUrl,
        selfieUrl,
      })

      setStatus('pending')
      Alert.alert(t('kyc.submitSuccess'), t('kyc.submitSuccessMsg'))
    } catch (e: any) {
      Alert.alert(t('common.error'), e.message || t('kyc.submitError'))
    }
    setSubmitting(false)
  }

  if (loading) {
    return (
      <SafeAreaView style={s.safe}>
        <View style={s.center}><ActivityIndicator size="large" color="#F59E0B" /></View>
      </SafeAreaView>
    )
  }

  if (status === 'approved') {
    return (
      <SafeAreaView style={s.safe}>
        <View style={s.center}>
          <CheckCircle2 size={48} color="#16A34A" />
          <Text style={s.statusTitle}>{t('kyc.approved')}</Text>
          <Text style={s.statusSub}>{t('kyc.approvedMsg')}</Text>
          <TouchableOpacity style={s.btn} onPress={() => router.back()}>
            <Text style={s.btnText}>{t('kyc.back')}</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    )
  }

  if (status === 'pending') {
    return (
      <SafeAreaView style={s.safe}>
        <View style={s.center}>
          <Clock size={48} color="#F59E0B" />
          <Text style={s.statusTitle}>{t('kyc.pending')}</Text>
          <Text style={s.statusSub}>{t('kyc.pendingMsg')}</Text>
          <TouchableOpacity style={s.btn} onPress={() => router.back()}>
            <Text style={s.btnText}>{t('kyc.back')}</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={s.safe}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <ArrowLeft size={22} color="#0F172A" />
        </TouchableOpacity>
        <Text style={s.headerTitle}>{t('kyc.title')}</Text>
        <View style={{ width: 28 }} />
      </View>

      <ScrollView contentContainerStyle={s.body} keyboardShouldPersistTaps="handled">
        {status === 'rejected' && (
          <View style={s.rejectedBox}>
            <Text style={s.rejectedTitle}>{t('kyc.rejected')}</Text>
            <Text style={s.rejectedReason}>{rejectionReason || t('kyc.rejectedReason')}</Text>
            <Text style={s.rejectedHint}>{t('kyc.rejectedHint')}</Text>
          </View>
        )}

        <Text style={s.sectionTitle}>{t('kyc.personalInfo')}</Text>
        <View style={s.field}>
          <Text style={s.label}>{t('kyc.fullName')}</Text>
          <TextInput style={s.input} value={fullName} onChangeText={setFullName} placeholder={t('kyc.fullNamePlaceholder')} placeholderTextColor="#9CA3AF" />
        </View>
        <View style={s.field}>
          <Text style={s.label}>{t('kyc.trade')}</Text>
          <TextInput style={s.input} value={trade} onChangeText={setTrade} placeholder={t('kyc.tradePlaceholder')} placeholderTextColor="#9CA3AF" />
        </View>

        <Text style={[s.sectionTitle, { marginTop: 20 }]}>{t('kyc.documents')}</Text>

        <View style={s.field}>
          <Text style={s.label}>{t('kyc.idFront')}</Text>
          <TouchableOpacity style={s.photoBtn} onPress={() => pickImage(setIdFrontUri, true)}>
            {idFrontUri ? (
              <Image source={{ uri: idFrontUri }} style={s.photoPreview} />
            ) : (
              <Text style={s.photoPlaceholder}>{t('kyc.takePhoto')}</Text>
            )}
          </TouchableOpacity>
        </View>

        <View style={s.field}>
          <Text style={s.label}>{t('kyc.idBack')}</Text>
          <TouchableOpacity style={s.photoBtn} onPress={() => pickImage(setIdBackUri)}>
            {idBackUri ? (
              <Image source={{ uri: idBackUri }} style={s.photoPreview} />
            ) : (
              <Text style={s.photoPlaceholder}>{t('kyc.takePhoto')}</Text>
            )}
          </TouchableOpacity>
        </View>

        <View style={s.field}>
          <Text style={s.label}>{t('kyc.selfie')}</Text>
          <Text style={s.hint}>{t('kyc.selfieHint')}</Text>
          <TouchableOpacity style={s.photoBtn} onPress={() => pickImage(setSelfieUri, true, true)}>
            {selfieUri ? (
              <Image source={{ uri: selfieUri }} style={s.photoPreview} />
            ) : (
              <Text style={s.photoPlaceholder}>{t('kyc.takeSelfie')}</Text>
            )}
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={[s.submitBtn, submitting && s.submitBtnDisabled]}
          disabled={submitting}
          onPress={submit}
        >
          {submitting ? <ActivityIndicator color="#fff" /> : <Text style={s.submitText}>{t('kyc.submit')}</Text>}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  )
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F8FAFC' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 12 },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#E2E8F0',
  },
  backIcon: { color: '#0F172A' },
  headerTitle: { fontSize: 17, fontWeight: '700', color: '#0F172A' },
  body: { padding: 20, gap: 12, paddingBottom: 40 },
  badge: { color: '#0F172A' },
  statusTitle: { fontSize: 20, fontWeight: '700', color: '#0F172A' },
  statusSub: { fontSize: 14, color: '#64748B', textAlign: 'center', lineHeight: 20 },
  btn: { backgroundColor: '#0F172A', borderRadius: 12, paddingHorizontal: 24, paddingVertical: 12, marginTop: 8 },
  btnText: { color: '#fff', fontWeight: '600' },
  rejectedBox: { backgroundColor: '#FEF2F2', borderRadius: 12, padding: 14, gap: 4, borderWidth: 1, borderColor: '#FECACA' },
  rejectedTitle: { fontSize: 15, fontWeight: '700', color: '#DC2626' },
  rejectedReason: { fontSize: 13, color: '#991B1B' },
  rejectedHint: { fontSize: 12, color: '#B91C1C', marginTop: 4 },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: '#334155' },
  field: { gap: 4 },
  label: { fontSize: 13, fontWeight: '600', color: '#475569' },
  hint: { fontSize: 11, color: '#9CA3AF' },
  input: {
    backgroundColor: '#fff', borderRadius: 10, borderWidth: 1, borderColor: '#E2E8F0',
    paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: '#0F172A',
  },
  photoBtn: {
    backgroundColor: '#fff', borderRadius: 12, borderWidth: 1.5, borderColor: '#E2E8F0',
    borderStyle: 'dashed', height: 120, alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
  },
  photoPlaceholder: { fontSize: 14, color: '#94A3B8' },
  photoPreview: { width: '100%', height: '100%', resizeMode: 'cover' },
  submitBtn: { backgroundColor: '#059669', borderRadius: 14, padding: 16, alignItems: 'center', marginTop: 12 },
  submitBtnDisabled: { opacity: 0.5 },
  submitText: { color: '#fff', fontSize: 16, fontWeight: '700' },
})

export default withScreenBoundary(KycScreen, 'KYC')
