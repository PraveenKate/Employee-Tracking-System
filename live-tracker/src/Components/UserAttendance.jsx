import React, { useEffect, useState } from 'react';
import styles from '../Styles/UserAttendance.module.css';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const RECORDS_PER_PAGE = 7;

const UserAttendance = ({ token }) => {
  const [attendanceHistory, setAttendanceHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    const fetchAttendance = async () => {
      try {
        const res = await fetch(`${BACKEND_URL}/attendance/me`, {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!res.ok) {
          throw new Error('Failed to fetch attendance');
        }

        const data = await res.json();

        // Sort descending by loginTime (latest login first)
        setAttendanceHistory(
          data.sort((a, b) => {
            const timeA = a.loginTime ? new Date(a.loginTime).getTime() : 0;
            const timeB = b.loginTime ? new Date(b.loginTime).getTime() : 0;
            return timeB - timeA;
          })
        );
      } catch (err) {
        setError(err.message || 'Something went wrong');
      } finally {
        setLoading(false);
      }
    };

    if (token) {
      fetchAttendance();
    } else {
      setError('No token provided');
      setLoading(false);
    }
  }, [token]);

  const totalPages = Math.ceil(attendanceHistory.length / RECORDS_PER_PAGE);

  const startIdx = (currentPage - 1) * RECORDS_PER_PAGE;
  const currentRecords = attendanceHistory.slice(startIdx, startIdx + RECORDS_PER_PAGE);

  const handlePrevPage = () => {
    if (currentPage > 1) setCurrentPage(currentPage - 1);
  };

  const handleNextPage = () => {
    if (currentPage < totalPages) setCurrentPage(currentPage + 1);
  };

  if (loading) return <p className={styles.center}>Loading attendance...</p>;
  if (error) return <p className={`${styles.center} ${styles.error}`}>{error}</p>;

  return (
    <div className={styles.container}>
      <h2 className={styles.title}>My Attendance History</h2>
      <table className={styles.table}>
        <thead>
          <tr>
            <th>Date</th>
            <th>Login Time</th>
            <th>Logout Time</th>
          </tr>
        </thead>
        <tbody>
          {currentRecords.map((record) => (
            <tr key={record._id}>
              <td>{new Date(record.date).toLocaleDateString()}</td>
              <td>{record.loginTime ? new Date(record.loginTime).toLocaleTimeString() : 'N/A'}</td>
              <td>{record.logoutTime ? new Date(record.logoutTime).toLocaleTimeString() : 'N/A'}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {totalPages > 1 && (
        <div className={styles.pagination}>
          <button onClick={handlePrevPage} disabled={currentPage === 1} className={styles.pageButton}>
            &lt; Prev
          </button>
          <span className={styles.pageInfo}>
            Page {currentPage} of {totalPages}
          </span>
          <button onClick={handleNextPage} disabled={currentPage === totalPages} className={styles.pageButton}>
            Next &gt;
          </button>
        </div>
      )}
    </div>
  );
};

export default UserAttendance;
