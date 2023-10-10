const mongoose = require('mongoose');

const scanResultSchema = new mongoose.Schema({
  userId: {
    type: String,
    required: true
  },
  result: {
    type: Array,
    required: true
  },
  date: {
    type: Date,
    default: Date.now
  },
  contractName: {
    type: String,
  },
});

module.exports = mongoose.model('ScanResult', scanResultSchema);
