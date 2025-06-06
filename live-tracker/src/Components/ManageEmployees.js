
import React, { useEffect, useState } from "react";
import { Plus, Edit2, Trash2 } from "lucide-react";
import styles from "../Styles/EmployeeManagement.module.css";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

const ManageEmployees = ({ token, onAddEmployeeClick }) => {
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editingEmployee, setEditingEmployee] = useState(null);
  const [formData, setFormData] = useState({ name: '', email: '', address: '', salary: '' });

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  useEffect(() => {
    const fetchEmployees = async () => {
      if (!token) {
        setError('Not authorized: no token found');
        setLoading(false);
        return;
      }
      try {
        const res = await fetch(`${BACKEND_URL}/admin/users`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error('Failed to fetch employees');
        const data = await res.json();
        setEmployees(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchEmployees();
  }, [token]);

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this employee?")) return;
    try {
      const res = await fetch(`${BACKEND_URL}/admin/users/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Delete failed');

      setEmployees(prev => prev.filter(emp => emp._id !== id));
      // Adjust page if current page becomes empty after deletion
      if ((currentPage - 1) * itemsPerPage >= employees.length - 1) {
        setCurrentPage(prev => Math.max(prev - 1, 1));
      }
    } catch (err) {
      alert("Failed to delete employee");
    }
  };

  const handleEditClick = (emp) => {
    setEditingEmployee(emp._id);
    setFormData({ name: emp.name, email: emp.email, address: emp.address || '', salary: emp.salary || '' });
  };

  const handleFormChange = (e) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch(`${BACKEND_URL}/admin/users/${editingEmployee}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(formData),
      });
      if (!res.ok) throw new Error('Update failed');

      const updatedUser = await res.json();
      setEmployees(prev =>
        prev.map(emp => (emp._id === updatedUser._id ? updatedUser : emp))
      );
      setEditingEmployee(null);
      setFormData({ name: '', email: '', address: '', salary: '' });
    } catch (err) {
      alert("Failed to update employee");
    }
  };

  const handleCancelEdit = () => {
    setEditingEmployee(null);
    setFormData({ name: '', email: '', address: '', salary: '' });
  };

  // Pagination calculations
  const totalPages = Math.ceil(employees.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const currentEmployees = editingEmployee
    ? employees.filter(emp => emp._id === editingEmployee)
    : employees.slice(startIndex, startIndex + itemsPerPage);

  if (loading) return <p>Loading employees...</p>;
  if (error) return <p className={styles.errorText}>Error: {error}</p>;

  return (
    <>
      <div className={styles.flexBetween}>
        <h2 className={styles.title}>Employee List</h2>
        <button className={styles.btnGreen} onClick={onAddEmployeeClick}>
          <Plus size={16} /> Add Employee
        </button>
      </div>

      <table className={styles.table}>
        <thead className={styles.thead}>
          <tr>
            <th className={styles.th}>User Id</th>
            <th className={styles.th}>Name</th>
            <th className={styles.th}>Email</th>
            <th className={styles.th}>Address</th>
            <th className={styles.th}>Salary</th>
            <th className={styles.th}>Action</th>
          </tr>
        </thead>
        <tbody>
          {currentEmployees.map((emp) => (
            <tr key={emp._id} className={styles.trEven}>
              <td className={styles.td}>{emp._id}</td>
              <td className={styles.td}>
                {editingEmployee === emp._id ? (
                  <input
                    className={styles.fixedWidthInput}
                    name="name"
                    value={formData.name}
                    onChange={handleFormChange}
                  />
                ) : (
                  emp.name
                )}
              </td>
              <td className={styles.td}>
                {editingEmployee === emp._id ? (
                  <input
                    className={styles.fixedWidthInput}
                    name="email"
                    value={formData.email}
                    onChange={handleFormChange}
                  />
                ) : (
                  emp.email
                )}
              </td>
              <td className={styles.td}>
                {editingEmployee === emp._id ? (
                  <input
                    className={styles.fixedWidthInput}
                    name="address"
                    value={formData.address}
                    onChange={handleFormChange}
                  />
                ) : (
                  emp.address || 'N/A'
                )}
              </td>
              <td className={styles.td}>
                {editingEmployee === emp._id ? (
                  <input
                    className={styles.fixedWidthInput}
                    name="salary"
                    value={formData.salary}
                    onChange={handleFormChange}
                  />
                ) : (
                  emp.salary || 'N/A'
                )}
              </td>
              <td className={`${styles.td} ${styles.actionButtons}`}>
                {editingEmployee === emp._id ? (
                  <>
                    <button
                      className={styles.btnGreen}
                      onClick={handleEditSubmit}
                    >
                      Save
                    </button>
                    <button
                      className={styles.btnRed}
                      onClick={handleCancelEdit}
                    >
                      Cancel
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      className={styles.btnCyan}
                      onClick={() => handleEditClick(emp)}
                    >
                      <Edit2 size={14} /> Edit
                    </button>
                    <button
                      className={styles.btnRed}
                      onClick={() => handleDelete(emp._id)}
                    >
                      <Trash2 size={14} /> Delete
                    </button>
                  </>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Pagination Controls */}
      {!editingEmployee && (
        <div className={styles.pagination}>
          <button
            className={styles.btn}
            onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
            disabled={currentPage === 1}
          >
            Previous
          </button>
          <span className={styles.pageInfo}>
            Page {currentPage} of {totalPages}
          </span>
          <button
            className={styles.btn}
            onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
            disabled={currentPage === totalPages}
          >
            Next
          </button>
        </div>
      )}
    </>
  );
};

export default ManageEmployees;
