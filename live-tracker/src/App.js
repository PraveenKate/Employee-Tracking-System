// src/App.js
import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import LoginPage from './Components/Login';
import UserPage from './Components/User1';
import AdminPage from './Components/Admin1';
import ManageEmployees from './Components/ManageEmployees';
import AddEmployee from './Components/AddEmployee';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LoginPage />} />
        <Route path="/user" element={<UserPage />} />
        <Route path="/admin" element={<AdminPage />} />
        <Route path="/manageEmployees" element={<ManageEmployees />} />
        <Route path="/addEmployee" element={<AddEmployee />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
