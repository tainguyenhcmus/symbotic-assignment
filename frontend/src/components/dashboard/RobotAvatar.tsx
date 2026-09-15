'use client'

import { robotAccent } from '../../utils/robotMetrics'

type Props = {
  robotId: string
  online: boolean
  charging: boolean
  lowBattery: boolean
}

export default function RobotAvatar({ robotId, online, charging, lowBattery }: Props) {
  const accent = online ? (lowBattery ? '#ff4d4f' : charging ? '#1890ff' : robotAccent(robotId)) : '#bfbfbf'
  const eyeColor = online ? (lowBattery ? '#ff7875' : '#0d1b2a') : '#8c8c8c'
  const bodyFill = online ? '#f5f8fc' : '#f0f0f0'
  const mouth = online ? (lowBattery ? '#ff7875' : charging ? '#69e0ff' : accent) : '#d9d9d9'
  const eyeFill = lowBattery ? '#ff7875' : '#69e0ff'

  return (
    <div
      className={`robot-avatar ${online ? 'robot-avatar-online' : 'robot-avatar-offline'} ${charging ? 'robot-avatar-charging' : ''} ${lowBattery ? 'robot-avatar-low' : ''}`}
      aria-hidden
    >
      <svg viewBox="0 0 96 96" width="72" height="72">
        <ellipse cx="48" cy="88" rx="22" ry="4" fill={accent} opacity={online ? 0.18 : 0.08} />
        <line x1="48" y1="18" x2="48" y2="8" stroke={accent} strokeWidth="3" strokeLinecap="round" />
        <circle className="robot-antenna-tip" cx="48" cy="6" r="4" fill={online ? accent : '#d9d9d9'} />
        <rect x="14" y="38" width="8" height="14" rx="3" fill={accent} opacity={0.85} />
        <rect x="74" y="38" width="8" height="14" rx="3" fill={accent} opacity={0.85} />
        <rect x="24" y="20" width="48" height="36" rx="12" fill={bodyFill} stroke={accent} strokeWidth="3" />
        <rect x="30" y="30" width="36" height="16" rx="8" fill={online ? '#0d1b2a' : '#d9d9d9'} />
        {online ? (
          <>
            <circle className="robot-eye" cx="40" cy="38" r="3.2" fill={eyeFill} />
            <circle className="robot-eye" cx="56" cy="38" r="3.2" fill={eyeFill} />
          </>
        ) : (
          <>
            <path d="M36 38h8" stroke={eyeColor} strokeWidth="2.5" strokeLinecap="round" />
            <path d="M52 38h8" stroke={eyeColor} strokeWidth="2.5" strokeLinecap="round" />
          </>
        )}
        <rect x="38" y="48" width="20" height="4" rx="2" fill={mouth} opacity={0.9} />
        <rect x="28" y="58" width="40" height="24" rx="8" fill={bodyFill} stroke={accent} strokeWidth="3" />
        <circle cx="48" cy="70" r="6" fill={accent} opacity={0.9} />
        {charging ? (
          <path d="M50 65 L44 71 H49 L46 76 L54 69 H49 Z" fill="#fff" />
        ) : (
          <circle cx="48" cy="70" r="2.5" fill="#fff" />
        )}
        <rect x="34" y="80" width="10" height="6" rx="2" fill={accent} />
        <rect x="52" y="80" width="10" height="6" rx="2" fill={accent} />
      </svg>
    </div>
  )
}
