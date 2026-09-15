'use client'

import { type ReactNode } from 'react'
import { Col, Progress, Row, Skeleton, Tag, Tooltip, Typography } from 'antd'
import {
  WifiOutlined,
  ThunderboltOutlined,
  FireOutlined,
  DatabaseOutlined,
  ClockCircleOutlined,
} from '@ant-design/icons'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import type { Robot } from '../../types/robot'
import {
  batteryStatus,
  batteryStroke,
  tempColor,
  wifiColor,
  wifiLevel,
} from '../../utils/robotMetrics'
import RobotAvatar from './RobotAvatar'

dayjs.extend(relativeTime)

const { Text } = Typography

function WifiBars({ strength, offline }: { strength: number; offline: boolean }) {
  const level = offline ? 0 : wifiLevel(strength)
  const color = offline ? '#d9d9d9' : wifiColor(strength)
  return (
    <div className="wifi-bars" aria-hidden>
      {[1, 2, 3, 4].map((bar) => (
        <span
          key={bar}
          className={`wifi-bar ${bar <= level ? 'wifi-bar-on' : ''}`}
          style={{ height: 6 + bar * 4, background: bar <= level ? color : '#f0f0f0' }}
        />
      ))}
    </div>
  )
}

function MetricCell({
  label,
  icon,
  children,
  accent,
}: {
  label: string
  icon: ReactNode
  children: ReactNode
  accent?: string
}) {
  return (
    <div className="metric-cell" style={accent ? { borderTopColor: accent } : undefined}>
      <div className="metric-cell-label">
        {icon}
        <span>{label}</span>
      </div>
      <div className="metric-cell-body">{children}</div>
    </div>
  )
}

function OfflineDash() {
  return <Text type="secondary">—</Text>
}

type RobotCardProps = {
  robot: Robot
  index: number
  onClick: () => void
}

export default function RobotCard({ robot, index, onClick }: RobotCardProps) {
  const offline = robot.status === 'offline'
  const online = robot.status === 'online'
  const battery = robot.batteryPercentage ?? 0
  const wifi = robot.wifiSignalStrength ?? -100
  const temp = robot.temperature ?? 0
  const memory = robot.memoryUsage ?? 0
  const isLowBattery = !offline && battery < 20 && !robot.isCharging

  return (
    <div
      className={`robot-card-shell ${offline ? 'robot-card-offline' : ''} ${isLowBattery ? 'robot-card-alert' : ''}`}
      style={{ animationDelay: `${index * 0.05}s` }}
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') onClick()
      }}
    >
      <div className="robot-card-header">
        <div className="robot-card-identity">
          <RobotAvatar
            robotId={robot.robotId}
            online={online}
            charging={!offline && !!robot.isCharging}
            lowBattery={isLowBattery}
          />
          <div>
            <Text strong style={{ fontSize: 16 }}>
              {robot.robotId}
            </Text>
            <div style={{ marginTop: 4 }}>
              <Tooltip title={robot.lastSeen ? dayjs(robot.lastSeen).format('YYYY-MM-DD HH:mm:ss') : undefined}>
                <Text type="secondary" style={{ fontSize: 12 }}>
                  <ClockCircleOutlined style={{ marginRight: 4 }} />
                  {robot.lastSeen ? dayjs(robot.lastSeen).fromNow() : '—'}
                </Text>
              </Tooltip>
            </div>
          </div>
        </div>
        <div className="status-pill">
          <span className={`status-dot ${online ? 'status-dot-online' : 'status-dot-offline'}`} />
          <Text style={{ fontSize: 13, color: online ? '#389e0d' : '#cf1322' }}>
            {online ? 'Online' : 'Offline'}
          </Text>
        </div>
      </div>

      <Row gutter={[8, 8]}>
        <Col span={12}>
          <MetricCell
            label="Battery"
            icon={<ThunderboltOutlined />}
            accent={offline ? undefined : robot.isCharging ? '#1890ff' : isLowBattery ? '#ff4d4f' : '#52c41a'}
          >
            {offline ? (
              <OfflineDash />
            ) : (
              <>
                <div className="metric-value-row">
                  <span className="metric-value">{battery.toFixed(0)}%</span>
                  {robot.isCharging && (
                    <Tag color="blue" className="charging-tag">
                      Charging
                    </Tag>
                  )}
                </div>
                <Progress
                  percent={Math.round(battery)}
                  size="small"
                  showInfo={false}
                  status={batteryStatus(robot)}
                  strokeColor={batteryStroke(robot, isLowBattery)}
                  className={robot.isCharging ? 'progress-pulse' : undefined}
                />
              </>
            )}
          </MetricCell>
        </Col>

        <Col span={12}>
          <MetricCell label="WiFi" icon={<WifiOutlined />} accent={offline ? undefined : wifiColor(wifi)}>
            {offline ? (
              <OfflineDash />
            ) : (
              <div className="metric-value-row" style={{ alignItems: 'flex-end' }}>
                <span className="metric-value" style={{ color: wifiColor(wifi) }}>
                  {wifi} <span className="metric-unit">dBm</span>
                </span>
                <WifiBars strength={wifi} offline={offline} />
              </div>
            )}
          </MetricCell>
        </Col>

        <Col span={12}>
          <MetricCell label="Temp" icon={<FireOutlined />} accent={offline ? undefined : tempColor(temp)}>
            {offline ? (
              <OfflineDash />
            ) : (
              <>
                <div className="metric-value-row">
                  <span className="metric-value" style={{ color: tempColor(temp) }}>
                    {temp.toFixed(1)}
                    <span className="metric-unit">°C</span>
                  </span>
                </div>
                <Progress
                  percent={Math.min(100, Math.round(((temp - 40) / 30) * 100))}
                  size="small"
                  showInfo={false}
                  strokeColor={tempColor(temp)}
                  trailColor="#f5f5f5"
                />
              </>
            )}
          </MetricCell>
        </Col>

        <Col span={12}>
          <MetricCell
            label="Memory"
            icon={<DatabaseOutlined />}
            accent={offline ? undefined : memory >= 80 ? '#ff4d4f' : '#722ed1'}
          >
            {offline ? (
              <OfflineDash />
            ) : (
              <>
                <div className="metric-value-row">
                  <span className="metric-value">{Math.round(memory)}%</span>
                </div>
                <Progress
                  percent={Math.round(memory)}
                  size="small"
                  showInfo={false}
                  status={memory >= 80 ? 'exception' : 'normal'}
                  strokeColor={memory >= 80 ? '#ff4d4f' : '#722ed1'}
                />
              </>
            )}
          </MetricCell>
        </Col>
      </Row>
    </div>
  )
}

export function GridSkeleton() {
  return (
    <Row gutter={[16, 16]}>
      {Array.from({ length: 6 }, (_, i) => (
        <Col xs={24} sm={12} lg={8} xl={6} key={i}>
          <div
            className="robot-card-shell"
            style={{ animation: `skeletonFade 1.5s ease-in-out ${i * 0.08}s infinite alternate` }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16, alignItems: 'center' }}>
              <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                <Skeleton.Avatar active shape="square" size={72} style={{ borderRadius: 16 }} />
                <div>
                  <Skeleton.Input active size="small" style={{ width: 100, marginBottom: 8 }} />
                  <Skeleton.Input active size="small" style={{ width: 72, height: 14 }} />
                </div>
              </div>
              <Skeleton.Button active size="small" style={{ width: 72 }} />
            </div>
            <Row gutter={[8, 8]}>
              {Array.from({ length: 4 }, (_, j) => (
                <Col span={12} key={j}>
                  <div className="metric-cell">
                    <Skeleton active paragraph={{ rows: 2 }} title={false} />
                  </div>
                </Col>
              ))}
            </Row>
          </div>
        </Col>
      ))}
    </Row>
  )
}
