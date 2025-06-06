
require('dotenv').config();
const express = require('express');
const http = require('http');
const mongoose = require('mongoose');
const socketIo = require('socket.io');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const AdminRoutes = require('./routes/admin');
const UserRoutes = require('./routes/user');
const Location = require('./models/Location');
const Attendance = require('./models/Attendance');
const User = require('./models/User'); 
const attendanceRoutes = require('./routes/attendance');

const app = express();

const allowedOrigins = [
  'http://localhost:3000',
  'https://employee-tracking-system-frontend.onrender.com', // Your deployed frontend
];

app.use(cors({
  origin: (origin, callback) => {
    // Allow undefined for Postman or curl
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
}));



app.use(express.json());

const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: allowedOrigins,
    methods: ["GET", "POST", "PUT"],
    credentials: true,
  }
});


const JWT_SECRET = process.env.JWT_SECRET || 'secret';

// MongoDB connection
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log('Connected to MongoDB Atlas'))
.catch(err => console.error('MongoDB connection error:', err));

// Routes
app.use('/admin', AdminRoutes);
app.use('/user', UserRoutes);

app.use('/attendance', attendanceRoutes);


// Socket.IO auth middleware
io.use((socket, next) => {
  const token = socket.handshake.auth.token;
  if (!token) return next(new Error('Authentication error'));
  try {
    const user = jwt.verify(token, JWT_SECRET);
    socket.user = user;
    next();
  } catch (err) {
    next(new Error('Authentication error'));
  }
});

const userSocketMap = new Map();
// const loggedInUsers = new Map();
const { loggedInUsers } = require('./utils/authStore');

io.on('connection', async (socket) => {
  const { id: userId, name, role } = socket.user;
  // console.log(`User connected: ${userId} (${name}, ${role})`);

  loggedInUsers.set(userId, socket.id);
  if (role === 'user') userSocketMap.set(userId, name);

  if (role === 'user') {
    io.sockets.sockets.forEach((s) => {
      if (s.user.role === 'admin') {
        s.emit('user-online', { userId, username: name });
      }
    });
  }

  if (role === 'admin') {
    for (const [uid, socketId] of loggedInUsers.entries()) {
      const user = await User.findById(uid).select('name');
      if (user) {
        socket.emit('user-online', { userId: uid, username: user.name });
      }
    }

   try {
  const latestLocations = await Location.aggregate([
     { $sort: { timestamp: -1 } },
        {
          $group: {
            _id: "$userId",
            lat: { $first: "$lat" },
            lng: { $first: "$lng" },
            address: { $first: "$address" },
            timestamp: { $first: "$timestamp" }
          }
        }
      ]);
      
      
  for (const loc of latestLocations) {
     const user = await User.findById(loc._id).select('name');
        if (!user) continue;

    socket.emit('receive-location', {
      userId: loc._id,
      username: user.name,
      lat: loc.lat,
      lng: loc.lng,
      address: loc.address,
      timestamp: loc.timestamp
    });
  }
} catch (err) {
  console.error('Error sending locations:', err);
}

  }

 socket.on('send-location', async ({ lat, lng, address }) => {
  // console.log(address);
  if(address=="Address not found") return;
  try {
    const user = await User.findById(userId).select('name');
    if (!user) return;

    const lastLoc = await Location.findOne({ userId }).sort({ timestamp: -1 });
    const now = new Date();

    const oneHourMs =0; // 1 hour in ms
    const fiveMinutesMs = 0; // 5 minutes in ms

    let shouldSave = false;

    if (!lastLoc) {
      // No previous record, save directly
      shouldSave = true;
    } else {
      const timeDiff = now - lastLoc.timestamp; // milliseconds difference

      // Check if last record is older than 1 hour
      const oneHourPassed = timeDiff >= oneHourMs;

      // Check if last record is duplicate within 5 minutes
      const isDuplicateWithin5Min =
        timeDiff < fiveMinutesMs &&
        lastLoc.lat === lat &&
        lastLoc.lng === lng &&
        lastLoc.address === address;

      // Save if either 1 hour passed OR not a duplicate within 5 minutes
      shouldSave = oneHourPassed || !isDuplicateWithin5Min;
    }

    if (shouldSave) {
      const newLoc = new Location({
        userId,
        lat,
        lng,
        address,
        timestamp: now
      });
      await newLoc.save();

      io.sockets.sockets.forEach((s) => {
        if (s.user?.role === 'admin') {
          s.emit('receive-location', {
            userId,
            username: user.name,
            address,
            lat,
            lng,
            timestamp: newLoc.timestamp
          });
        }
      });
    } else {
      console.log('Duplicate location detected within 5 minutes, skipping save');
    }
  } catch (err) {
    console.error('Location update error:', err);
  }
});

// socket.on('send-location', async ({ userId, lat, lng, address }) => {
//   console.log(address);
//   try {
//     if (!userId) return;

//     const user = await User.findById(userId).select('name');
//     if (!user) return;

//     const lastLoc = await Location.findOne({ userId }).sort({ timestamp: -1 });
//     const now = new Date();
//     const oneHourMs = 60 * 60 * 1000; // 1 hour

//     let shouldSave = false;

//     if (lastLoc) {
//       const timeDiff = now - new Date(lastLoc.timestamp);
//       const oneHourPassed = timeDiff >= oneHourMs;

//       if (oneHourPassed) {
//         shouldSave = true;
//       } else {
//         console.log('Less than 1 hour since last update, skipping DB save');
//       }
//     } else {
//       console.log('No previous location found, skipping DB save due to rule');
//     }

//     if (shouldSave) {
//       const newLoc = new Location({
//         userId,
//         lat,
//         lng,
//         address,
//         timestamp: now
//       });
//       await newLoc.save();
//     }

//     // Always broadcast to admins, regardless of DB save
//     io.sockets.sockets.forEach((s) => {
//       if (s.user?.role === 'admin') {
//         s.emit('receive-location', {
//           userId,
//           username: user.name,
//           address,
//           lat,
//           lng,
//           timestamp: now
//         });
//       }
//     });

//   } catch (err) {
//     console.error('Location update error:', err);
//   }
// });


 socket.on('disconnect', async () => {
  const { id: userId, role, name } = socket.user || {};
  const disconnectTime = new Date();

 

  loggedInUsers.delete(userId);
  userSocketMap.delete(userId);

  // Notify admins if a user goes offline
  if (role === 'user') {
    io.sockets.sockets.forEach((s) => {
      if (s.user?.role === 'admin') {
        s.emit('user-offline', { userId, username: name });
      }
    });
  }

  if (!userId) return; // safety check

  if(role=="user")
  try {
    // Force update the most recent attendance record where logoutTime is null or missing
    const result = await Attendance.findOneAndUpdate(
      {
        userId,
        $or: [{ logoutTime: null }, { logoutTime: { $exists: false } }]
      },
      {
        $set: { logoutTime: disconnectTime }
      },
      {
        sort: { createdAt: -1 },
        new: true // return updated doc if needed
      }
    );

    if (result) {
      console.log(`Logout time force-updated for userId=${userId}`);
    } else {
      console.log(`No attendance record found or already updated for userId=${userId}`);
    }
  } catch (error) {
    console.error(`Error force-updating logout time for userId=${userId}:`, error);
  }
});

socket.on('manual-disconnect', async () => {
  const { id: userId, role, name } = socket.user || {};
  const disconnectTime = new Date();

  loggedInUsers.delete(userId);
  userSocketMap.delete(userId);

  if (role === 'user') {
    io.sockets.sockets.forEach((s) => {
      if (s.user?.role === 'admin') {
        s.emit('user-offline', { userId, username: name });
      }
    });
  }

  if (role === 'user') {
    try {
      const result = await Attendance.findOneAndUpdate(
        { userId, $or: [{ logoutTime: null }, { logoutTime: { $exists: false } }] },
        { $set: { logoutTime: disconnectTime } },
        { sort: { createdAt: -1 }, new: true }
      );

      if (result) {
        console.log(`Logout time updated via manual-disconnect for userId=${userId}`);
      }
    } catch (err) {
      console.error(`Error on manual-disconnect for userId=${userId}`, err);
    }
  }
});



});




function notifyDashboardUpdate() {
  io.emit('dashboardUpdate');
  console.log('Emitted dashboardUpdate event');
}

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));

module.exports = { app, loggedInUsers , notifyDashboardUpdate};
