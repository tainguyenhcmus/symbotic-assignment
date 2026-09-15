'use client'

import { Segmented, Typography } from 'antd'
import type { StatusFilter } from '../../utils/robotMetrics'

const { Text } = Typography

type Props = {
  value: StatusFilter
  onChange: (value: StatusFilter) => void
  counts: Record<StatusFilter, number>
  showing: number
  total: number
}

const LABELS: { value: StatusFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'online', label: 'Online' },
  { value: 'offline', label: 'Offline' },
  { value: 'charging', label: 'Charging' },
  { value: 'low_battery', label: 'Low battery' },
  { value: 'high_temp', label: 'High temp' },
  { value: 'high_memory', label: 'High memory' },
]

export default function StatusFilterBar({ value, onChange, counts, showing, total }: Props) {
  return (
    <div className="filter-bar">
      <Text type="secondary" style={{ whiteSpace: 'nowrap' }}>
        Filter
      </Text>
      <Segmented
        value={value}
        onChange={(v) => onChange(v as StatusFilter)}
        options={LABELS.map(({ value: v, label }) => ({
          value: v,
          label: `${label} (${counts[v]})`,
        }))}
      />
      <Text type="secondary" style={{ marginLeft: 'auto', whiteSpace: 'nowrap' }}>
        Showing {showing} / {total}
      </Text>
    </div>
  )
}
