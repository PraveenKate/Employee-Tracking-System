const mongoose = require('mongoose');

const locationSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  lat: Number,
  lng: Number,
  timestamp: Date,
  address: String, // New field for storing the reverse geocoded address
});

module.exports = mongoose.model('Location', locationSchema);
