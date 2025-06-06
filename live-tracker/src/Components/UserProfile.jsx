import React, { useEffect, useState } from 'react';
import styles from '../Styles/AdminProfile.module.css'; // or reuse AdminProfile.module.css if you want

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL; // change if needed

const UserProfile = ({ token }) => {
  const [user, setUser] = useState({
    name: '',
    email: '',
    phone: '',
    password: '', // for new password input only
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
      const response = await fetch(`${BACKEND_URL}/user/profile`, {
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
      setUser({ ...data, password: '' });
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
    setUser((prev) => ({ ...prev, [name]: value }));
    setMessage('');
  };

  const handleSave = async () => {
    if (!token) {
      setMessage('No authorization token found.');
      return;
    }

    try {
      const updateData = { ...user };
      if (!updateData.password) {
        delete updateData.password; // avoid sending empty password
      }

      const response = await fetch(`${BACKEND_URL}/user/profile`, {
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
      <h2 className={styles.heading}>User Profile</h2>
      {message && <p className={styles.message}>{message}</p>}

      <div className={styles.form}>
        <label>Name:</label>
        <input
          name="name"
          value={user.name}
          onChange={handleChange}
          disabled={!isEditing}
        />

        <label>Email:</label>
        <input
          name="email"
          type="email"
          value={user.email}
          onChange={handleChange}
          disabled={!isEditing}
        />

        

        <label>Password:</label>
        <input
          name="password"
          type="password"
          value={user.password}
          onChange={handleChange}
          disabled={!isEditing}
          placeholder="••••••••"
          autoComplete="new-password"
        />

        <label>Address:</label>
        <input
          name="address"
          value={user.address}
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

export default UserProfile;
