const mongoose = require('mongoose');

const robotTelemetrySchema = new mongoose.Schema({
  robotId: { type: String, required: true },
  batteryPercentage: { type: Number, required: true, min: 0, max: 100 },
  wifiSignalStrength: { type: Number, required: true, min: -100, max: 0 },
  isCharging: { type: Boolean, required: true },
  temperature: { type: Number, required: true },
  memoryUsage: { type: Number, required: true, min: 0, max: 100 },
  timestamp: { type: Date, required: true },
});

robotTelemetrySchema.index({ robotId: 1, timestamp: 1 });
robotTelemetrySchema.index({ timestamp: -1 });

module.exports = mongoose.model('RobotTelemetry', robotTelemetrySchema);
