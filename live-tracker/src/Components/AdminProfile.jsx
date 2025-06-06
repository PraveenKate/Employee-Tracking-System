import React, { useEffect, useState } from 'react';
import styles from '../Styles/AdminProfile.module.css';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL; // Change this to your backend URL if needed

const AdminProfile = ({ token }) => {
  const [admin, setAdmin] = useState({
    name: '',
    email: '',
    organization: '',
    password: '',  // for new password input only
    address: '',
  });
  const [isEditing, setIsEditing] = useState(false);
  const [message, setMessage] = useState('');

  const fetchProfile = async () => {
    if (!token) {
      setMessage('No authorization token found.');
      return;
    }

    try {
      const response = await fetch(`${BACKEND_URL}/admin/profile`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        if (response.status === 401) {
          setMessage('Unauthorized. Please login again.');
        } else {
          setMessage('Failed to fetch profile');
        }
        return;
      }

      const data = await response.json();
      setAdmin({ ...data, password: '' });
      setMessage('');
    } catch (err) {
      setMessage('Failed to fetch profile');
    }
  };

  useEffect(() => {
    fetchProfile();
  }, [token]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setAdmin(prev => ({ ...prev, [name]: value }));
    setMessage('');
  };

  const handleSave = async () => {
    if (!token) {
      setMessage('No authorization token found.');
      return;
    }

    try {
      const updateData = { ...admin };
      if (!updateData.password) {
        delete updateData.password; // avoid sending empty password
      }

      const response = await fetch(`${BACKEND_URL}/admin/profile`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updateData),
      });

      if (!response.ok) {
        if (response.status === 401) {
          setMessage('Unauthorized. Please login again.');
        } else {
          setMessage('Failed to update profile');
        }
        return;
      }

      setMessage('Profile updated successfully');
      setIsEditing(false);
      fetchProfile();
    } catch (err) {
      setMessage('Failed to update profile');
    }
  };

  return (
    <div className={styles.container}>
      <h2 className={styles.heading}>Admin Profile</h2>
      {message && <p className={styles.message}>{message}</p>}

      <div className={styles.form}>
        <label>Name:</label>
        <input
          name="name"
          value={admin.name}
          onChange={handleChange}
          disabled={!isEditing}
        />

        <label>Email:</label>
        <input
          name="email"
          type="email"
          value={admin.email}
          onChange={handleChange}
          disabled={!isEditing}
        />

        <label>Organization:</label>
        <input
          name="organization"
          value={admin.organization}
          onChange={handleChange}
          disabled={!isEditing}
        />

        <label>Password:</label>
        <input
          name="password"
          type="password"
          value={admin.password}
          onChange={handleChange}
          disabled={!isEditing}
          placeholder="••••••••"
          autoComplete="new-password"
        />

        <label>Address:</label>
        <input
          name="address"
          value={admin.address}
          onChange={handleChange}
          disabled={!isEditing}
        />

        {isEditing ? (
          <button className={styles.saveBtn} onClick={handleSave}>
            Save
          </button>
        ) : (
          <button className={styles.editBtn} onClick={() => setIsEditing(true)}>
            Edit Profile
          </button>
        )}
      </div>
    </div>
  );
};

export default AdminProfile;
