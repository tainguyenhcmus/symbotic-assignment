'use client'

import { useCallback, useEffect, useRef } from 'react'
import LogController, { type LogControllerProps, type LogSessionContext } from '../utils/LogController'

type LogReader = Parameters<NonNullable<LogControllerProps['exportLog']>>[0]

const MAX_PAYLOAD_BYTES = 64 * 1024

export default function LogProvider({ children }: { children: React.ReactNode }) {
  const readRef = useRef<LogReader | null>(null)
  const ctxRef = useRef<LogSessionContext | null>(null)

  // Called once when LogController mounts — captures the read function
  const handleExportLog = useCallback((read: LogReader, ctx: LogSessionContext) => {
    readRef.current = read
    ctxRef.current = ctx
  }, [])

  // Flush accumulated logs every 30 minutes
  useEffect(() => {
    const flush = async () => {
      if (!readRef.current || !ctxRef.current) return
      try {
        const { data } = readRef.current()
        if (data.length === 0) return

        const payload: { connectionId: string; startedAt: number; entries: string[] } = {
          connectionId: ctxRef.current.connectionId,
          startedAt: ctxRef.current.startedAt,
          entries: [...data],
        }

        // Trim oldest entries until payload fits within 64 KB
        while (JSON.stringify(payload).length > MAX_PAYLOAD_BYTES && payload.entries.length > 0) {
          payload.entries = payload.entries.slice(Math.ceil(payload.entries.length / 2))
        }

        await fetch('/api/logs', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
      } catch (err) {
        console.error('Failed to flush logs:', err)
      }
    }

    const interval = setInterval(flush, 30 * 60 * 1000)
    return () => clearInterval(interval)
  }, [])

  return (
    <>
      {/* Root LogController: no children → always renders null, but still accumulates logs internally */}
      <LogController exportLog={handleExportLog} />
      {children}
    </>
  )
}
