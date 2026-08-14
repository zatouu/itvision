/**
 * Xeuy Bi module — Public API.
 * Seul point d'entrée pour le reste de l'application.
 * Règle: ce module ne importe jamais depuis marketplace ou corporate.
 */

// Auth
export { signXeuyToken, verifyXeuyToken, requireXeuyAuth, extractXeuyToken } from './auth/session'
export { sendXeuyOtp, verifyXeuyOtp } from './auth/otp'

// User
export { createXeuyUser, findXeuyUserByPhone, createXeuyReferralCode, validateXeuyReferralCode } from './services/user'
export type { CreateXeuyUserInput } from './services/user'

// Wallet
export { getXeuyWallet, getXeuyWalletHistory, getXeuyWalletConfig, creditXeuyWelcomePoints } from './services/wallet'

// Types
export type { XeuyRole, XeuyUser, XeuySession, XeuyWallet } from './types'
