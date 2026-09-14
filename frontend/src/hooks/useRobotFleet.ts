'use client'

import { useEffect, useRef, useState } from 'react'
import { notification } from 'antd'
import { useWebSocket } from './useWebSocket'
import type { Robot, WebSocketMessage, AlertState } from '../types/robot'

const WS_URL = process.env.WEBSOCKET_URL || 'ws://localhost:8080'

export function useRobotFleet() {
  const { isConnected, lastMessage } = useWebSocket(`${WS_URL}/dashboard`)
  const [robots, setRobots] = useState<Record<string, Robot>>({})
  // Alert state per robot — held in ref to avoid triggering re-renders
  const alertStates = useRef<Record<string, AlertState>>({})

  useEffect(() => {
    if (!lastMessage) return
    try {
      const msg = JSON.parse(lastMessage) as WebSocketMessage
      handleMessage(msg)
    } catch {
      console.error('Failed to parse WebSocket message')
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lastMessage])

  function handleMessage(msg: WebSocketMessage) {
    switch (msg.type) {
      case 'initial_robots': {
        if (msg.robots) setRobots(msg.robots)
        break
      }
      case 'robot_update': {
        if (msg.robotId && msg.data) {
          setRobots(prev => ({ ...prev, [msg.robotId!]: msg.data! }))
          checkAlerts(msg.robotId, msg.data)
        }
        break
      }
      case 'robot_connected': {
        if (msg.robotId) {
          setRobots(prev => ({
            ...prev,
            [msg.robotId!]: {
              ...(prev[msg.robotId!] || ({} as Robot)),
              robotId: msg.robotId!,
              status: 'online',
              lastSeen: new Date().toISOString(),
            },
          }))
        }
        break
      }
      case 'robot_disconnected': {
        if (msg.robotId) {
          setRobots(prev => ({
            ...prev,
            [msg.robotId!]: {
              ...(prev[msg.robotId!] || ({} as Robot)),
              robotId: msg.robotId!,
              status: 'offline',
              lastSeen: new Date().toISOString(),
            },
          }))
          // Clear alert state when robot disconnects
          delete alertStates.current[msg.robotId]
          notification.destroy(`low-battery-${msg.robotId}`)
          notification.destroy(`critical-battery-${msg.robotId}`)
        }
        break
      }
    }
  }

  function checkAlerts(robotId: string, data: Robot) {
    const state: AlertState = alertStates.current[robotId] ?? {
      lowBatteryAlerted: false,
      criticalBatteryAlerted: false,
      lowBatteryStartTime: null,
    }

    const isLowAndDraining = data.batteryPercentage < 20 && !data.isCharging

    if (isLowAndDraining) {
      if (!state.lowBatteryAlerted) {
        notification.warning({
          key: `low-battery-${robotId}`,
          message: 'Low Battery Alert',
          description: `Robot ${robotId} is low battery!`,
          duration: 0,
        })
        state.lowBatteryAlerted = true
      }

      if (state.lowBatteryStartTime === null) {
        state.lowBatteryStartTime = Date.now()
      }

      const elapsed = Date.now() - state.lowBatteryStartTime
      if (elapsed >= 5 * 60 * 1000 && !state.criticalBatteryAlerted) {
        notification.error({
          key: `critical-battery-${robotId}`,
          message: 'Critical Battery Alert',
          description: `Robot ${robotId} will be shut down soon!`,
          duration: 0,
        })
        state.criticalBatteryAlerted = true
      }
    } else {
      // Reset when battery recovers or charging starts
      if (state.lowBatteryAlerted || state.criticalBatteryAlerted) {
        notification.destroy(`low-battery-${robotId}`)
        notification.destroy(`critical-battery-${robotId}`)
      }
      state.lowBatteryAlerted = false
      state.criticalBatteryAlerted = false
      state.lowBatteryStartTime = null
    }

    alertStates.current[robotId] = state
  }

  return { isConnected, robots }
}
