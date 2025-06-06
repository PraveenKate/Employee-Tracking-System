const mongoose = require('mongoose');

const attendanceSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, required: true, ref: 'User' },
  date: { type: Date, required: true },  // store date only (at midnight)
  loginTime: { type: Date, required: true },
  logoutTime: { type: Date, default: null },
});

module.exports = mongoose.model('Attendance', attendanceSchema);
