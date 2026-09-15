'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Badge, Col, Layout, Row, Typography } from 'antd'
import { useRobotFleet } from '../hooks/useRobotFleet'
import LogController from '../utils/LogController'
import {
  countByFilter,
  matchesFilter,
  type StatusFilter,
} from '../utils/robotMetrics'
import RobotCard, { GridSkeleton } from '../components/dashboard/RobotCard'
import StatusFilterBar from '../components/dashboard/StatusFilterBar'

const { Header, Content } = Layout
const { Title, Text } = Typography

export default function Dashboard() {
  const router = useRouter()
  const { isConnected, robots } = useRobotFleet()
  const [initialLoading, setInitialLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [wsUpdateCount, setWsUpdateCount] = useState(0)
  const [rowClickCount, setRowClickCount] = useState(0)
  const prevRobotsRef = useRef(robots)

  useEffect(() => {
    if (Object.keys(robots).length > 0) {
      setInitialLoading(false)
      setWsUpdateCount((prev) => prev + 1)
    }
    prevRobotsRef.current = robots
  }, [robots])

  const handleCardClick = (robotId: string) => {
    setRowClickCount((prev) => prev + 1)
    router.push(`/robots/${robotId}`)
  }

  const robotList = Object.values(robots).sort((a, b) => a.robotId.localeCompare(b.robotId))
  const counts = countByFilter(robotList)
  const filteredRobots = robotList.filter((r) => matchesFilter(r, statusFilter))

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Header
        style={{
          background: '#001529',
          padding: '0 24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <Title level={3} style={{ color: 'white', margin: 0 }}>
          Robot Fleet Dashboard
        </Title>
        <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
          <Text style={{ color: '#aaa' }}>
            {counts.online} / {robotList.length} online
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
        {initialLoading ? (
          <GridSkeleton />
        ) : robotList.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 64, color: '#8c8c8c' }}>
            {isConnected ? 'Waiting for robots…' : 'Not connected to server'}
          </div>
        ) : (
          <>
            <StatusFilterBar
              value={statusFilter}
              onChange={setStatusFilter}
              counts={counts}
              showing={filteredRobots.length}
              total={robotList.length}
            />

            {filteredRobots.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 48, color: '#8c8c8c' }}>
                No robots match this filter
              </div>
            ) : (
              <Row gutter={[16, 16]}>
                {filteredRobots.map((robot, index) => (
                  <Col xs={24} sm={12} lg={8} xl={6} key={robot.robotId}>
                    <RobotCard
                      robot={robot}
                      index={index}
                      onClick={() => handleCardClick(robot.robotId)}
                    />
                  </Col>
                ))}
              </Row>
            )}
          </>
        )}

        <div
          style={{
            position: 'fixed',
            bottom: 8,
            right: 8,
            opacity: 0.4,
            fontSize: 11,
            pointerEvents: 'none',
          }}
        >
          <LogController>{wsUpdateCount}</LogController>
          <LogController>{rowClickCount}</LogController>
        </div>
      </Content>
    </Layout>
  )
}
