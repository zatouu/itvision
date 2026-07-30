import { DisputeError } from './DisputeError'

export class DisputeValidationError extends DisputeError {
  constructor(message: string) {
    super(message, 'DISPUTE_VALIDATION_ERROR', 400)
    this.name = 'DisputeValidationError'
  }
}
