'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { App } from 'antd'
import { useWebSocket } from './useWebSocket'
import type { Robot, WebSocketMessage, AlertState } from '../types/robot'

const WS_URL = process.env.WEBSOCKET_URL || 'ws://localhost:8080'
export const MOCK_ROBOT_ID = 'MOCK_001'

function buildMockRobot(overrides: Partial<Robot> = {}): Robot {
  const now = new Date().toISOString()
  return {
    robotId: MOCK_ROBOT_ID,
    batteryPercentage: 12,
    wifiSignalStrength: -72,
    isCharging: false,
    temperature: 58,
    memoryUsage: 45,
    timestamp: now,
    lastSeen: now,
    status: 'online',
    ...overrides,
  }
}

export function useRobotFleet() {
  const { notification } = App.useApp()
  const { isConnected, lastMessage } = useWebSocket(`${WS_URL}/dashboard`)
  const [robots, setRobots] = useState<Record<string, Robot>>({})
  // Alert state per robot — held in ref to avoid triggering re-renders
  const alertStates = useRef<Record<string, AlertState>>({})
  const notificationRef = useRef(notification)
  notificationRef.current = notification

  const checkAlerts = useCallback((robotId: string, data: Robot) => {
    const api = notificationRef.current
    const state: AlertState = alertStates.current[robotId] ?? {
      lowBatteryAlerted: false,
      criticalBatteryAlerted: false,
      lowBatteryStartTime: null,
    }

    const isLowAndDraining = data.batteryPercentage < 20 && !data.isCharging

    if (isLowAndDraining) {
      if (!state.lowBatteryAlerted) {
        api.warning({
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
        api.error({
          key: `critical-battery-${robotId}`,
          message: 'Critical Battery Alert',
          description: `Robot ${robotId} will be shut down soon!`,
          duration: 0,
        })
        state.criticalBatteryAlerted = true
      }
    } else {
      if (state.lowBatteryAlerted || state.criticalBatteryAlerted) {
        api.destroy(`low-battery-${robotId}`)
        api.destroy(`critical-battery-${robotId}`)
      }
      state.lowBatteryAlerted = false
      state.criticalBatteryAlerted = false
      state.lowBatteryStartTime = null
    }

    alertStates.current[robotId] = state
  }, [])

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
        if (msg.robots) {
          // Keep local mock robot across WS snapshots
          setRobots((prev) => {
            const mock = prev[MOCK_ROBOT_ID]
            return mock ? { ...msg.robots!, [MOCK_ROBOT_ID]: mock } : msg.robots!
          })
        }
        break
      }
      case 'robot_update': {
        if (msg.robotId && msg.data) {
          setRobots((prev) => ({ ...prev, [msg.robotId!]: msg.data! }))
          checkAlerts(msg.robotId, msg.data)
        }
        break
      }
      case 'robot_connected': {
        if (msg.robotId) {
          setRobots((prev) => ({
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
          setRobots((prev) => ({
            ...prev,
            [msg.robotId!]: {
              ...(prev[msg.robotId!] || ({} as Robot)),
              robotId: msg.robotId!,
              status: 'offline',
              lastSeen: new Date().toISOString(),
            },
          }))
          delete alertStates.current[msg.robotId]
          notificationRef.current.destroy(`low-battery-${msg.robotId}`)
          notificationRef.current.destroy(`critical-battery-${msg.robotId}`)
        }
        break
      }
    }
  }

  /** Inject MOCK_001 with battery < 20% → real checkAlerts low-battery path */
  const mockLowBattery = useCallback(() => {
    const data = buildMockRobot({ batteryPercentage: 12, isCharging: false })
    alertStates.current[MOCK_ROBOT_ID] = {
      lowBatteryAlerted: false,
      criticalBatteryAlerted: false,
      lowBatteryStartTime: null,
    }
    setRobots((prev) => ({ ...prev, [MOCK_ROBOT_ID]: data }))
    checkAlerts(MOCK_ROBOT_ID, data)
  }, [checkAlerts])

  /** Same low data, but pretend low state lasted ≥5 min → critical path */
  const mockCriticalBattery = useCallback(() => {
    const data = buildMockRobot({ batteryPercentage: 8, isCharging: false })
    alertStates.current[MOCK_ROBOT_ID] = {
      lowBatteryAlerted: true,
      criticalBatteryAlerted: false,
      lowBatteryStartTime: Date.now() - 5 * 60 * 1000,
    }
    setRobots((prev) => ({ ...prev, [MOCK_ROBOT_ID]: data }))
    checkAlerts(MOCK_ROBOT_ID, data)
  }, [checkAlerts])

  /** Remove mock robot and clear its toasts */
  const clearMockRobot = useCallback(() => {
    notificationRef.current.destroy(`low-battery-${MOCK_ROBOT_ID}`)
    notificationRef.current.destroy(`critical-battery-${MOCK_ROBOT_ID}`)
    delete alertStates.current[MOCK_ROBOT_ID]
    setRobots((prev) => {
      const next = { ...prev }
      delete next[MOCK_ROBOT_ID]
      return next
    })
  }, [])

  return {
    isConnected,
    robots,
    mockLowBattery,
    mockCriticalBattery,
    clearMockRobot,
  }
}
