require('dotenv').config();
const { App } = require('uWebSockets.js');
const qs = require('node:querystring');
const { connectDB } = require('./database/index.js');
const RobotTelemetry = require('./models/RobotTelemetry.js');
const Log = require('./models/Log.js');

const PORT = process.env.PORT || 8080;
const DASHBOARD_TOPIC = 'dashboard';

// In-memory current robot states: robotId -> robot state object
const robotStates = new Map();

function validateRobotData(data) {
  if (typeof data !== 'object' || data === null) return false;
  const { batteryPercentage, wifiSignalStrength, isCharging, temperature, memoryUsage, timestamp } = data;
  if (typeof batteryPercentage !== 'number' || batteryPercentage < 0 || batteryPercentage > 100) return false;
  if (typeof wifiSignalStrength !== 'number' || wifiSignalStrength < -100 || wifiSignalStrength > 0) return false;
  if (typeof isCharging !== 'boolean') return false;
  if (typeof temperature !== 'number') return false;
  if (typeof memoryUsage !== 'number' || memoryUsage < 0 || memoryUsage > 100) return false;
  if (!timestamp || isNaN(Date.parse(timestamp))) return false;
  return true;
}

function sendJson(res, status, data) {
  res.cork(() => {
    res.writeStatus(status)
      .writeHeader('Content-Type', 'application/json')
      .writeHeader('Access-Control-Allow-Origin', '*')
      .end(JSON.stringify(data));
  });
}

const app = App({
  maxCompressedSize: 64 * 1024,
  maxBackpressure: 64 * 1024,
})

  // ── Robot simulator connections ──────────────────────────────────────────
  .ws('/robots', {
    upgrade: (res, req, context) => {
      const upgradeAborted = { aborted: false };
      const secWebSocketKey = req.getHeader('sec-websocket-key');
      const secWebSocketProtocol = req.getHeader('sec-websocket-protocol');
      const secWebSocketExtensions = req.getHeader('sec-websocket-extensions');
      const query = qs.parse(req.getQuery()) || {};

      setTimeout(() => {
        if (upgradeAborted.aborted) return;
        res.cork(() => {
          res.upgrade(
            { robotId: query.robotId },
            secWebSocketKey,
            secWebSocketProtocol,
            secWebSocketExtensions,
            context
          );
        });
      }, 300);

      res.onAborted(() => { upgradeAborted.aborted = true; });
    },

    open: (ws) => {
      const { robotId } = ws;
      console.log(`🤖 Robot ${robotId} connected`);
      const existing = robotStates.get(robotId) || {};
      robotStates.set(robotId, { ...existing, robotId, status: 'online', lastSeen: new Date().toISOString() });
      ws.publish(DASHBOARD_TOPIC, JSON.stringify({ type: 'robot_connected', robotId }));
    },

    message: async (ws, message) => {
      try {
        const data = JSON.parse(Buffer.from(message).toString());
        const { robotId } = ws;

        if (!validateRobotData(data)) {
          console.warn(`⚠️  Invalid data from robot ${robotId}:`, data);
          return;
        }

        // Persist to MongoDB
        await RobotTelemetry.create({
          robotId,
          batteryPercentage: data.batteryPercentage,
          wifiSignalStrength: data.wifiSignalStrength,
          isCharging: data.isCharging,
          temperature: data.temperature,
          memoryUsage: data.memoryUsage,
          timestamp: new Date(data.timestamp),
        });

        // Update in-memory state
        const state = { robotId, ...data, status: 'online', lastSeen: data.timestamp };
        robotStates.set(robotId, state);

        // Broadcast to all dashboard clients
        ws.publish(DASHBOARD_TOPIC, JSON.stringify({ type: 'robot_update', robotId, data: state }));
      } catch (error) {
        console.error('❌ Error processing robot message:', error);
      }
    },

    close: (ws) => {
      const { robotId } = ws;
      console.log(`🔌 Robot ${robotId} disconnected`);
      const existing = robotStates.get(robotId) || {};
      const state = { ...existing, robotId, status: 'offline', lastSeen: new Date().toISOString() };
      robotStates.set(robotId, state);
      ws.publish(DASHBOARD_TOPIC, JSON.stringify({ type: 'robot_disconnected', robotId, data: state }));
    },
  })

  // ── Dashboard client connections ─────────────────────────────────────────
  .ws('/dashboard', {
    open: (ws) => {
      console.log('📊 Dashboard client connected');
      ws.subscribe(DASHBOARD_TOPIC);

      // Send current state of all known robots on connect
      const robots = Object.fromEntries(robotStates);
      ws.send(JSON.stringify({ type: 'initial_robots', robots }));
    },

    message: (ws, message) => {
      try {
        const data = JSON.parse(Buffer.from(message).toString());
        console.log('Dashboard message:', data);
      } catch (error) {
        console.error('Error processing dashboard message:', error);
      }
    },

    close: () => {
      console.log('📊 Dashboard client disconnected');
    },
  })

  // ── CORS preflight ───────────────────────────────────────────────────────
  .options('/*', (res) => {
    res.cork(() => {
      res.writeHeader('Access-Control-Allow-Origin', '*')
        .writeHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        .writeHeader('Access-Control-Allow-Headers', 'Content-Type')
        .end();
    });
  })

  // ── GET /api/robots — current state of all robots ────────────────────────
  .get('/api/robots', (res) => {
    let aborted = false;
    res.onAborted(() => { aborted = true; });
    const robots = Array.from(robotStates.values());
    if (!aborted) sendJson(res, '200 OK', robots);
  })

  // ── GET /api/robots/:robotId/history — historical telemetry ─────────────
  .get('/api/robots/*', (res, req) => {
    let aborted = false;
    res.onAborted(() => { aborted = true; });

    const url = req.getUrl();
    const query = req.getQuery();

    (async () => {
      try {
        // url: /api/robots/00001/history
        const parts = url.split('/').filter(Boolean);
        const robotId = parts[2];
        const endpoint = parts[3];

        if (!robotId || endpoint !== 'history') {
          if (!aborted) sendJson(res, '404 Not Found', { error: 'Not found' });
          return;
        }

        const params = qs.parse(query);
        const hours = Math.min(parseInt(params.hours) || 6, 24);
        const since = new Date(Date.now() - hours * 60 * 60 * 1000);

        const data = await RobotTelemetry
          .find({ robotId, timestamp: { $gte: since } }, { _id: 0, __v: 0 })
          .sort({ timestamp: 1 })
          .lean();

        if (!aborted) sendJson(res, '200 OK', data);
      } catch (err) {
        console.error('❌ Error fetching history:', err);
        if (!aborted) sendJson(res, '500 Internal Server Error', { error: 'Internal server error' });
      }
    })();
  })

  // ── POST /api/logs — persist frontend log batches ─────────────────────────
  .post('/api/logs', (res) => {
    let aborted = false;
    let body = '';

    res.onAborted(() => { aborted = true; });

    res.onData((chunk, isLast) => {
      body += Buffer.from(chunk).toString();

      if (!isLast) return;
      if (aborted) return;

      (async () => {
        try {
          const payload = JSON.parse(body);
          const { connectionId, startedAt, entries } = payload;

          if (!connectionId || typeof startedAt !== 'number' || !Array.isArray(entries)) {
            if (!aborted) sendJson(res, '400 Bad Request', { error: 'Invalid payload' });
            return;
          }

          await Log.create({ connectionId, startedAt, entries });
          if (!aborted) sendJson(res, '200 OK', { ok: true });
        } catch (err) {
          console.error('❌ Error storing logs:', err);
          if (!aborted) sendJson(res, '500 Internal Server Error', { error: 'Internal server error' });
        }
      })();
    });
  })

  .listen(PORT, (token) => {
    if (token) {
      console.log(`🚀 Robot Fleet Server listening on port ${PORT}`);
    } else {
      console.log('❌ Failed to listen on port', PORT);
      process.exit(1);
    }
  });

connectDB().catch(console.error);

process.on('SIGINT', () => {
  console.log('\n📛 Shutting down server...');
  process.exit(0);
});

module.exports = app;
