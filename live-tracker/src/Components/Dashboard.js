import React, { useEffect, useState } from "react";
import { Users, MapPin, CalendarCheck, PlusCircle } from "lucide-react";
import styles from "../Styles/Dashboard.module.css";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";

const Dashboard = ({ token, onAddEmployeeClick, onViewAttendanceClick }) => {
  const [summary, setSummary] = useState({ totalEmployees: 0, presentToday: 0, locations: 0 });
  const [attendanceData, setAttendanceData] = useState([]);
  const [loadingAttendance, setLoadingAttendance] = useState(false);
  const [attendanceError, setAttendanceError] = useState(null);
  const BACKEND_URL = process.env.REACT_APP_BACKEND_URL
  useEffect(() => {
    if (!token) return;

    const fetchSummary = () => {
      fetch(`${BACKEND_URL}/admin/dashboard-summary`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      })
        .then((res) => {
          if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
          return res.json();
        })
        .then((data) => setSummary(data))
        .catch((err) => console.error("Dashboard summary fetch error:", err));
    };

    fetchSummary();
    const intervalId = setInterval(fetchSummary, 2 * 60 * 1000);
    return () => clearInterval(intervalId);
  }, [token]);

  useEffect(() => {
    if (!token) return;

    const fetchAttendanceData = async () => {
      setLoadingAttendance(true);
      setAttendanceError(null);

      try {
        const res = await fetch(`${BACKEND_URL}/attendance/weekly-attendance`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!res.ok) throw new Error(`Error fetching attendance: ${res.status}`);
        const data = await res.json();

        const formattedData = data.map((item) => {
          const day = new Date(item.date).toLocaleDateString("en-US", { weekday: "short" });
          return { day, present: item.totalUniqueUsers };
        });

        setAttendanceData(formattedData);
      } catch (error) {
        setAttendanceError(error.message);
        setAttendanceData([]);
      } finally {
        setLoadingAttendance(false);
      }
    };

    fetchAttendanceData();
  }, [token]);

  return (
    <div className={styles.dashboardContainer}>
      <h2 className={styles.heading}>Welcome Back, Admin</h2>

      <div className={styles.cardsContainer}>
        <div className={styles.card}>
          <Users size={20} />
          <div>
            <p>Total Employees</p>
            <h3>{summary.totalEmployees}</h3>
          </div>
        </div>
        <div className={styles.card}>
          <CalendarCheck size={20} />
          <div>
            <p>Present Today</p>
            <h3>{summary.presentToday}</h3>
          </div>
        </div>
        <div className={styles.card}>
          <MapPin size={20} />
          <div>
            <p>Active Locations</p>
            <h3>{summary.locations}</h3>
          </div>
        </div>
      </div>

      <div className={styles.graphSection}>
        <h3>Weekly Attendance Trend</h3>
        {loadingAttendance ? (
          <div className={styles.loadingContainer}>
            <div className={styles.spinner}></div>
            <p>Loading attendance data...</p>
          </div>
        ) : attendanceError ? (
          <p style={{ color: "red" }}>Error: {attendanceError}</p>
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={attendanceData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="day" tick={{ fill: "#4b5563", fontWeight: "bold" }} />
              <YAxis allowDecimals={false} tick={{ fill: "#4b5563" }} />
              <Tooltip
                contentStyle={{ backgroundColor: "#f9fafb", borderRadius: 5 }}
                labelFormatter={(label) => `Day: ${label}`}
                formatter={(value) => [`${value} Present`, ""]}
              />
              <Line
                type="monotone"
                dataKey="present"
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

      <div className={styles.quickActions}>
        <h3>Quick Actions</h3>
        <button className={styles.actionButton} onClick={onAddEmployeeClick}>
          <PlusCircle size={16} /> Add Employee
        </button>
        <button className={styles.actionButton} onClick={onViewAttendanceClick}>
          <CalendarCheck size={16} /> View Today’s Attendance
        </button>
      </div>
    </div>
  );
};

export default Dashboard;
