import React, { useState, useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet.awesome-markers/dist/leaflet.awesome-markers.css';
import 'leaflet.awesome-markers';
import { io } from 'socket.io-client';
import styles from '../Styles/EmployeeLocations.module.css';
import styles1 from '../Styles/EmployeeManagement.module.css';

const markerColors = [
  'red', 'blue', 'green', 'orange', 'purple',
  'yellow', 'pink', 'brown', 'cyan', 'cadetblue'
];

const createAwesomeIcon = (color) => {
  return L.AwesomeMarkers.icon({
    icon: 'map-marker',
    markerColor: color,
    prefix: 'fa',
    iconColor: 'white',
  });
};

const EmployeeLocations = ({ token }) => {
  const [userLocations, setUserLocations] = useState(new Map());
  const [onlineUsers, setOnlineUsers] = useState(new Set());
  const [currentPage, setCurrentPage] = useState(1);
  const [isLoading, setIsLoading] = useState(false);

  const itemsPerPage = 3;
  const mapRef = useRef(null);
  const markersRef = useRef(new Map());
  const socketRef = useRef(null);

  const [selectedUserHistory, setSelectedUserHistory] = useState([]);
  const [historyUserId, setHistoryUserId] = useState(null);
  const [historyPage, setHistoryPage] = useState(1);
  const historyItemsPerPage = 5;

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

    if (!mapRef.current) {
      mapRef.current = L.map('map').setView([0, 0], 2);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors'
      }).addTo(mapRef.current);
    }

    socketRef.current = io(BACKEND_URL, {
      auth: { token }
    });

    socketRef.current.on('connect', () => {
      console.log('Admin connected');
    });

    socketRef.current.on('receive-location', (data) => {
      const { userId, username, lat, lng, timestamp, address } = data;
      console.log(data)
      if (!userId) return;
      setIsLoading(true);

      setUserLocations((prev) => {
        const newMap = new Map(prev);
        newMap.set(userId, {
          username,
          lat,
          lng,
          time: formatDateTime(timestamp),
          rawTime: timestamp,
          address: address || 'Unknown location',
        });
        return newMap;
      });
      setIsLoading(false);
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
        socketRef.current = null;
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

    const getColorForUser = (userId) => {
      if (!userId || typeof userId !== 'string') return markerColors[0];
      let hash = 0;
      for (let i = 0; i < userId.length; i++) {
        hash += userId.charCodeAt(i);
      }
      return markerColors[hash % markerColors.length];
    };

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

    markersRef.current.forEach((marker, userId) => {
      if (!userLocations.has(userId)) {
        mapRef.current.removeLayer(marker);
        markersRef.current.delete(userId);
      }
    });
  }, [userLocations]);

  const handleUserClick = (userId) => {
    const marker = markersRef.current.get(userId);
    if (marker && mapRef.current) {
      mapRef.current.setView(marker.getLatLng(), 15, { animate: true });
      marker.openPopup();
    }
  };

  const fetchUserHistory = async (userId) => {
    const today = new Date().toISOString().split('T')[0];
    try {
      const response = await fetch(`${BACKEND_URL}/admin/location-history?userId=${userId}&date=${today}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      let data = await response.json();
      setSelectedUserHistory(data);
      setHistoryUserId(userId);
      setHistoryPage(1);
    } catch (err) {
      console.error("Failed to fetch history", err);
      setSelectedUserHistory([]);
      setHistoryUserId(null);
    }
  };

  const renderUserList = () => {
    const entries = Array.from(userLocations.entries()).sort((a, b) => {
      return new Date(b[1].rawTime) - new Date(a[1].rawTime);
    });

    if (entries.length === 0) {
      return <p>No users tracking yet.</p>;
    }

    const totalPages = Math.ceil(entries.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const currentEntries = entries.slice(startIndex, startIndex + itemsPerPage);

    const totalHistoryPages = Math.ceil(selectedUserHistory.length / historyItemsPerPage);
    const startHistoryIndex = (historyPage - 1) * historyItemsPerPage;
    const currentHistoryPageItems = selectedUserHistory.slice(startHistoryIndex, startHistoryIndex + historyItemsPerPage);

    return (
      <>
        <table className={styles.table}>
          <thead className={styles.thead}>
            <tr>
              <th className={styles.th}>Name</th>
              <th className={styles.th}>User ID</th>
              <th className={styles.th}>Status</th>
              <th className={styles.th}>Date & Time</th>
              <th className={styles.th}>Location</th>
              <th className={styles.th}>History</th>
            </tr>
          </thead>
          <tbody>
            {currentEntries.map(([userId, loc], index) => (
              <tr key={userId} className={index % 2 === 0 ? styles.trEven : styles.trOdd}>
                <td className={`${styles.td} ${styles.clickableUsername}`} onClick={() => handleUserClick(userId)}>
                  {loc.username || 'N/A'}
                </td>
                <td className={styles.td}>{userId}</td>
                <td className={styles.td}>{onlineUsers.has(userId) ? 'Online' : 'Offline'}</td>
                <td className={styles.td}>{loc.time}</td>
                <td className={styles.td}>{loc.address || 'Unknown'}</td>
                <td className={styles.td}>
                  <button className={styles1.btn} onClick={() => fetchUserHistory(userId)}>View</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className={styles1.pagination}>
          <button className={styles1.btn} onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))} disabled={currentPage === 1}>
            Previous
          </button>
          <span className={styles1.pageInfo}>Page {currentPage} of {totalPages}</span>
          <button className={styles1.btn} onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))} disabled={currentPage === totalPages}>
            Next
          </button>
        </div>

        {historyUserId && (
          <div className={styles.historySection}>
            <h3>Location History for {userLocations.get(historyUserId)?.username || historyUserId}</h3>
            {selectedUserHistory.length > 0 ? (
              <>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th className={styles.th}>Time</th>
                      <th className={styles.th}>Address</th>
                    </tr>
                  </thead>
                  <tbody>
                    {currentHistoryPageItems.map((loc, index) => (
                      <tr key={index} className={index % 2 === 0 ? styles.trEven : styles.trOdd}>
                        <td className={styles.td}>{formatDateTime(loc.timestamp)}</td>
                        <td className={styles.td}>{loc.address || 'Unknown'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                <div className={styles1.pagination}>
                  <button className={styles1.btn} onClick={() => setHistoryPage(p => Math.max(p - 1, 1))} disabled={historyPage === 1}>
                    Previous
                  </button>
                  <span className={styles1.pageInfo}>Page {historyPage} of {totalHistoryPages}</span>
                  <button className={styles1.btn} onClick={() => setHistoryPage(p => Math.min(p + 1, totalHistoryPages))} disabled={historyPage === totalHistoryPages}>
                    Next
                  </button>
                </div>
              </>
            ) : (
              <p>No location history for today.</p>
            )}
          </div>
        )}
      </>
    );
  };

  if (!token) {
    return <p className={styles.errorText}>Token is required to use this component.</p>;
  }

  return (
    <div className={styles.locationContainer}>
      <div className={styles.users}>
        <h2>User Locations</h2>
        {isLoading ? (
  <div className={styles.loadingContainer}>
    <div className={styles.spinner}></div>
    <div className={styles.loadingText}>Loading...</div>
  </div>
) : (
  renderUserList()
)}

      </div>
      <div id="map" className={styles.mapWrapper}></div>
    </div>
  );
};

export default EmployeeLocations;
