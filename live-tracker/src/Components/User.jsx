
import React, { useState, useEffect, useRef } from 'react';
import L from 'leaflet';
import { io } from 'socket.io-client';
import styles from '../Styles/User.module.css';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

const User = () => {
  const [token, setToken] = useState(null);
  const [loginError, setLoginError] = useState('');
  const mapRef = useRef(null);
  const markerRef = useRef(null);
  const socketRef = useRef(null);

  const userIcon = new L.Icon({
    iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-blue.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41],
  });

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoginError('');
    const email = e.target.email.value;
    const password = e.target.password.value;

    try {
      const res = await fetch(`${BACKEND_URL}/user/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      if (!res.ok) {
        setLoginError('Invalid email or password');
        return;
      }

      const data = await res.json();
      setToken(data.token);

      await fetch(`${BACKEND_URL}/attendance/login`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${data.token}` },
      });
    } catch {
      setLoginError('Login failed');
    }
  };

  const handleLogout = async () => {
    if (!token) return;

    try {
      await fetch(`${BACKEND_URL}/attendance/logout`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
    } catch (err) {
      console.error('Logout API error', err);
    }

    setToken(null);

    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
    }

    if (mapRef.current) {
      mapRef.current.remove();
      mapRef.current = null;
    }

    markerRef.current = null;
  };

  useEffect(() => {
    if (!token) return;

    if (!mapRef.current) {
      mapRef.current = L.map('map').setView([0, 0], 2);

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
      }).addTo(mapRef.current);
    }

    socketRef.current = io(BACKEND_URL, {
      auth: { token },
    });

    const sendLocation = () => {
      if (!navigator.geolocation) return;

      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const { latitude, longitude } = pos.coords;

          if (mapRef.current) {
            if (!markerRef.current) {
              markerRef.current = L.marker([latitude, longitude], { icon: userIcon })
                .addTo(mapRef.current)
                .bindPopup('You are here')
                .openPopup();
            } else {
              markerRef.current.setLatLng([latitude, longitude]);
              markerRef.current.openPopup();
            }

            mapRef.current.setView([latitude, longitude], 15);

            if (socketRef.current) {
              socketRef.current.emit('send-location', { lat: latitude, lng: longitude });
            }
          }
        },
        (err) => {
          console.error('Geolocation error:', err);
        }
      );
    };

    sendLocation();
    const intervalId = setInterval(sendLocation, 5000);

    return () => {
      clearInterval(intervalId);
      if (socketRef.current) socketRef.current.disconnect();
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
      markerRef.current = null;
    };
  }, [token]);

  return (
    <div className={styles.wrapper}>
      {!token ? (
        <div className={styles.container}>
          <h2 className={styles.heading}>User Login</h2>
          <form className={styles.form} onSubmit={handleLogin}>
            <input className={styles.input} type="email" name="email" placeholder="Email" required />
            <input className={styles.input} type="password" name="password" placeholder="Password" required />
            <button className={styles.button} type="submit">Login</button>
          </form>
          {loginError && <p className={styles.error}>{loginError}</p>}
        </div>
      ) : (
        <div className={styles.flexRow}>
          <div className={styles.mapPanel}>
            <button onClick={handleLogout} className={`${styles.button} ${styles.logoutButton}`}>
              Logout
            </button>
            <div id="map" className={styles.mapContainer}></div>
          </div>
        </div>
      )}
    </div>
  );
};

export default User;

