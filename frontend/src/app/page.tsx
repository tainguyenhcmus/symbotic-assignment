'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Badge,
  Layout,
  Progress,
  Table,
  Tag,
  Tooltip,
  Typography,
} from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { WifiOutlined, ThunderboltOutlined, FireOutlined, DatabaseOutlined } from '@ant-design/icons'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import { useRobotFleet } from '../hooks/useRobotFleet'
import type { Robot } from '../types/robot'
import LogController from '../utils/LogController'

dayjs.extend(relativeTime)

const { Header, Content } = Layout
const { Title, Text } = Typography

export default function Dashboard() {
  const router = useRouter()
  const { isConnected, robots } = useRobotFleet()

  // LogController counters (Q4)
  const [wsUpdateCount, setWsUpdateCount] = useState(0)
  const [rowClickCount, setRowClickCount] = useState(0)
  const prevRobotsRef = useRef<typeof robots>({})

  // Count each WebSocket-driven render that changes robot data
  useEffect(() => {
    if (Object.keys(robots).length > 0) {
      setWsUpdateCount(prev => prev + 1)
    }
    prevRobotsRef.current = robots
  }, [robots])

  const handleRowClick = (robotId: string) => {
    setRowClickCount(prev => prev + 1)
    router.push(`/robots/${robotId}`)
  }

  const robotList = Object.values(robots).sort((a, b) => a.robotId.localeCompare(b.robotId))

  const columns: ColumnsType<Robot> = [
    {
      title: 'Robot ID',
      dataIndex: 'robotId',
      key: 'robotId',
      render: (id: string) => <Text strong>{id}</Text>,
      sorter: (a, b) => a.robotId.localeCompare(b.robotId),
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) =>
        status === 'online' ? (
          <Badge status="success" text="Online" />
        ) : (
          <Badge status="error" text="Offline" />
        ),
      filters: [
        { text: 'Online', value: 'online' },
        { text: 'Offline', value: 'offline' },
      ],
      onFilter: (value, record) => record.status === value,
    },
    {
      title: (
        <span>
          <ThunderboltOutlined /> Battery
        </span>
      ),
      dataIndex: 'batteryPercentage',
      key: 'battery',
      render: (value: number, record: Robot) => {
        if (record.status === 'offline') return <Text type="secondary">—</Text>
        const isLow = value < 20 && !record.isCharging
        const status = record.isCharging ? 'active' : isLow ? 'exception' : 'normal'
        return (
          <Tooltip title={`${value}%${record.isCharging ? ' (Charging)' : ''}`}>
            <Progress
              percent={Math.round(value)}
              size="small"
              status={status}
              style={{ minWidth: 120 }}
            />
          </Tooltip>
        )
      },
      sorter: (a, b) => a.batteryPercentage - b.batteryPercentage,
    },
    {
      title: 'Charging',
      dataIndex: 'isCharging',
      key: 'charging',
      render: (value: boolean, record: Robot) => {
        if (record.status === 'offline') return <Text type="secondary">—</Text>
        return value ? <Tag color="blue">⚡ Charging</Tag> : <Tag>Not charging</Tag>
      },
    },
    {
      title: (
        <span>
          <WifiOutlined /> WiFi
        </span>
      ),
      dataIndex: 'wifiSignalStrength',
      key: 'wifi',
      render: (value: number, record: Robot) => {
        if (record.status === 'offline') return <Text type="secondary">—</Text>
        const color = value >= -60 ? 'green' : value >= -80 ? 'orange' : 'red'
        return <Tag color={color}>{value} dBm</Tag>
      },
      sorter: (a, b) => a.wifiSignalStrength - b.wifiSignalStrength,
    },
    {
      title: (
        <span>
          <FireOutlined /> Temp
        </span>
      ),
      dataIndex: 'temperature',
      key: 'temperature',
      render: (value: number, record: Robot) => {
        if (record.status === 'offline') return <Text type="secondary">—</Text>
        const color = value >= 65 ? 'red' : value >= 55 ? 'orange' : 'green'
        return <Tag color={color}>{value.toFixed(1)}°C</Tag>
      },
      sorter: (a, b) => a.temperature - b.temperature,
    },
    {
      title: (
        <span>
          <DatabaseOutlined /> Memory
        </span>
      ),
      dataIndex: 'memoryUsage',
      key: 'memory',
      render: (value: number, record: Robot) => {
        if (record.status === 'offline') return <Text type="secondary">—</Text>
        return (
          <Progress
            percent={Math.round(value)}
            size="small"
            status={value >= 80 ? 'exception' : 'normal'}
            style={{ minWidth: 100 }}
          />
        )
      },
      sorter: (a, b) => a.memoryUsage - b.memoryUsage,
    },
    {
      title: 'Last Seen',
      dataIndex: 'lastSeen',
      key: 'lastSeen',
      render: (value: string) =>
        value ? (
          <Tooltip title={dayjs(value).format('YYYY-MM-DD HH:mm:ss')}>
            <Text type="secondary">{dayjs(value).fromNow()}</Text>
          </Tooltip>
        ) : (
          <Text type="secondary">—</Text>
        ),
    },
  ]

  const onlineCount = robotList.filter(r => r.status === 'online').length

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Header style={{ background: '#001529', padding: '0 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Title level={3} style={{ color: 'white', margin: 0 }}>
          🤖 Robot Fleet Dashboard
        </Title>
        <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
          <Text style={{ color: '#aaa' }}>
            {onlineCount} / {robotList.length} online
          </Text>
          <Badge
            status={isConnected ? 'success' : 'error'}
            text={
              <Text style={{ color: 'white' }}>
                {isConnected ? 'Connected' : 'Disconnected'}
              </Text>
            }
          />
        </div>
      </Header>

      <Content style={{ padding: 24 }}>
        <Table<Robot>
          dataSource={robotList}
          columns={columns}
          rowKey="robotId"
          pagination={false}
          onRow={(record) => ({
            onClick: () => handleRowClick(record.robotId),
            style: { cursor: 'pointer' },
          })}
          rowClassName={(record) =>
            record.status === 'offline' ? 'robot-row-offline' : ''
          }
          locale={{ emptyText: isConnected ? 'Waiting for robots…' : 'Not connected to server' }}
        />

        {/* Q4 — LogController event labels (visible in dev mode only) */}
        <div style={{ position: 'fixed', bottom: 8, right: 8, opacity: 0.4, fontSize: 11, pointerEvents: 'none' }}>
          <LogController>{wsUpdateCount}</LogController>
          <LogController>{rowClickCount}</LogController>
        </div>
      </Content>
    </Layout>
  )
}
