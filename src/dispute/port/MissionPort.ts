export interface MissionPort {
  getMissionStatus(missionId: string): Promise<string | null>
  getMissionProviderId(missionId: string): Promise<string | null>
  getMissionClientId(missionId: string): Promise<string | null>
  lockMission(missionId: string): Promise<void>
  unlockMission(missionId: string): Promise<void>
}
