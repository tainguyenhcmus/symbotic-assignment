'use client'

import { useEffect, useRef, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import {
  Badge,
  Button,
  Card,
  Col,
  Layout,
  Row,
  Spin,
  Statistic,
  Tag,
  Typography,
} from 'antd'
import { ArrowLeftOutlined } from '@ant-design/icons'
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import dayjs from 'dayjs'
import { useRobotFleet } from '../../../hooks/useRobotFleet'
import { getRobotHistory } from '../../../services/robotApi'
import type { ChartDataPoint } from '../../../types/robot'
import LogController from '../../../utils/LogController'

const { Header, Content } = Layout
const { Title, Text } = Typography

const SIX_HOURS_MS = 6 * 60 * 60 * 1000

function formatTime(timestamp: string) {
  return dayjs(timestamp).format('HH:mm')
}

function ChartCard({
  title,
  dataKey,
  data,
  color,
  unit,
  domain,
}: {
  title: string
  dataKey: keyof ChartDataPoint
  data: ChartDataPoint[]
  color: string
  unit: string
  domain?: [number | string, number | string]
}) {
  return (
    <Card title={title} size="small" style={{ height: '100%' }}>
      <ResponsiveContainer width="100%" height={200}>
        <LineChart data={data} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis
            dataKey="timestamp"
            tickFormatter={formatTime}
            tick={{ fontSize: 11 }}
            interval="preserveStartEnd"
          />
          <YAxis
            domain={domain ?? ['auto', 'auto']}
            tick={{ fontSize: 11 }}
            tickFormatter={(v) => `${v}${unit}`}
          />
          <Tooltip
            labelFormatter={(t) => dayjs(t).format('HH:mm:ss')}
            formatter={(v: number) => [`${v.toFixed(1)}${unit}`, title]}
          />
          <Line
            type="monotone"
            dataKey={dataKey}
            stroke={color}
            dot={false}
            strokeWidth={2}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </Card>
  )
}

export default function RobotDetailPage() {
  const { robotId } = useParams<{ robotId: string }>()
  const router = useRouter()
  const { isConnected, robots } = useRobotFleet()

  const [chartData, setChartData] = useState<ChartDataPoint[]>([])
  const [loading, setLoading] = useState(true)

  // LogController counters (Q4)
  const [backClickCount, setBackClickCount] = useState(0)
  const [historyLoadCount, setHistoryLoadCount] = useState(0)
  const [chartUpdateCount, setChartUpdateCount] = useState(0)

  const robot = robots[robotId]

  // Fetch 6-hour history on mount
  useEffect(() => {
    if (!robotId) return
    setLoading(true)
    getRobotHistory(robotId, 6)
      .then((data) => {
        setChartData(data)
        setHistoryLoadCount(prev => prev + 1)
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [robotId])

  // Append real-time updates to chart data
  useEffect(() => {
    if (!robot || robot.status === 'offline') return

    const point: ChartDataPoint = {
      timestamp: robot.timestamp || robot.lastSeen || new Date().toISOString(),
      batteryPercentage: robot.batteryPercentage,
      wifiSignalStrength: robot.wifiSignalStrength,
      temperature: robot.temperature,
      memoryUsage: robot.memoryUsage,
    }

    setChartData(prev => {
      const cutoff = Date.now() - SIX_HOURS_MS
      const trimmed = prev.filter(d => new Date(d.timestamp).getTime() >= cutoff)
      return [...trimmed, point]
    })
    setChartUpdateCount(prev => prev + 1)
  }, [robot])

  const handleBack = () => {
    setBackClickCount(prev => prev + 1)
    router.push('/')
  }

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Header
        style={{
          background: '#001529',
          padding: '0 24px',
          display: 'flex',
          alignItems: 'center',
          gap: 16,
        }}
      >
        <Button
          icon={<ArrowLeftOutlined />}
          onClick={handleBack}
          style={{ borderColor: '#444', color: 'white', background: 'transparent' }}
        >
          Back
        </Button>
        <Title level={4} style={{ color: 'white', margin: 0 }}>
          🤖 Robot {robotId}
        </Title>
        <Badge
          status={isConnected ? 'success' : 'error'}
          text={
            <Text style={{ color: '#aaa' }}>
              {isConnected ? 'Connected' : 'Disconnected'}
            </Text>
          }
        />
      </Header>

      <Content style={{ padding: 24 }}>
        {/* Current status row */}
        <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
          <Col>
            <Card size="small">
              <Statistic
                title="Status"
                value={robot?.status ?? 'unknown'}
                valueStyle={{ color: robot?.status === 'online' ? '#52c41a' : '#ff4d4f' }}
                prefix={<Badge status={robot?.status === 'online' ? 'success' : 'error'} />}
              />
            </Card>
          </Col>
          <Col>
            <Card size="small">
              <Statistic
                title="Battery"
                value={robot?.batteryPercentage?.toFixed(1) ?? '—'}
                suffix="%"
                valueStyle={{
                  color:
                    (robot?.batteryPercentage ?? 100) < 20 && !robot?.isCharging
                      ? '#ff4d4f'
                      : undefined,
                }}
              />
            </Card>
          </Col>
          <Col>
            <Card size="small">
              <Statistic title="WiFi" value={robot?.wifiSignalStrength ?? '—'} suffix="dBm" />
            </Card>
          </Col>
          <Col>
            <Card size="small">
              <Statistic
                title="Temperature"
                value={robot?.temperature?.toFixed(1) ?? '—'}
                suffix="°C"
              />
            </Card>
          </Col>
          <Col>
            <Card size="small">
              <Statistic title="Memory" value={robot?.memoryUsage ?? '—'} suffix="%" />
            </Card>
          </Col>
          <Col>
            <Card size="small">
              <Statistic
                title="Charging"
                value={robot?.isCharging ? 'Yes' : 'No'}
                prefix={robot?.isCharging ? '⚡' : undefined}
              />
            </Card>
          </Col>
          {robot?.status === 'offline' && (
            <Col>
              <Tag color="red" style={{ lineHeight: '30px', fontSize: 14 }}>
                Robot offline
              </Tag>
            </Col>
          )}
        </Row>

        {/* Historical charts */}
        <Spin spinning={loading}>
          <Row gutter={[16, 16]}>
            <Col xs={24} lg={12}>
              <ChartCard
                title="Battery %"
                dataKey="batteryPercentage"
                data={chartData}
                color="#1890ff"
                unit="%"
                domain={[0, 100]}
              />
            </Col>
            <Col xs={24} lg={12}>
              <ChartCard
                title="WiFi Signal"
                dataKey="wifiSignalStrength"
                data={chartData}
                color="#52c41a"
                unit=" dBm"
                domain={[-100, -40]}
              />
            </Col>
            <Col xs={24} lg={12}>
              <ChartCard
                title="Temperature"
                dataKey="temperature"
                data={chartData}
                color="#fa8c16"
                unit="°C"
                domain={[40, 70]}
              />
            </Col>
            <Col xs={24} lg={12}>
              <ChartCard
                title="Memory Usage"
                dataKey="memoryUsage"
                data={chartData}
                color="#722ed1"
                unit="%"
                domain={[0, 100]}
              />
            </Col>
          </Row>
        </Spin>

        {/* Q4 — LogController event labels (visible in dev mode only) */}
        <div style={{ position: 'fixed', bottom: 8, right: 8, opacity: 0.4, fontSize: 11, pointerEvents: 'none' }}>
          <LogController>{backClickCount}</LogController>
          <LogController>{historyLoadCount}</LogController>
          <LogController>{chartUpdateCount}</LogController>
        </div>
      </Content>
    </Layout>
  )
}
