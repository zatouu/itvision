import { useEffect, useRef } from 'react'
import {
  View,
  TouchableWithoutFeedback,
  Animated,
  PanResponder,
  Dimensions,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native'

const SCREEN_H = Dimensions.get('window').height

type Props = {
  visible: boolean
  onClose: () => void
  children: React.ReactNode
  maxHeight?: number
}

export default function BottomSheet({ visible, onClose, children, maxHeight }: Props) {
  const sheetH = maxHeight ?? SCREEN_H * 0.85
  const translateY = useRef(new Animated.Value(sheetH)).current
  const backdropOpacity = useRef(new Animated.Value(0)).current
  const isVisible = useRef(false)

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, g) => g.dy > 4,
      onPanResponderMove: (_, g) => {
        if (g.dy > 0) translateY.setValue(g.dy)
      },
      onPanResponderRelease: (_, g) => {
        if (g.dy > 80 || g.vy > 0.5) {
          hide()
        } else {
          Animated.spring(translateY, {
            toValue: 0,
            useNativeDriver: true,
            tension: 65,
            friction: 11,
          }).start()
        }
      },
    })
  ).current

  const show = () => {
    isVisible.current = true
    Animated.parallel([
      Animated.spring(translateY, {
        toValue: 0,
        useNativeDriver: true,
        tension: 65,
        friction: 11,
      }),
      Animated.timing(backdropOpacity, {
        toValue: 1,
        duration: 250,
        useNativeDriver: true,
      }),
    ]).start()
  }

  const hide = () => {
    Animated.parallel([
      Animated.timing(translateY, {
        toValue: sheetH,
        duration: 220,
        useNativeDriver: true,
      }),
      Animated.timing(backdropOpacity, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => {
      isVisible.current = false
      onClose()
    })
  }

  useEffect(() => {
    if (visible && !isVisible.current) {
      translateY.setValue(sheetH)
      show()
    } else if (!visible && isVisible.current) {
      hide()
    }
  }, [visible])

  if (!visible && !isVisible.current) return null

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
      <TouchableWithoutFeedback onPress={hide}>
        <Animated.View style={[s.backdrop, { opacity: backdropOpacity }]} />
      </TouchableWithoutFeedback>

      <KeyboardAvoidingView
        style={s.sheetWrapper}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={0}
      >
        <Animated.View
          style={[s.sheet, { maxHeight: sheetH, transform: [{ translateY }] }]}
          {...panResponder.panHandlers}
        >
          <View style={s.handle} />
          <ScrollView
            bounces={false}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {children}
          </ScrollView>
        </Animated.View>
      </KeyboardAvoidingView>
    </View>
  )
}

const s = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  sheetWrapper: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 24,
    paddingBottom: 36,
    paddingTop: 12,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#D1D5DB',
    alignSelf: 'center',
    marginBottom: 16,
  },
})
