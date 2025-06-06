import React from 'react';
import { Link } from 'react-router-dom';

const Login = () => {
  return (
    <div style={{ textAlign: 'center', marginTop: 50 }}>
      <h1>Login</h1>
      <p>
        <Link to="/user">User Login</Link>
      </p>
      <p>
        <Link to="/admin">Admin Login</Link>
      </p>
    </div>
  );
};

export default Login;
