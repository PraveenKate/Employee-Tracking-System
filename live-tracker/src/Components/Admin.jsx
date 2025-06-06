import React, { useState, useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Import Leaflet.awesome-markers CSS and JS (from CDN)
import 'leaflet.awesome-markers/dist/leaflet.awesome-markers.css';
import 'leaflet.awesome-markers';

// Make sure you have installed leaflet.awesome-markers via npm or have it in your project

import { io } from 'socket.io-client';


const markerColors = [
  'red',    // red
  'blue',   // blue
  'green',  // green
  'orange', // orange
  'purple', // purple
  'yellow', // yellow
  'pink',   // pink
  'brown',  // brown
  'cyan',   // cyan
  'magenta' // magenta (not default but you can replace with something close)
];

// Create awesome marker icon with location pin (map-marker)
const createAwesomeIcon = (color) => {
  return L.AwesomeMarkers.icon({
    icon: 'map-marker',   // location pin icon
    markerColor: color,
    prefix: 'fa',         // font-awesome prefix
    iconColor: 'white',
  });
};

const Admin = () => {
  const [token, setToken] = useState(null);
  const [userLocations, setUserLocations] = useState(new Map());
  const [onlineUsers, setOnlineUsers] = useState(new Set());
  const [loginError, setLoginError] = useState('');
  const [addUserError, setAddUserError] = useState('');
  const mapRef = useRef(null);
  const markersRef = useRef(new Map());
  const socketRef = useRef(null);

  const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

  const formatDateTime = (isoTime) => {
    const date = new Date(isoTime);
    const day = date.getDate();
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun",
      "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const month = monthNames[date.getMonth()];
    const year = date.getFullYear();
    let hours = date.getHours();
    const ampm = hours >= 12 ? 'pm' : 'am';
    hours = hours % 12 || 12;
    const minutes = date.getMinutes().toString().padStart(2, '0');
    return `${day} ${month} ${year}, ${hours}:${minutes}${ampm}`;
  };

  useEffect(() => {
    if (!token) return;

    // Initialize map only once
    if (!mapRef.current) {
      mapRef.current = L.map('map').setView([0, 0], 2);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors'
      }).addTo(mapRef.current);
    }

    // Setup socket connection
    socketRef.current = io(BACKEND_URL, {
      auth: { token }
    });

    socketRef.current.on('connect', () => {
      console.log('Admin connected');
    });

    socketRef.current.on('receive-location', (data) => {
      setUserLocations((prev) => {
        const newMap = new Map(prev);
        const { userId, username, lat, lng, timestamp } = data;
        newMap.set(userId, { username, lat, lng, time: formatDateTime(timestamp) });
        return newMap;
      });
    });

    socketRef.current.on('user-online', ({ userId }) => {
      setOnlineUsers((prev) => new Set(prev).add(userId));
    });

    socketRef.current.on('user-offline', ({ userId }) => {
      setOnlineUsers((prev) => {
        const newSet = new Set(prev);
        newSet.delete(userId);
        return newSet;
      });
    });

    socketRef.current.on('disconnect', () => {
      console.log('Disconnected');
    });

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
      markersRef.current.clear();
    };
  }, [token]);

  useEffect(() => {
    if (!mapRef.current) return;

    // Assign color based on userId hash
    const getColorForUser = (userId) => {
      let hash = 0;
      for (let i = 0; i < userId.length; i++) {
        hash += userId.charCodeAt(i);
      }
      return markerColors[hash % markerColors.length];
    };

    // Update markers for each user location
    userLocations.forEach(({ lat, lng, username }, userId) => {
      const color = getColorForUser(userId);
      const icon = createAwesomeIcon(color);

      if (markersRef.current.has(userId)) {
        const marker = markersRef.current.get(userId);
        marker.setLatLng([lat, lng]);
        marker.setIcon(icon);
      } else {
        const marker = L.marker([lat, lng], { icon }).addTo(mapRef.current);
        marker.bindPopup(username || userId);
        markersRef.current.set(userId, marker);
      }
    });

    // Remove markers for users no longer tracked
    markersRef.current.forEach((marker, userId) => {
      if (!userLocations.has(userId)) {
        mapRef.current.removeLayer(marker);
        markersRef.current.delete(userId);
      }
    });
  }, [userLocations]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoginError('');
    const username = e.target.username.value;
    const password = e.target.password.value;

    try {
      const res = await fetch(`${BACKEND_URL}/admin/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });

      if (!res.ok) {
        setLoginError('Login failed');
        return;
      }

      const data = await res.json();
      setToken(data.token);
    } catch {
      setLoginError('Login failed');
    }
  };

  // Inside Admin component, add this function:
const handleUserClick = (userId) => {
  const marker = markersRef.current.get(userId);
  if (marker && mapRef.current) {
    mapRef.current.setView(marker.getLatLng(), 20, { animate: true });
    marker.openPopup();
  }
};


  const handleAddUser = async (e) => {
    e.preventDefault();
    setAddUserError('');
    const username = e.target.newUsername.value;
    const password = e.target.newPassword.value;

    try {
      const res = await fetch(`${BACKEND_URL}/admin/users`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ username, password })
      });

      if (!res.ok) {
        const errorData = await res.json();
        setAddUserError('Add user failed: ' + (errorData.error || 'Unknown error'));
        return;
      }

      alert('User added successfully');
      e.target.reset();
    } catch (err) {
      setAddUserError('Error: ' + err.message);
    }
  };

  const renderUserList = () => {
    const entries = Array.from(userLocations.entries()).sort((a, b) => {
      return new Date(b[1].time) - new Date(a[1].time);
    });

    if (entries.length === 0) return <p>No users tracking yet.</p>;

    return (
      <table border="1" cellPadding="5" cellSpacing="0" style={{ borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            <th>Username</th>
            <th>User ID</th>
            <th>Status</th>
            <th>Date & Time</th>
            <th>Latitude</th>
            <th>Longitude</th>
          </tr>
        </thead>
       <tbody>
  {entries.map(([userId, loc]) => (
    <tr key={userId}>
      <td 
        style={{ cursor: 'pointer', color: 'blue', textDecoration: 'underline' }}
        onClick={() => handleUserClick(userId)}
      >
        {loc.username || 'N/A'}
      </td>
      <td>{userId}</td>
      <td>{onlineUsers.has(userId) ? 'Online' : 'Offline'}</td>
      <td>{loc.time}</td>
      <td>{loc.lat.toFixed(5)}</td>
      <td>{loc.lng.toFixed(5)}</td>
    </tr>
  ))}
</tbody>

      </table>
    );
  };

  return (
    <div style={{ padding: 20 }}>
      {!token ? (
        <>
          <h1>Admin Login</h1>
          <form id="loginForm" onSubmit={handleLogin}>
            <input type="text" name="username" placeholder="Admin Username" required />
            <input type="password" name="password" placeholder="Password" required />
            <button type="submit">Login</button>
          </form>
          {loginError && <p style={{ color: 'red' }}>{loginError}</p>}
        </>
      ) : (
        <>
          <h1>Admin Panel - Live Locations</h1>

          <div style={{ marginTop: 20 }}>
            <h3>Add New User</h3>
            <form id="addUserForm" onSubmit={handleAddUser}>
              <input type="text" name="newUsername" placeholder="Username" required />
              <input type="password" name="newPassword" placeholder="Password" required />
              <button type="submit">Add User</button>
            </form>
            {addUserError && <p style={{ color: 'red' }}>{addUserError}</p>}
          </div>

          <div id="userList" style={{ marginTop: 20 }}>
            <h3>Users Tracking:</h3>
            {renderUserList()}
          </div>

          <div id="map" style={{ height: '80vh', marginTop: 20 }}></div>
        </>
      )}
    </div>
  );
};

export default Admin;

