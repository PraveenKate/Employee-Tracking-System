
import React, { useState } from "react";
import { Home, Users, Folder, User, LogOut ,CalendarCheck} from "lucide-react";
import styles from "../Styles/EmployeeManagement.module.css";

import Dashboard from "./Dashboard";
import ManageEmployees from "./ManageEmployees";
import Category from "./Category";
import Profile from "./Profile";
import EmployeeLocations from "./EmployeeLocations";
import AddEmployee from "./AddEmployee";
import EmployeeAttendance from "./EmployeeAttendance";
import AdminProfile from "./AdminProfile";



const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

const Admin1 = () => {
    const [activeTab, setActiveTab] = useState("Dashboard");
    const [token, setToken] = useState(null);
    const [loginError, setLoginError] = useState('');
    const [showAddEmployeeForm, setShowAddEmployeeForm] = useState(false);

   const handleLogin = async (e) => {
    e.preventDefault();
    setLoginError('');
    const email = e.target.email.value.trim();  // Changed from username
    const password = e.target.password.value.trim();

    try {
        const res = await fetch(`${BACKEND_URL}/admin/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password }), // Changed from username
        });

        if (!res.ok) {
            setLoginError('Invalid email or password');
            return;
        }

        const data = await res.json();
        setToken(data.token);
        setActiveTab("Dashboard");
        setShowAddEmployeeForm(false);
    } catch (err) {
        setLoginError('Login failed. Please try again.');
    }
};


    const handleTabClick = (tab) => {
        if (tab === "Logout") {
            setToken(null);
            setActiveTab("Dashboard");
            setShowAddEmployeeForm(false);
        } else {
            setActiveTab(tab);
            setShowAddEmployeeForm(false);
        }
    };

   const renderContent = () => {
    if (showAddEmployeeForm) {
        return <AddEmployee token={token} goBack={() => setShowAddEmployeeForm(false)} />;
    }

    switch (activeTab) {
        case "Dashboard":
            return (
                <Dashboard
                    token={token}
                    onAddEmployeeClick={() => setShowAddEmployeeForm(true)}
                    onViewAttendanceClick={() => setActiveTab("Employee Attendance")}
                />
            );

        case "Manage Employees":
            return (
                <ManageEmployees
                    token={token}
                    onAddEmployeeClick={() => setShowAddEmployeeForm(true)}
                />
            );

        case "Employee Locations":
            return <EmployeeLocations token={token} />;

        case "Admin Profile":
            return <AdminProfile token={token} />;

        case "Profile":
            return <Profile />;

        case "Employee Attendance":
            return <EmployeeAttendance token={token} />;

        default:
            return <Dashboard token={token}
                    onAddEmployeeClick={() => setShowAddEmployeeForm(true)}
                    onViewAttendanceClick={() => setActiveTab("Employee Attendance")}/>;
    }
};


    return (
        <div>
            {!token ? (
                <div className={styles.loginWrapper}>
                    <form id="loginForm" onSubmit={handleLogin} className={styles.loginCard}>
                        <h1 className={styles.loginTitle}>Admin Login</h1>
                        <input
        type="email"
        name="email" 
        placeholder="Admin Email"
        required
        className={styles.inputField}
        autoComplete="email"
    />
                        <input
                            type="password"
                            name="password"
                            placeholder="Password"
                            required
                            className={styles.inputField}
                            autoComplete="current-password"
                        />
                        <button type="submit" className={styles.loginButton}>Login</button>
                        {loginError && <p className={styles.errorText}>{loginError}</p>}
                    </form>
                </div>
            ) : (
                <div className={styles.container}>
                    <header className={styles.header}>
                        <h1 className={styles.headerTitle}>Employee Tracking System</h1>
                    </header>

                    <div className={styles.content}>
                        <aside
                            className={`${styles.sidebar} ${window.innerWidth >= 768 ? styles.sidebarVisible : ""
                                }`}
                        >
                            <nav className="space-y-4">
                                {["Dashboard", "Manage Employees", "Employee Locations", "Employee Attendance", "Admin Profile", "Logout"]

.map((tab) => (
                                    <button
                                        key={tab}
                                        onClick={() => handleTabClick(tab)}
                                        className={`${styles.navButton} ${activeTab === tab ? styles.navButtonActive : ""
                                            }`}
                                        aria-current={activeTab === tab ? "page" : undefined}
                                    >
                                        {tab === "Dashboard" && <Home size={18} />}
                                        {tab === "Manage Employees" && <Users size={18} />}
                                        {tab === "Employee Locations" && <User size={18} />}
                                        {tab === "Admin Profile" && <User size={18} />}

                                        {tab === "Employee Attendance" && <CalendarCheck size={18} />}
                                        {tab === "Profile" && <User size={18} />}
                                        {tab === "Logout" && <LogOut size={18} />}
                                        <span style={{ marginLeft: "8px" }}>{tab}</span>
                                    </button>
                                ))}
                            </nav>
                        </aside>

                        <main className={styles.main}>
                            {renderContent()}
                        </main>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Admin1;
