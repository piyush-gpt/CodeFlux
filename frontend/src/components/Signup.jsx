import React, { useState } from 'react';
import api from '../api';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
const Signup = () => {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const { setUser } = useAuth();
  const navigate = useNavigate();

  const handleSignup = async () => {
    const res = await api.post('/api/auth/signup', { username, email, password });
    if (res.data.success){
      setUser(res.data.user);
      navigate('/dashboard');
    } 
  };

  return (
    <div className="min-h-screen flex flex-col justify-center items-center bg-white p-6">
      <h2 className="text-3xl font-bold text-gray-800 mb-4">Signup</h2>
      <input className="mb-3 p-2 border rounded w-64" placeholder="Username" value={username} onChange={e => setUsername(e.target.value)} />
      <input className="mb-3 p-2 border rounded w-64" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} />
      <input className="mb-3 p-2 border rounded w-64" placeholder="Password" type="password" value={password} onChange={e => setPassword(e.target.value)} />
      <button className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600" onClick={handleSignup}>Signup</button>
    </div>
  );
};

export default Signup;