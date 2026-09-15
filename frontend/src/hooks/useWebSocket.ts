'use client'

import { useState, useEffect, useRef } from 'react'

interface UseWebSocketReturn {
  isConnected: boolean
  lastMessage: string | null
  sendMessage: (message: string) => void
  reconnect: () => void
}

export function useWebSocket(url: string): UseWebSocketReturn {
  const [isConnected, setIsConnected] = useState(false)
  const [lastMessage, setLastMessage] = useState<string | null>(null)
  const ws = useRef<WebSocket | null>(null)
  const reconnectTimeoutRef = useRef<NodeJS.Timeout>()

  const connect = () => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current)
    }

    const socket = new WebSocket(url)
    ws.current = socket

    socket.onopen = () => {
      // Ignore if this socket has been replaced (React StrictMode double-mount)
      if (ws.current !== socket) return
      console.log('✅ WebSocket connected to:', url)
      setIsConnected(true)
    }

    socket.onmessage = (event) => {
      if (ws.current !== socket) return
      setLastMessage(event.data)
    }

    socket.onclose = (event) => {
      if (ws.current !== socket) return
      console.log('❌ WebSocket disconnected:', event.code, event.reason)
      setIsConnected(false)
      reconnectTimeoutRef.current = setTimeout(() => {
        if (ws.current === socket) {
          console.log('🔄 Attempting to reconnect...')
          connect()
        }
      }, 3000)
    }

    socket.onerror = () => {
      // Silently ignore errors from replaced sockets (StrictMode cleanup)
      if (ws.current !== socket) return
      setIsConnected(false)
    }
  }

  const sendMessage = (message: string) => {
    if (ws.current && ws.current.readyState === WebSocket.OPEN) {
      ws.current.send(message)
    } else {
      console.warn('WebSocket is not connected')
    }
  }

  const reconnect = () => {
    if (ws.current) {
      ws.current.close()
    }
    connect()
  }

  useEffect(() => {
    connect()

    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current)
      }
      if (ws.current) {
        ws.current.close()
        ws.current = null
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [url])

  return {
    isConnected,
    lastMessage,
    sendMessage,
    reconnect
  }
}
