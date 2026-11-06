import { DisputeError } from './DisputeError'

export class DisputeTransitionError extends DisputeError {
  constructor(from: string, to: string) {
    super(
      `Transition interdite: ${from} → ${to}`,
      'DISPUTE_TRANSITION_FORBIDDEN',
      409
    )
    this.name = 'DisputeTransitionError'
  }
}
