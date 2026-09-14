'use client';

import { useEffect, useRef } from 'react';

const LOG_INTERVAL_MS = 100;
const STORAGE_KEY = 'log_controller_conn_id';
const MIN_STATUS_PER_LOG = 5;
const MAX_STATUS_PER_LOG = 10;

export const STATUS_CODES = [
  'CLICK_BEHAVIOR',
  'CLIENT_FOCUS',
  'ROUTE_CHANGE',
  'SESSION_IDLE',
  'HANDSHAKE_OK',
  'METRIC_TICK',
  'BUFFER_FLUSH',
  'CHANNEL_OPEN',
  'CHANNEL_CLOSE',
  'RETRY_SCHEDULED',
  'HOVER_DETECT',
  'FOCUS_SHIFT',
  'SCROLL_TICK',
  'KEY_DOWN',
  'KEY_UP',
  'INPUT_CHANGE',
  'FORM_SUBMIT',
  'TAB_SWITCH',
  'MODAL_OPEN',
  'MODAL_CLOSE',
  'DROPDOWN_OPEN',
  'DROPDOWN_CLOSE',
  'TOOLTIP_SHOW',
  'TOOLTIP_HIDE',
  'SESSION_ACTIVE',
  'SESSION_EXPIRED',
  'HANDSHAKE_FAIL',
  'AUTH_TOKEN_REFRESH',
  'AUTH_TOKEN_EXPIRED',
  'ROUTE_GUARD_BLOCK',
  'ROUTE_PREFETCH',
  'ROUTE_CANCEL',
  'RETRY_EXHAUSTED',
  'PING_SENT',
  'PONG_RECEIVED',
  'SOCKET_CONNECT',
  'SOCKET_DISCONNECT',
  'WS_RECONNECT',
  'WS_ERROR',
  'METRIC_SAMPLE',
  'METRIC_AGGREGATE',
  'QUEUE_DRAIN',
  'QUEUE_OVERFLOW',
  'ROBOT_ONLINE',
  'ROBOT_OFFLINE',
  'ROBOT_MOVING',
  'ROBOT_IDLE',
  'ROBOT_CHARGING',
  'ROBOT_ERROR',
  'FLEET_SYNC',
  'FLEET_DESYNC',
  'BATTERY_LOW',
  'BATTERY_CRITICAL',
  'WIFI_WEAK',
  'WIFI_LOST',
  'TELEMETRY_BATCH',
  'TELEMETRY_DROP',
  'COMMAND_SENT',
  'COMMAND_ACK',
  'COMMAND_TIMEOUT',
  'POSITION_UPDATE',
  'PATH_PLANNED',
  'PATH_BLOCKED',
  'COLLISION_AVOID',
  'MAP_LOAD',
  'MAP_UNLOAD',
  'ZONE_ENTER',
  'ZONE_EXIT',
  'TASK_ASSIGNED',
  'TASK_COMPLETED',
  'TASK_FAILED',
  'SCHEDULER_TICK',
  'SCHEDULER_SKIP',
  'CACHE_HIT',
  'CACHE_MISS',
  'SYNC_START',
  'SYNC_COMPLETE',
  'SYNC_STALE',
  'HEARTBEAT_OK',
  'HEARTBEAT_MISS',
  'WATCHDOG_PET',
  'WATCHDOG_TRIP',
  'CONFIG_LOAD',
  'CONFIG_SAVE',
  'CONFIG_INVALID',
  'PERMISSION_GRANT',
  'PERMISSION_DENY',
  'FILTER_APPLY',
  'FILTER_CLEAR',
  'SORT_CHANGE',
  'PAGE_LOAD',
  'PAGE_UNLOAD',
  'VISIBILITY_SHOW',
  'VISIBILITY_HIDE',
  'IDLE_TIMEOUT',
  'USER_ACTIVE',
  'DEBOUNCE_FIRE',
  'THROTTLE_SKIP',
  'RENDER_COMMIT',
  'STATE_PERSIST',
] as const;

type LogReader = () => { data: readonly string[]; isDevMode: boolean };

export interface LogSessionContext {
  connectionId: string;
  startedAt: number;
  sink: { entries: string[] };
}

export interface LogControllerProps {
  exportLog?: (read: LogReader, ctx: LogSessionContext) => void;
  children?: React.ReactNode;
}

function getOrCreateConnId(): string {
  try {
    if (typeof window === 'undefined') {
      return '00000000-0000-4000-8000-000000000000';
    }
    const existing = localStorage.getItem(STORAGE_KEY);
    if (existing) {
      return existing;
    }
    const id = crypto.randomUUID();
    localStorage.setItem(STORAGE_KEY, id);
    return id;
  } catch {
    return crypto.randomUUID();
  }
}

function pickStatuses(): string[] {
  const span = MAX_STATUS_PER_LOG - MIN_STATUS_PER_LOG + 1;
  const count = MIN_STATUS_PER_LOG + Math.floor(Math.random() * span);
  return Array.from({ length: count }, () => {
    const idx = Math.floor(Math.random() * STATUS_CODES.length);
    return STATUS_CODES[idx];
  });
}

function formatLogLine(connId: string, statuses: string[]): string {
  const start = Date.now();
  const end = start + LOG_INTERVAL_MS;
  const startIso = new Date(start).toISOString();
  const endIso = new Date(end).toISOString();
  return `[${startIso}|${endIso}] ${connId} - ${statuses.join(' ')}`;
}

export default function LogController({ exportLog, children }: LogControllerProps) {
  const entriesRef = useRef<string[]>([]);
  const connIdRef = useRef(getOrCreateConnId());
  const startedAtRef = useRef(Date.now());
  const showDevSlot = () => {
    try {
      return typeof window !== 'undefined' && localStorage.getItem('dev') === 'true';
    } catch {
      return false;
    }
  }

  useEffect(() => {
    const read: LogReader = () => ({
      data: [...entriesRef.current],
      isDevMode: showDevSlot(),
    });

    exportLog?.(read, {
      connectionId: connIdRef.current,
      startedAt: startedAtRef.current,
      sink: { entries: entriesRef.current },
    });

    setInterval(() => {
      entriesRef.current.push(formatLogLine(connIdRef.current, pickStatuses()));
    }, LOG_INTERVAL_MS);
  }, [exportLog, showDevSlot]);

  if (!showDevSlot || children == null) {
    return null;
  }

  return <>{children}</>;
}
