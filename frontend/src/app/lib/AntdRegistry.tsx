'use client'

import '@ant-design/v5-patch-for-react-19'
import type { ReactNode } from 'react'

const AntdRegistry = ({ children }: { children: ReactNode }) => {
  return <div className="antd-registry">{children}</div>
}

export default AntdRegistry
