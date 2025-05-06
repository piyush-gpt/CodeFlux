import React, { useState } from 'react';
import api from '../api';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const navigate = useNavigate();
  const { setUser } = useAuth();
  const handleLogin = async () => {
    try {
      const res = await api.post('/api/auth/login', { email, password });
      if (res.data.success) {
        // Store user data including ID
        setUser(res.data.user);
        navigate('/dashboard');
      }
    } catch (error) {
      console.error('Login failed:', error);
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-center items-center bg-white p-6">
      <h2 className="text-3xl font-bold text-gray-800 mb-4">Login</h2>
      <input className="mb-3 p-2 border rounded w-64" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} />
      <input className="mb-3 p-2 border rounded w-64" placeholder="Password" type="password" value={password} onChange={e => setPassword(e.target.value)} />
      <button className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600" onClick={handleLogin}>Login</button>
    </div>
  );
};

export default Login;