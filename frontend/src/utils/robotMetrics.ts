import type { Robot } from '../types/robot'

export type StatusFilter =
  | 'all'
  | 'online'
  | 'offline'
  | 'charging'
  | 'low_battery'
  | 'high_temp'
  | 'high_memory'

export function isLowBatteryRobot(robot: Robot) {
  return robot.status === 'online' && robot.batteryPercentage < 20 && !robot.isCharging
}

export function matchesFilter(robot: Robot, filter: StatusFilter): boolean {
  switch (filter) {
    case 'all':
      return true
    case 'online':
      return robot.status === 'online'
    case 'offline':
      return robot.status === 'offline'
    case 'charging':
      return robot.status === 'online' && !!robot.isCharging
    case 'low_battery':
      return isLowBatteryRobot(robot)
    case 'high_temp':
      return robot.status === 'online' && robot.temperature >= 65
    case 'high_memory':
      return robot.status === 'online' && robot.memoryUsage >= 80
    default:
      return true
  }
}

export function countByFilter(robots: Robot[]) {
  return {
    all: robots.length,
    online: robots.filter((r) => r.status === 'online').length,
    offline: robots.filter((r) => r.status === 'offline').length,
    charging: robots.filter((r) => r.status === 'online' && r.isCharging).length,
    low_battery: robots.filter(isLowBatteryRobot).length,
    high_temp: robots.filter((r) => r.status === 'online' && r.temperature >= 65).length,
    high_memory: robots.filter((r) => r.status === 'online' && r.memoryUsage >= 80).length,
  }
}

export function wifiLevel(dbm: number): number {
  if (dbm >= -50) return 4
  if (dbm >= -60) return 3
  if (dbm >= -70) return 2
  if (dbm >= -80) return 1
  return 0
}

export function wifiColor(dbm: number): string {
  if (dbm >= -60) return '#52c41a'
  if (dbm >= -80) return '#faad14'
  return '#ff4d4f'
}

export function tempColor(temp: number): string {
  if (temp >= 65) return '#ff4d4f'
  if (temp >= 55) return '#faad14'
  return '#52c41a'
}

export function batteryStatus(robot: Robot): 'success' | 'exception' | 'active' | 'normal' {
  if (robot.isCharging) return 'active'
  if (robot.batteryPercentage < 20) return 'exception'
  if (robot.batteryPercentage >= 60) return 'success'
  return 'normal'
}

export function batteryStroke(robot: Robot, isLowBattery: boolean): string | undefined {
  if (robot.isCharging) return undefined
  if (isLowBattery) return '#ff4d4f'
  if (robot.batteryPercentage >= 60) return '#52c41a'
  return '#faad14'
}

/** Stable accent hue from robotId so each bot looks unique */
export function robotAccent(robotId: string): string {
  let hash = 0
  for (let i = 0; i < robotId.length; i++) hash = (hash * 31 + robotId.charCodeAt(i)) >>> 0
  const hues = [210, 175, 265, 195, 320, 145]
  return `hsl(${hues[hash % hues.length]} 62% 48%)`
}
