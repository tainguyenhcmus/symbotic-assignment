'use client'

import { FloatButton } from 'antd'
import {
  AlertOutlined,
  ClearOutlined,
  ExclamationCircleOutlined,
  WarningOutlined,
} from '@ant-design/icons'

type Props = {
  onMockLow: () => void
  onMockCritical: () => void
  onClear: () => void
}

export default function MockAlertButton({ onMockLow, onMockCritical, onClear }: Props) {
  return (
    <FloatButton.Group
      trigger="click"
      type="primary"
      style={{ insetInlineEnd: 24, insetBlockEnd: 24 }}
      icon={<AlertOutlined />}
      tooltip="Mock robot alerts"
    >
      <FloatButton
        icon={<WarningOutlined />}
        tooltip="Inject MOCK_001 low battery (<20%)"
        onClick={onMockLow}
      />
      <FloatButton
        icon={<ExclamationCircleOutlined />}
        tooltip="Inject MOCK_001 critical (low ≥5 min)"
        type="primary"
        onClick={onMockCritical}
      />
      <FloatButton
        icon={<ClearOutlined />}
        tooltip="Remove mock robot"
        onClick={onClear}
      />
    </FloatButton.Group>
  )
}
