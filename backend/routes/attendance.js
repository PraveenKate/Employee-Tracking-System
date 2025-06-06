
const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const Attendance = require('../models/Attendance');
const authMiddleware = require('../middleware/auth'); // your existing auth middleware
const mongoose = require('mongoose');
const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret_key';

// Middleware to verify admin token
function verifyAdminToken(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ error: 'No token provided' });

  const token = authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Malformed token' });

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    if (decoded.role !== 'admin') {
      return res.status(403).json({ error: 'Forbidden: Admins only' });
    }
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid token' });
  }
}

// POST /attendance/login
router.post('/login', authMiddleware, async (req, res) => {
  try {
    const userId = req.user._id;

    // Get today's date at midnight (00:00:00)
    const now = new Date();
    const dateOnly = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    // Create attendance record
    const attendance = new Attendance({
      userId,
      date: dateOnly,
      loginTime: now,
      logoutTime: null,
    });

    await attendance.save();

    res.status(201).json({ message: 'Attendance login recorded' });
  } catch (error) {
    console.error('Login attendance error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /attendance/logout
router.post('/logout', authMiddleware, async (req, res) => {
  try {
    const userId = req.user._id;

    // Find latest attendance record with logoutTime = null
    const attendance = await Attendance.findOne({ userId, logoutTime: null }).sort({ loginTime: -1 });

    if (!attendance) {
      return res.status(400).json({ message: 'No active login session found' });
    }

    attendance.logoutTime = new Date();
    await attendance.save();

    res.json({ message: 'Attendance logout recorded' });
  } catch (error) {
    console.error('Logout attendance error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/today', verifyAdminToken, async (req, res) => {
  try {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);

    const records = await Attendance.aggregate([
      {
        $match: {
          date: { $gte: startOfDay, $lte: endOfDay }
        }
      },
      {
        $sort: { loginTime: -1 }  // Sort by loginTime descending (latest first)
      },
      {
        $group: {
          _id: "$userId",
          doc: { $first: "$$ROOT" }  // Pick the first (latest loginTime) record per user
        }
      },
      {
        $replaceRoot: { newRoot: "$doc" }
      }
    ]);

    // Populate user info (name, email)
    await Attendance.populate(records, { path: 'userId', select: 'name email' });

    res.json(records);
  } catch (err) {
    console.error('Error fetching today attendance:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/user/:userId', verifyAdminToken, async (req, res) => {
  try {
    const attendance = await Attendance.find({ userId: req.params.userId }).populate('userId', 'name email');
    res.json(attendance);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});


router.get('/me', async (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(403).json({ error: 'No token provided' });

  const token = authHeader.split(' ')[1];
  if (!token) return res.status(403).json({ error: 'Malformed token' });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const userId = decoded.id;  // Make sure your token has `id` field for user

    // Fetch attendance from DB for this user
    const attendance = await Attendance.find({ userId }).sort({ date: -1 });

    if (!attendance.length) {
      return res.status(404).json({ message: 'No attendance data found' });
    }

    res.json(attendance);
  } catch (err) {
    console.error('JWT verification or DB error:', err);
    return res.status(403).json({ error: 'Invalid token or server error' });
  }
});


router.post('/update-logout-time', verifyAdminToken, async (req, res) => {
  const { userId } = req.body;
  try {
    const updated = await Location.findOneAndUpdate(
      { userId, logoutTime: null },
      { $set: { logoutTime: new Date() } },
      { sort: { timestamp: -1 } } // Make sure to sort by latest entry
    );

    if (updated) {
      res.sendStatus(200);
    } else {
      res.status(404).send("No active session found to update.");
    }
  } catch (err) {
    console.error("Error updating logout time", err);
    res.sendStatus(500);
  }
});



router.get('/search', verifyAdminToken, async (req, res) => {
  try {
    const { date, email } = req.query;

    const query = {};

    if (date) {
      const start = new Date(date);
      start.setHours(0, 0, 0, 0);
      const end = new Date(date);
      end.setHours(23, 59, 59, 999);
      query.date = { $gte: start, $lte: end };
    }

    // Fetch with date filter and populate user info
    let attendanceRecords = await Attendance.find(query).populate('userId', 'name email');

    if (email) {
      const lowerEmail = email.toLowerCase();
      attendanceRecords = attendanceRecords.filter(
        (rec) => rec.userId && rec.userId.email && rec.userId.email.toLowerCase() === lowerEmail
      );
    }

    res.json(attendanceRecords);
  } catch (error) {
    console.error('Error fetching attendance search:', error);
    res.status(500).json({ message: 'Server error while searching attendance' });
  }
});


// router.get('/weekly-attendance', verifyAdminToken, async (req, res) => {
//   try {
//     const today = new Date();
//     today.setHours(0, 0, 0, 0);

//     // Date 6 days ago (to get 7 days total including today)
//     const weekAgo = new Date(today);
//     weekAgo.setDate(weekAgo.getDate() - 6);

//     // Aggregate attendance count per day for last 7 days
//     const attendanceSummary = await Attendance.aggregate([
//       {
//         $match: {
//           date: { $gte: weekAgo, $lte: today }
//         }
//       },
//       {
//         $group: {
//           _id: "$date",
//           presentUsers: { $addToSet: "$userId" }
//         }
//       },
//       {
//         $project: {
//           _id: 0,
//           date: "$_id",
//           present: { $size: "$presentUsers" }
//         }
//       },
//       {
//         $sort: { date: 1 }
//       }
//     ]);

//     // attendanceSummary might not have entries for days with zero attendance
//     // Fill missing dates with present=0

//     const result = [];
//     for (let i = 0; i < 7; i++) {
//       const currentDate = new Date(weekAgo);
//       currentDate.setDate(weekAgo.getDate() + i);
//       currentDate.setHours(0, 0, 0, 0);

//       const dayRecord = attendanceSummary.find(record =>
//         record.date.getTime() === currentDate.getTime()
//       );

//       result.push({
//         date: currentDate.toISOString().split('T')[0], // "YYYY-MM-DD"
//         present: dayRecord ? dayRecord.present : 0
//       });
//     }

//     res.json(result);
//   } catch (error) {
//     console.error('Error fetching weekly attendance:', error);
//     res.status(500).json({ message: 'Server error' });
//   }
// });

// router.get('/weekly-attendance', verifyAdminToken, async (req, res) => {
//   try {
//     // Calculate past 7 days at midnight UTC (including today)
//     const today = new Date();
//     today.setUTCHours(0, 0, 0, 0);

//     const dates = [];
//     for (let i = 6; i >= 0; i--) {
//       const d = new Date(today);
//       d.setDate(today.getDate() - i);
//       dates.push(d);
//     }

//     // Aggregate attendance for past 7 days
//     const attendanceSummary = await Attendance.aggregate([
//       {
//         $match: {
//           date: { $gte: dates[0], $lte: dates[dates.length - 1] }
//         }
//       },
//       {
//         $group: {
//           _id: "$date",
//           uniqueUsers: { $addToSet: "$userId" }
//         }
//       },
//       {
//         $project: {
//           _id: 0,
//           date: "$_id",
//           totalUniqueUsers: { $size: "$uniqueUsers" }
//         }
//       },
//       {
//         $sort: { date: 1 }
//       }
//     ]);

//     // Create a map from aggregation results for quick lookup
//     const attendanceMap = new Map(
//       attendanceSummary.map(item => [item.date.toISOString(), item.totalUniqueUsers])
//     );

//     // Build final result with zero filling
//     const result = dates.map(date => {
//       const key = date.toISOString();
//       return {
//         date,
//         totalUniqueUsers: attendanceMap.get(key) || 0
//       };
//     });

//     // console.log(result)
//     res.json(result);
//   } catch (error) {
//     console.error('Error fetching weekly attendance:', error);
//     res.status(500).json({ message: 'Server error' });
//   }
// });

router.get('/weekly-attendance', verifyAdminToken, async (req, res) => {
  try {
    const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;
    const IST_OFFSET_MINUTES = 330;

    // Get current UTC time and shift to IST midnight
    const now = new Date();
    const nowInIST = new Date(now.getTime() + IST_OFFSET_MS);
    nowInIST.setHours(0, 0, 0, 0);

    // Prepare last 7 IST dates including today as strings 'YYYY-MM-DD'
    const dates = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(nowInIST);
      d.setDate(nowInIST.getDate() - i);
      dates.push(d.toISOString().slice(0, 10));
    }

    // Calculate 7-days-ago date string to filter
    const sevenDaysAgoStr = dates[0]; // oldest date in the range

    // Mongo aggregation
    const attendanceSummary = await Attendance.aggregate([
      {
        $addFields: {
          dateIST: {
            $dateToString: {
              date: { $add: ["$date", 1000 * 60 * IST_OFFSET_MINUTES] },
              format: "%Y-%m-%d"
            }
          }
        }
      },
      {
        $match: {
          dateIST: { $gte: sevenDaysAgoStr }
        }
      },
      {
        $group: {
          _id: "$dateIST",
          uniqueUsers: { $addToSet: "$userId" }
        }
      },
      {
        $project: {
          _id: 0,
          date: "$_id",
          uniqueUsers: 1,
          totalUniqueUsers: { $size: "$uniqueUsers" }
        }
      },
      {
        $sort: { date: 1 }
      }
    ]);

    // Create a map of date to totalUniqueUsers
    const attendanceMap = new Map(
      attendanceSummary.map(item => [item.date, item.totalUniqueUsers])
    );

    // Fill missing dates with 0 count
    const result = dates.map(date => ({
      date,
      totalUniqueUsers: attendanceMap.get(date) || 0
    }));

    res.json(result);
  } catch (error) {
    console.error('Error fetching weekly attendance:', error);
    res.status(500).json({ message: 'Server error' });
  }
});





router.get('/user-weekly-attendance', authMiddleware,async (req, res) => {
  try {
    const userId = req.user.id; // Assumes you use middleware to decode JWT and set req.user
    const objectId = new mongoose.Types.ObjectId(userId);

    const fourWeeksAgo = new Date();
    fourWeeksAgo.setDate(fourWeeksAgo.getDate() - 28);

    const attendanceStats = await Attendance.aggregate([
      {
        $match: {
          userId: objectId,
          date: { $gte: fourWeeksAgo }
        }
      },
      {
        $group: {
          _id: {
            userId: "$userId",
            dateOnly: {
              $dateToString: { format: "%Y-%m-%d", date: "$date" }
            }
          }
        }
      },
      {
        $addFields: {
          weekStart: {
            $dateTrunc: {
              date: { $dateFromString: { dateString: "$_id.dateOnly" } },
              unit: "week",
              timezone: "Asia/Kolkata"
            }
          }
        }
      },
      {
        $group: {
          _id: {
            userId: "$_id.userId",
            weekStart: "$weekStart"
          },
          daysPresent: { $sum: 1 }
        }
      },
      {
        $sort: { "_id.weekStart": 1 }
      },
      {
        $project: {
          _id: 0,
          weekStart: "$_id.weekStart",
          daysPresent: 1
        }
      }
    ]);
    // console.log(attendanceStats)

    const now = new Date();
const fourWeeks = [];

for (let i = 0; i < 4; i++) {
  const startOfWeek = new Date(now);
  startOfWeek.setDate(startOfWeek.getDate() - now.getDay() - i * 7); // Sunday as start
  startOfWeek.setHours(0, 0, 0, 0);
  fourWeeks.unshift(startOfWeek.toISOString()); // Keep order oldest to newest
}

// Map attendance data by weekStart for quick lookup
const attendanceMap = {};
attendanceStats.forEach(entry => {
  attendanceMap[new Date(entry.weekStart).toISOString()] = entry.daysPresent;
});

// Fill in missing weeks with 0
const fullAttendance = fourWeeks.map(weekStart => ({
  weekStart,
  daysPresent: attendanceMap[weekStart] || 0
}));

res.json(fullAttendance);

  } catch (err) {
    console.error("Error fetching weekly attendance:", err);
    res.status(500).json({ message: "Server error" });
  }
});







module.exports = router;
