import type { ChartDataPoint } from '../types/robot'

const API_BASE = process.env.API_BASE_URL || 'http://localhost:8080/api'

export async function getRobotHistory(
  robotId: string,
  hours = 6
): Promise<ChartDataPoint[]> {
  const res = await fetch(`${API_BASE}/robots/${robotId}/history?hours=${hours}`, {
    cache: 'no-store',
  })
  if (!res.ok) throw new Error(`Failed to fetch history for ${robotId}`)
  return res.json()
}
