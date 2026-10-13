export const AndroidImportance = { HIGH: 4, MAX: 5 }
export const AndroidNotificationPriority = { HIGH: 'high' }

export const setNotificationHandler = jest.fn()
export const getPermissionsAsync = jest.fn(async () => ({ status: 'granted' }))
export const requestPermissionsAsync = jest.fn(async () => ({ status: 'granted' }))
export const getExpoPushTokenAsync = jest.fn(async () => ({ data: 'ExpoPushToken[test]' }))
export const getDevicePushTokenAsync = jest.fn(async () => ({ data: 'native-token-test' }))
export const scheduleNotificationAsync = jest.fn(async () => 'notification-id')
export const setNotificationChannelAsync = jest.fn(async () => undefined)
export const addNotificationReceivedListener = jest.fn(() => ({ remove: jest.fn() }))
export const addNotificationResponseReceivedListener = jest.fn(() => ({ remove: jest.fn() }))
export const getLastNotificationResponseAsync = jest.fn(async () => null)
export const registerTaskAsync = jest.fn(async () => undefined)

