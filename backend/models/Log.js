const mongoose = require('mongoose');

const logSchema = new mongoose.Schema({
  connectionId: { type: String, required: true, index: true },
  startedAt: { type: Number, required: true },
  entries: [{ type: String }],
  receivedAt: { type: Date, default: Date.now, index: true },
});

module.exports = mongoose.model('Log', logSchema);
