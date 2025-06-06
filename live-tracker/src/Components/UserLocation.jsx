import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { io } from 'socket.io-client';
import styles from '../Styles/User.module.css';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

const UserLocation = ({ token }) => {
  const mapRef = useRef(null);
  const markerRef = useRef(null);
  const socketRef = useRef(null);
  const [loading, setLoading] = useState(true);
  const initialLoadRef = useRef(true);

  const userIcon = new L.Icon({
    iconUrl:
      'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-blue.png',
    shadowUrl:
      'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41],
  });

  useEffect(() => {
    if (!token) return;

    if (!mapRef.current && document.getElementById('map')) {
      mapRef.current = L.map('map').setView([0, 0], 2);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
      }).addTo(mapRef.current);
    }

    socketRef.current = io(BACKEND_URL, { auth: { token } });

    const sendLocation = () => {
      if (!navigator.geolocation) return;

      if (initialLoadRef.current) {
        setLoading(true);
      }

      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          const { latitude, longitude } = pos.coords;

          let address = 'Address not found';
          try {
            const res = await fetch(
              `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json`
            );
            const data = await res.json();
            address = data.display_name || address;
            console.log('📍 Address:', address);
          } catch (err) {
            console.error('Reverse geocoding error:', err);
          }

          if (mapRef.current) {
            if (!markerRef.current) {
              markerRef.current = L.marker([latitude, longitude], { icon: userIcon })
                .addTo(mapRef.current)
                .bindPopup(address)
                .openPopup();
            } else {
              markerRef.current.setLatLng([latitude, longitude]);
              markerRef.current.setPopupContent(address).openPopup();
            }
            mapRef.current.setView([latitude, longitude], 15);
          }

          if (socketRef.current) {
            socketRef.current.emit('send-location', {
              lat: latitude,
              lng: longitude,
              address,
            });
          }

          if (initialLoadRef.current) {
            setLoading(false);
            initialLoadRef.current = false;
          }
        },
        (err) => {
          console.error('Geolocation error:', err);
          if (initialLoadRef.current) {
            setLoading(false);
            initialLoadRef.current = false;
          }
        }
      );
    };

    sendLocation();
    const intervalId = setInterval(sendLocation, 36000000);

    const handleTabClose = (event) => {
      const payload = JSON.stringify({ token });
      navigator.sendBeacon(`${BACKEND_URL}/manual-disconnect`, payload);
    };

    window.addEventListener('beforeunload', handleTabClose);
    window.addEventListener('unload', handleTabClose);

    return () => {
      clearInterval(intervalId);

      // Cleanup event listeners only, don't trigger logout manually here
      window.removeEventListener('beforeunload', handleTabClose);
      window.removeEventListener('unload', handleTabClose);

      // Optional: Just cleanup map reference
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
      markerRef.current = null;
    };
  }, [token]);

  return (
    <>
      {loading && <div className={styles.loading}>📍 Loading your location...</div>}
      <div id="map" className={styles.mapContainer}></div>
    </>
  );
};

export default UserLocation;
