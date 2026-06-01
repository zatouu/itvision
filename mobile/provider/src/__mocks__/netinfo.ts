export default {
  addEventListener: jest.fn(() => jest.fn()),
  fetch: jest.fn(async () => ({ isConnected: true, isInternetReachable: true })),
}
export type NetInfoState = { isConnected: boolean | null; isInternetReachable: boolean | null }
