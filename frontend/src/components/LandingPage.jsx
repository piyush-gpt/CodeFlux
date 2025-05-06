import React from 'react';
import { Link } from 'react-router-dom';

const LandingPage = () => (
  <div className="min-h-screen flex flex-col justify-center items-center bg-gradient-to-br from-blue-100 to-purple-200 text-center p-6">
    <h1 className="text-5xl font-bold text-gray-800 mb-4">Welcome to Your Coding Playground</h1>
    <p className="text-lg text-gray-600 mb-6">Create, edit, and run code from anywhere, anytime.</p>
    <div className="space-x-4">
      <Link to="/login" className="px-6 py-2 bg-blue-600 text-white rounded-xl shadow hover:bg-blue-700">Login</Link>
      <Link to="/signup" className="px-6 py-2 bg-green-600 text-white rounded-xl shadow hover:bg-green-700">Signup</Link>
      <Link to="/dashboard" className="px-6 py-2 bg-gray-600 text-white rounded-xl shadow hover:bg-gray-700">Dashboard</Link>
    </div>
  </div>
);


export default LandingPage;
