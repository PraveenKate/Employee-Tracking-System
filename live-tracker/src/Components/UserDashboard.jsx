import React, { useEffect, useState } from "react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";
import styles from "../Styles/Dashboard.module.css";

const UserDashboard = ({ token }) => {
  const [summary, setSummary] = useState({
    totalDays: 0,
    presentDays: 0,
    activeLocations: 0,
    latestLocation: null,
  });

  const [address, setAddress] = useState("");
  const [attendanceData, setAttendanceData] = useState([]);
  const [loadingAttendance, setLoadingAttendance] = useState(false);
  const [attendanceError, setAttendanceError] = useState(null);
  const BACKEND_URL = process.env.REACT_APP_BACKEND_URL
  const getShortAddress = (fullAddress) => {
    if (!fullAddress) return "";
    const parts = fullAddress.split(",");
    return parts.length > 3 ? parts.slice(0, 3).join(", ") + "..." : fullAddress;
  };

  useEffect(() => {
    if (!token) return;

    fetch(`${BACKEND_URL}/user/dashboard-summary`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => {
        if (!res.ok) throw new Error(`Error: ${res.status}`);
        return res.json();
      })
      .then((data) => {
        setSummary(data);
        if (data.latestLocation?.lat && data.latestLocation?.lng) {
          fetchAddressFromCoordinates(data.latestLocation.lat, data.latestLocation.lng);
        } else {
          setAddress("No location data");
        }
      })
      .catch((err) => {
        console.error("User dashboard summary fetch error:", err);
        setSummary({ totalDays: 0, presentDays: 0, activeLocations: 0 });
        setAddress("Unable to fetch location");
      });
  }, [token]);

  const fetchAddressFromCoordinates = async (lat, lng) => {
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}`
      );
      const data = await response.json();
      if (data?.display_name) {
        setAddress(data.display_name);
      } else {
        setAddress("Address not found");
      }
    } catch (error) {
      setAddress("Error fetching address");
    }
  };

  useEffect(() => {
    if (!token) return;

    const fetchAttendance = async () => {
      setLoadingAttendance(true);
      setAttendanceError(null);

      try {
        const res = await fetch(`${BACKEND_URL}/attendance/user-weekly-attendance`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error(`Error: ${res.status}`);

        const data = await res.json();
        setAttendanceData(data);
      } catch (error) {
        setAttendanceError(error.message);
        setAttendanceData([]);
      } finally {
        setLoadingAttendance(false);
      }
    };

    fetchAttendance();
  }, [token]);

  return (
    <div className={styles.dashboardContainer}>
      <h2 className={styles.heading}>Welcome Back, User</h2>

      <div className={styles.cardsContainer}>
        <div className={styles.card}>
          <p>Total Days Since Joined</p>
          <h3>{summary?.totalDays ?? 0}</h3>
        </div>
        <div className={styles.card}>
          <p>Total Present Days</p>
          <h3>{summary?.presentDays ?? 0}</h3>
        </div>
        {/* <div className={styles.card}>
          <p>Active Location</p>
          <h4 className={styles.addressText}>{getShortAddress(address)}</h4>
        </div> */}
      </div>

      <div className={styles.graphSection}>
        <h3>Weekly Attendance (Days Present)</h3>
        {loadingAttendance ? (
          <div className={styles.spinner}></div>
        ) : attendanceError ? (
          <p style={{ color: "red" }}>Error: {attendanceError}</p>
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <LineChart
              data={attendanceData}
              margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="weekStart"
                tickFormatter={(date) =>
                  new Date(date).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                  })
                }
                tick={{ fill: "#4b5563", fontWeight: "bold" }}
              />
              <YAxis allowDecimals={false} tick={{ fill: "#4b5563" }} domain={[0, 7]} />
              <Tooltip
                contentStyle={{ backgroundColor: "#f9fafb", borderRadius: 5 }}
                labelFormatter={(label) =>
                  `Week Starting: ${new Date(label).toLocaleDateString()}`
                }
                formatter={(value) => [`${value} Days Present`, ""]}
              />
              <Line
                type="monotone"
                dataKey="daysPresent"
                stroke="#4f46e5"
                strokeWidth={3}
                dot={{ r: 5, strokeWidth: 2, fill: "#4f46e5" }}
                activeDot={{ r: 7 }}
                animationDuration={800}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
};

export default UserDashboard;
