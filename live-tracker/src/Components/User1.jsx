import React, { useState, useEffect, useRef } from "react";
import { io } from "socket.io-client";
import { Home, MapPin, CalendarCheck, User, LogOut } from "lucide-react";
import styles from "../Styles/EmployeeManagement.module.css";

import UserDashboard from "./UserDashboard";
import UserLocation from "./UserLocation";
import UserAttendance from "./UserAttendance";
import UserProfile from "./UserProfile";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

const User1 = () => {
  const [activeTab, setActiveTab] = useState("Dashboard");
  const [token, setToken] = useState(null);
  const [loginError, setLoginError] = useState('');
  const socketRef = useRef(null);

  useEffect(() => {
    if (token) {
      // Initialize socket connection with token as auth
      socketRef.current = io(BACKEND_URL, {
        auth: { token }
      });

      socketRef.current.on("connect_error", (err) => {
        console.error("Socket connection error:", err.message);
      });

      // Clean up on unmount or token change (logout)
      return () => {
        if (socketRef.current) {
          socketRef.current.disconnect();
          socketRef.current = null;
        }
      };
    }
  }, [token]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoginError('');
    const email = e.target.email.value.trim();
    const password = e.target.password.value.trim();

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
      setActiveTab("Dashboard");

      // Attendance login API call after successful login
      await fetch(`${BACKEND_URL}/attendance/login`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${data.token}` },
      });
    } catch (err) {
      setLoginError('Login failed. Please try again.');
    }
  };

  const handleLogout = async () => {
    if (!token) return;

    // Emit manual-disconnect before logging out
    if (socketRef.current) {
      socketRef.current.emit('manual-disconnect');
      socketRef.current.disconnect();
      socketRef.current = null;
    }

    try {
      // Attendance logout API call
      await fetch(`${BACKEND_URL}/attendance/logout`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
    } catch (err) {
      console.error('Logout API error:', err);
    }

    setToken(null);
    setActiveTab("Dashboard");
  };

  const handleTabClick = (tab) => {
    if (tab === "Logout") {
      handleLogout();
    } else {
      setActiveTab(tab);
    }
  };

  const renderContent = () => {
    switch (activeTab) {
      case "Dashboard":
        return <UserDashboard token={token} />;
      case "My Location":
        return <UserLocation token={token} socket={socketRef.current} />;
      case "My Attendance":
        return <UserAttendance token={token} />;
      case "My Profile":
        return <UserProfile token={token} />;
      default:
        return <UserDashboard token={token} />;
    }
  };

  return (
    <div>
      {!token ? (
        <div className={styles.loginWrapper}>
          <form onSubmit={handleLogin} className={styles.loginCard}>
            <h1 className={styles.loginTitle}>User Login</h1>
            <input
              type="email"
              name="email"
              placeholder="Email"
              required
              className={styles.inputField}
            />
            <input
              type="password"
              name="password"
              placeholder="Password"
              required
              className={styles.inputField}
            />
            <button type="submit" className={styles.loginButton}>Login</button>
            {loginError && <p className={styles.errorText}>{loginError}</p>}
          </form>
        </div>
      ) : (
        <div className={styles.container}>
          <header className={styles.header}>
            <h1 className={styles.headerTitle}>User Panel</h1>
          </header>

          <div className={styles.content}>
            <aside className={`${styles.sidebar} ${window.innerWidth >= 768 ? styles.sidebarVisible : ""}`}>
              <nav className="space-y-4">
                {["Dashboard", "My Location", "My Attendance", "My Profile", "Logout"].map((tab) => (
                  <button
                    key={tab}
                    onClick={() => handleTabClick(tab)}
                    className={`${styles.navButton} ${activeTab === tab ? styles.navButtonActive : ""}`}
                    aria-current={activeTab === tab ? "page" : undefined}
                  >
                    {tab === "Dashboard" && <Home size={18} />}
                    {tab === "My Location" && <MapPin size={18} />}
                    {tab === "My Attendance" && <CalendarCheck size={18} />}
                    {tab === "My Profile" && <User size={18} />}
                    {tab === "Logout" && <LogOut size={18} />}
                    <span style={{ marginLeft: "8px" }}>{tab}</span>
                  </button>
                ))}
              </nav>
            </aside>

            <main className={styles.main}>
              {/* Render the main content based on active tab */}
              {renderContent()}

              {/* Keep UserLocation mounted always but hidden when inactive to track location immediately */}
              {token && activeTab !== "My Location" && (
                <div style={{ display: 'none' }}>
                  <UserLocation token={token} socket={socketRef.current} />
                </div>
              )}
            </main>
          </div>
        </div>
      )}
    </div>
  );
};

export default User1;
