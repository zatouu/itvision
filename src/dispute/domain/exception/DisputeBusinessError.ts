import { DisputeError } from './DisputeError'

export class DisputeBusinessError extends DisputeError {
  constructor(message: string, statusCode: number = 409) {
    super(message, 'DISPUTE_BUSINESS_ERROR', statusCode)
    this.name = 'DisputeBusinessError'
  }
}
