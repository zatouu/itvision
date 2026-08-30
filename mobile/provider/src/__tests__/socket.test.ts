function createMockSocket() {
  return {
    on: jest.fn(),
    off: jest.fn(),
    emit: jest.fn(),
    connect: jest.fn(),
    disconnect: jest.fn(),
    connected: false,
    id: 'mock-socket-id',
  }
}

const mockSockets: any[] = []

jest.mock('socket.io-client', () => ({
  io: jest.fn(() => {
    const s = createMockSocket()
    mockSockets.push(s)
    return s
  }),
}))

jest.mock('../api', () => ({
  getToken: jest.fn(() => 'test-token'),
  getBaseUrl: jest.fn(() => 'http://localhost:3000'),
}))

import { getSocket, connectSocket, resetSocket, joinRequestRoom, leaveRequestRoom, joinMissionChat, leaveMissionChat, emitProviderLocation, emitGps, onNearbyRequest } from '../socket'
import { io } from 'socket.io-client'

beforeEach(() => {
  jest.clearAllMocks()
  mockSockets.length = 0
  resetSocket()
})

describe('getSocket', () => {
  it('creates a socket instance', () => {
    const s = getSocket()
    expect(s).toBeDefined()
    expect(io).toHaveBeenCalled()
  })

  it('returns the same instance on subsequent calls', () => {
    const s1 = getSocket()
    const s2 = getSocket()
    expect(s1).toBe(s2)
  })
})

describe('connectSocket', () => {
  it('calls connect on the socket', () => {
    const s = connectSocket()
    expect(s).toBeDefined()
  })
})

describe('resetSocket', () => {
  it('forces creation of a new socket on next getSocket', () => {
    const s1 = getSocket()
    resetSocket()
    const s2 = getSocket()
    expect(s1).not.toBe(s2)
  })
})

describe('room helpers', () => {
  it('joinRequestRoom emits join-request-room', () => {
    joinRequestRoom('req123')
    const s = mockSockets[mockSockets.length - 1]
    expect(s.emit).toHaveBeenCalledWith('join-request-room', 'req123')
  })

  it('leaveRequestRoom emits leave-request-room', () => {
    connectSocket()
    const s = mockSockets[mockSockets.length - 1]
    leaveRequestRoom('req123')
    expect(s.emit).toHaveBeenCalledWith('leave-request-room', 'req123')
  })

  it('joinMissionChat emits join-mission-chat', () => {
    joinMissionChat('req456')
    const s = mockSockets[mockSockets.length - 1]
    expect(s.emit).toHaveBeenCalledWith('join-mission-chat', 'req456')
  })

  it('leaveMissionChat emits leave-mission-chat', () => {
    connectSocket()
    const s = mockSockets[mockSockets.length - 1]
    leaveMissionChat('req456')
    expect(s.emit).toHaveBeenCalledWith('leave-mission-chat', 'req456')
  })
})

describe('emitProviderLocation', () => {
  it('emits provider:location with requestId and coords', () => {
    connectSocket()
    const s = mockSockets[mockSockets.length - 1]
    emitProviderLocation('req789', { lat: 14.7, lng: -17.4, heading: 180, speed: 50 })
    expect(s.emit).toHaveBeenCalledWith('provider:location', { requestId: 'req789', lat: 14.7, lng: -17.4, heading: 180, speed: 50 })
  })
})

describe('emitGps', () => {
  it('emits provider:gps with lat/lng', () => {
    connectSocket()
    const s = mockSockets[mockSockets.length - 1]
    emitGps(14.7, -17.4)
    expect(s.emit).toHaveBeenCalledWith('provider:gps', { lat: 14.7, lng: -17.4 })
  })
})

describe('onNearbyRequest', () => {
  it('registers listener and returns unsubscribe', () => {
    const s = getSocket()
    const cb = jest.fn()
    const unsub = onNearbyRequest(cb)
    expect(s.on).toHaveBeenCalledWith('request:nearby', cb)
    unsub()
    expect(s.off).toHaveBeenCalledWith('request:nearby', cb)
  })
})
