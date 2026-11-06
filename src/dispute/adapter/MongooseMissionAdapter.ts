import mongoose from 'mongoose'
import ServiceRequest from '@/lib/models/ServiceRequest'
import type { MissionPort } from '../port/MissionPort'

export class MongooseMissionAdapter implements MissionPort {
  async getMissionStatus(missionId: string): Promise<string | null> {
    if (!mongoose.isValidObjectId(missionId)) return null
    const mission = (await ServiceRequest.findById(missionId).select('status clientId assignedProviderId').lean()) as any
    return (mission?.status as string) || null
  }

  async getMissionProviderId(missionId: string): Promise<string | null> {
    if (!mongoose.isValidObjectId(missionId)) return null
    const mission = (await ServiceRequest.findById(missionId).select('assignedProviderId').lean()) as any
    return mission?.assignedProviderId ? String(mission.assignedProviderId) : null
  }

  async getMissionClientId(missionId: string): Promise<string | null> {
    if (!mongoose.isValidObjectId(missionId)) return null
    const mission = (await ServiceRequest.findById(missionId).select('clientId').lean()) as any
    return (mission?.clientId as string) || null
  }

  async lockMission(missionId: string): Promise<void> {
    if (!mongoose.isValidObjectId(missionId)) return
    await ServiceRequest.updateOne(
      { _id: missionId },
      { $set: { status: 'dispute', escrowLocked: true, escrowLockedAt: new Date(), updatedAt: new Date() } }
    )
  }

  async unlockMission(missionId: string): Promise<void> {
    if (!mongoose.isValidObjectId(missionId)) return
    await ServiceRequest.updateOne(
      { _id: missionId },
      { $set: { escrowLocked: false, updatedAt: new Date() } }
    )
  }
}
