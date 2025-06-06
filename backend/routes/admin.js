

const express = require('express');
const router = express.Router();
const Admin = require('../models/Admin');
const User = require('../models/User');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const Attendance = require('../models/Attendance');
const { loggedInUsers } = require('../utils/authStore');
const Location = require('../models/Location')
const JWT_SECRET = process.env.JWT_SECRET || 'secret';

// Middleware to verify JWT & admin role
function verifyAdminToken(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ error: 'No token provided' });

  const token = authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Malformed token' });

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    if (decoded.role !== 'admin') return res.status(403).json({ error: 'Forbidden' });
    req.admin = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid token' });
  }
}

// Admin login using email (not username)
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    const admin = await Admin.findOne({ email });
 
    if (!admin) return res.status(401).send('Invalid credentials');

    const valid = await bcrypt.compare(password, admin.password);
    
    if (!valid) return res.status(401).send('Invalid credentials');

    const token = jwt.sign({ id: admin._id, role: 'admin' }, JWT_SECRET);
    res.json({ token });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Admin adds a user (secured)
router.post('/users', verifyAdminToken, async (req, res) => {
  const { name, email, password, address, salary } = req.body;
  try {
    const existingUser = await User.findOne({ email });
    if (existingUser) return res.status(400).json({ error: 'Email already exists' });

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = new User({ name, email, password: hashedPassword, address, salary });
    await newUser.save();
    res.json({ message: 'User created', user: newUser });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Fetch all users (secured, admin only)
router.get('/users', verifyAdminToken, async (req, res) => {
  try {
    const users = await User.find().select('-password');
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE a user by ID
// router.delete('/users/:id', verifyAdminToken, async (req, res) => {
//   try {
//     await User.findByIdAndDelete(req.params.id);
//     res.status(200).json({ message: 'Employee deleted successfully' });
//   } catch (err) {
//     res.status(500).json({ error: 'Failed to delete employee' });
//   }
// });

// DELETE a user by ID and all related records
router.delete('/users/:id', verifyAdminToken, async (req, res) => {
  const userId = req.params.id;

  try {
    // Delete the user
    const user = await User.findByIdAndDelete(userId);
    if (!user) return res.status(404).json({ error: 'User not found' });

    // Delete all locations of the user
    await require('../models/Location').deleteMany({ userId });

    // Delete all attendance records of the user
    await require('../models/Attendance').deleteMany({ userId });

    res.status(200).json({ message: 'User and all related records deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete user and related data' });
  }
});


// PUT (edit) a user by ID
router.put('/users/:id', verifyAdminToken, async (req, res) => {
  const { name, email, address, salary } = req.body;
  try {
    const updatedUser = await User.findByIdAndUpdate(
      req.params.id,
      { name, email, address, salary },
      { new: true }
    ).select('-password');
    res.status(200).json(updatedUser);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update employee' });
  }
});

// GET admin profile (secured)
router.get('/profile', verifyAdminToken, async (req, res) => {
  try {
    
    const admin = await Admin.findById(req.admin.id).select('-password');
    if (!admin) return res.status(404).json({ error: 'Admin not found' });
    res.json(admin);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch admin profile' });
  }
});

// PUT admin profile (secured)
router.put('/profile', verifyAdminToken, async (req, res) => {
  const { name, email, organization, password, address } = req.body;

  const updateData = {};
  if (name) updateData.name = name;
  if (email) updateData.email = email;
  if (organization) updateData.organization = organization;
  if (address) updateData.address = address;
  if (password) {
    const hashedPassword = await bcrypt.hash(password, 10);
    updateData.password = hashedPassword;
  }

  try {
    const updatedAdmin = await Admin.findByIdAndUpdate(
      req.admin.id,
      updateData,
      { new: true }
    ).select('-password');

    if (!updatedAdmin) return res.status(404).json({ error: 'Admin not found' });
    res.json(updatedAdmin);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update admin profile' });
  }
});

router.get('/dashboard-summary', verifyAdminToken, async (req, res) => {
  try {
    const totalEmployees = await User.countDocuments();

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);

    // First await the distinct result, then get length
    const presentUserIds = await Attendance.distinct("userId", {
      date: { $gte: today, $lt: tomorrow }
    });

    const presentToday = presentUserIds.length;

    const locations = loggedInUsers?.size || 0; // safety check

    console.log(totalEmployees, presentToday, locations);

    res.json({
      totalEmployees,
      presentToday,
      locations
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});


router.get('/location-history', verifyAdminToken, async (req, res) => {
  const { userId } = req.query;

  // console.log(userId)
  const { date, page = 1, limit = 24 } = req.query;

  const query = { userId };
  let targetDate = date ? new Date(date) : new Date(); // Use today if no date

  // Normalize the date range to the full day
  const startDate = new Date(targetDate);
  startDate.setHours(0, 0, 0, 0);

  const endDate = new Date(targetDate);
  endDate.setHours(23, 59, 59, 999);

  query.timestamp = { $gte: startDate, $lte: endDate };

  try {
    const skip = (page - 1) * limit;
    const locations = await Location.find(query)
      .sort({ timestamp: -1 })
      .skip(Number(skip))
      .limit(Number(limit))
      .lean();

    res.json(locations);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});




module.exports = router;
