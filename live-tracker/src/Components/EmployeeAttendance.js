
import React, { useEffect, useState, useMemo } from 'react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const RECORDS_PER_PAGE = 5;

const EmployeeAttendance = ({ token }) => {
  const [attendanceData, setAttendanceData] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [userFullAttendance, setUserFullAttendance] = useState([]);
  const [selectedUserName, setSelectedUserName] = useState('');
  const [showFullAttendance, setShowFullAttendance] = useState(false);

  // Pagination state for full attendance
  const [currentPage, setCurrentPage] = useState(1);

  // Search state
  const [searchDate, setSearchDate] = useState('');
  const [searchEmail, setSearchEmail] = useState('');

  // Memoize today's date to prevent re-calculation on every render
  const todayDate = useMemo(() => new Date().toLocaleDateString(), []);

  useEffect(() => {
    // By default, load today's attendance if no search filters applied
    if (!searchDate && !searchEmail) {
      fetchAttendanceToday();
    }
  }, [token, searchDate, searchEmail]);

  const fetchAttendanceToday = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${BACKEND_URL}/attendance/today`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) throw new Error('Failed to fetch attendance');

      const data = await res.json();

      const sortedData = data.sort((a, b) => {
        const timeA = a.loginTime ? new Date(a.loginTime).getTime() : 0;
        const timeB = b.loginTime ? new Date(b.loginTime).getTime() : 0;
        return timeB - timeA;
      });

      setAttendanceData(sortedData);
    } catch (err) {
      setError(err.message);
      setAttendanceData([]);
    } finally {
      setLoading(false);
    }
  };

  // Validate the search date: it should not be in the future and must be a valid date
  const isValidSearchDate = (dateStr) => {
    if (!dateStr) return true; // empty date is valid (means no date filter)
    const inputDate = new Date(dateStr);
    const now = new Date();

    if (isNaN(inputDate.getTime())) return false; // invalid date
    if (inputDate > now) return false; // future date not allowed

    return true;
  };

  // Search attendance by date and/or email
  const handleSearch = async () => {
    if (!isValidSearchDate(searchDate)) {
      setError('Invalid search date. Date cannot be in the future or invalid.');
      return;
    }

    if (!searchDate && !searchEmail) {
      // If no filters, just fetch today's attendance
      fetchAttendanceToday();
      return;
    }

    setLoading(true);
    setError('');
    setShowFullAttendance(false);
    setUserFullAttendance([]);
    setSelectedUserName('');
    setCurrentPage(1);

    try {
      // Build query params
      const params = new URLSearchParams();
      if (searchDate) params.append('date', searchDate);
      if (searchEmail) params.append('email', searchEmail);

      const res = await fetch(`${BACKEND_URL}/attendance/search?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) throw new Error('Failed to fetch attendance for search');

      const data = await res.json();

      // const sortedData = data.sort((a, b) => {
      //   const timeA = a.loginTime ? new Date(a.loginTime).getTime() : 0;
      //   const timeB = b.loginTime ? new Date(b.loginTime).getTime() : 0;
      //   return timeB - timeA;
      // });

      // setAttendanceData(sortedData);
      // Group by userId and keep only latest loginTime
const latestRecords = {};
data.forEach((record) => {
  const userId = record.userId?._id;
  if (!userId) return;
  const currentTime = record.loginTime ? new Date(record.loginTime).getTime() : 0;

  if (
    !latestRecords[userId] ||
    (new Date(latestRecords[userId].loginTime).getTime() || 0) < currentTime
  ) {
    latestRecords[userId] = record;
  }
});

// Convert object to array and sort by latest loginTime
const uniqueLatestRecords = Object.values(latestRecords).sort((a, b) => {
  const timeA = a.loginTime ? new Date(a.loginTime).getTime() : 0;
  const timeB = b.loginTime ? new Date(b.loginTime).getTime() : 0;
  return timeB - timeA;
});

setAttendanceData(uniqueLatestRecords);

    } catch (err) {
      setError(err.message);
      setAttendanceData([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchUserAttendanceHistory = async (userId, userName) => {
    if (showFullAttendance && selectedUserName.trim() === userName.trim()) {
      // Toggle off if clicking same user again
      setShowFullAttendance(false);
      setUserFullAttendance([]);
      setSelectedUserName('');
      setCurrentPage(1);
      return;
    }

    try {
      const res = await fetch(`${BACKEND_URL}/attendance/user/${userId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) throw new Error('Failed to fetch full attendance');

      const data = await res.json();

      setUserFullAttendance(
        data.sort((a, b) => {
          const timeA = a.loginTime ? new Date(a.loginTime).getTime() : 0;
          const timeB = b.loginTime ? new Date(b.loginTime).getTime() : 0;
          return timeB - timeA; // Latest login first
        })
      );
      setSelectedUserName(userName);
      setShowFullAttendance(true);
      setCurrentPage(1);
    } catch (err) {
      alert(err.message);
    }
  };

  // Pagination calculations for full attendance
  const totalPages = Math.ceil(userFullAttendance.length / RECORDS_PER_PAGE);
  const startIdx = (currentPage - 1) * RECORDS_PER_PAGE;
  const currentRecords = userFullAttendance.slice(startIdx, startIdx + RECORDS_PER_PAGE);

  const handlePrevPage = () => {
    if (currentPage > 1) setCurrentPage(currentPage - 1);
  };

  const handleNextPage = () => {
    if (currentPage < totalPages) setCurrentPage(currentPage + 1);
  };

  const cellStyle = {
    padding: '8px',
    border: '1px solid #ccc',
    textAlign: 'center',
  };

  return (
    <div>
      <h2 style={{ textAlign: 'left' }}>
        Today's Employee Attendance - {todayDate}
      </h2>

      {/* Search Inputs */}
      <div style={{ marginBottom: '15px' }}>
        <label style={{ marginRight: '10px' }}>
          Date:{' '}
          <input
            type="date"
            value={searchDate}
            max={new Date().toISOString().split('T')[0]} // prevent future date selection in date picker UI
            onChange={(e) => {
              setError('');
              setSearchDate(e.target.value);
            }}
          />
        </label>
        <label style={{ marginRight: '10px' }}>
          Email:{' '}
          <input
            type="email"
            placeholder="user@example.com"
            value={searchEmail}
            onChange={(e) => setSearchEmail(e.target.value)}
          />
        </label>
        <button onClick={handleSearch} style={{ padding: '5px 15px' }}>
          Search
        </button>
        <button
  onClick={() => {
    setSearchDate('');
    setSearchEmail('');
    setError('');
    setShowFullAttendance(false);      // Hide full history
    setSelectedUserName('');           // Reset selected user        // Optional: clear old data
    fetchAttendanceToday();            // Show only today's attendance
  }}
  style={{ padding: '5px 15px', marginLeft: '10px' }}
>
  Reset
</button>
      </div>

      {loading && (
        <p aria-live="polite" style={{ textAlign: 'center', padding: '10px' }}>
          Loading attendance data...
        </p>
      )}
      {error && (
        <p aria-live="polite" style={{ color: 'red', textAlign: 'center' }}>
          {error}
        </p>
      )}

      {!loading && !error && (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ backgroundColor: '#f0f0f0' }}>
                <th style={cellStyle}>Name</th>
                <th style={cellStyle}>Email</th>
                <th style={cellStyle}>Login Time</th>
                <th style={cellStyle}>Logout Time</th>
                <th style={cellStyle}>All Attendance</th>
              </tr>
            </thead>
            <tbody>
              {attendanceData.length === 0 && (
                <tr>
                  <td colSpan="5" style={{ ...cellStyle, textAlign: 'center' }}>
                    No attendance records found.
                  </td>
                </tr>
              )}
              {attendanceData.map((record) =>
                record.userId ? (
                  <tr key={record._id || Math.random()}>
                    <td style={cellStyle}>{record.userId.name || 'N/A'}</td>
                    <td style={cellStyle}>{record.userId.email || 'N/A'}</td>
                    <td style={cellStyle}>
                      {record.loginTime ? new Date(record.loginTime).toLocaleTimeString() : '-'}
                    </td>
                    <td style={cellStyle}>
                      {record.logoutTime ? new Date(record.logoutTime).toLocaleTimeString() : '-'}
                    </td>
                    <td style={cellStyle}>
                      <button
                        style={{
                          backgroundColor:
                            showFullAttendance && selectedUserName.trim() === record.userId.name.trim()
                              ? 'red'
                              : 'green',
                          color: 'white',
                          border: 'none',
                          padding: '5px 10px',
                          cursor: 'pointer',
                          transition: 'background-color 0.3s',
                        }}
                        onMouseOver={(e) =>
                          (e.target.style.backgroundColor =
                            showFullAttendance && selectedUserName.trim() === record.userId.name.trim()
                              ? '#8B0000'
                              : '#006400')
                        }
                                                onMouseOut={(e) =>
                          (e.target.style.backgroundColor =
                            showFullAttendance && selectedUserName.trim() === record.userId.name.trim()
                              ? 'red'
                              : 'green')
                        }
                        onClick={() => fetchUserAttendanceHistory(record.userId._id, record.userId.name)}
                      >
                        {showFullAttendance && selectedUserName.trim() === record.userId.name.trim()
                          ? 'Hide'
                          : 'View'}
                      </button>
                    </td>
                  </tr>
                ) : null
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Full Attendance Section with Pagination */}
      {showFullAttendance && (
        <div style={{ marginTop: '20px' }}>
          <h3>
            Full Attendance for: <span style={{ color: 'green' }}>{selectedUserName}</span>
          </h3>
          {currentRecords.length > 0 ? (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ backgroundColor: '#f9f9f9' }}>
                    <th style={cellStyle}>Date</th>
                    <th style={cellStyle}>Login Time</th>
                    <th style={cellStyle}>Logout Time</th>
                  </tr>
                </thead>
                <tbody>
                  {currentRecords.map((entry, idx) => (
                    <tr key={idx}>
                      <td style={cellStyle}>
                        {entry.loginTime
                          ? new Date(entry.loginTime).toLocaleDateString()
                          : '-'}
                      </td>
                      <td style={cellStyle}>
                        {entry.loginTime
                          ? new Date(entry.loginTime).toLocaleTimeString()
                          : '-'}
                      </td>
                      <td style={cellStyle}>
                        {entry.logoutTime
                          ? new Date(entry.logoutTime).toLocaleTimeString()
                          : '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {/* Pagination Controls */}
              <div style={{ marginTop: '10px', textAlign: 'center' }}>
                <button
                  onClick={handlePrevPage}
                  disabled={currentPage === 1}
                  style={{ padding: '5px 10px', marginRight: '10px' }}
                >
                  Prev
                </button>
                <span>
                  Page {currentPage} of {totalPages}
                </span>
                <button
                  onClick={handleNextPage}
                  disabled={currentPage === totalPages}
                  style={{ padding: '5px 10px', marginLeft: '10px' }}
                >
                  Next
                </button>
              </div>
            </div>
          ) : (
            <p>No attendance records found for {selectedUserName}.</p>
          )}
        </div>
      )}
    </div>
  );
};

export default EmployeeAttendance;
