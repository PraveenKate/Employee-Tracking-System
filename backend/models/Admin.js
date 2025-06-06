
const mongoose = require('mongoose');

const adminSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
  },
  email: { // used for login
    type: String,
    unique: true,
    required: true,
    trim: true,
  },
  organization: {
    type: String,
    trim: true,
    default: '',
  },
  password: {
    type: String,
    required: true,
  },
  address: {
    type: String,
    default: '',
    trim: true,
  },
  role: {
    type: String,
    default: 'admin',
    enum: ['admin'], // Optional: restricts to only 'admin'
  }
}, { timestamps: true });

module.exports = mongoose.model('Admin', adminSchema);
