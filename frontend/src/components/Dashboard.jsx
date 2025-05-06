import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api';

const Dashboard = () => {
  const [repls, setRepls] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newRepl, setNewRepl] = useState({ name: '', language: 'javascript', description: '' });
  const { user } = useAuth();
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [selectedReplId, setSelectedReplId] = useState(null);


  const navigate = useNavigate();

  useEffect(() => {
    fetchRepls();
  }, []);

  const fetchRepls = async () => {
    try {
      const response = await api.get('/api/repls');
      setRepls(response.data.repls);
    } catch (error) {
      console.error('Failed to fetch REPLs:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateRepl = async (e) => {
    e.preventDefault();
    try {
      const response = await api.post('/api/repls', newRepl);
      if (response.data.success) {
        setRepls([...repls, response.data.repl]);
        setShowCreateModal(false);
        setNewRepl({ name: '', language: 'javascript', description: '' });
      }
    } catch (error) {
      console.error('Failed to create REPL:', error);
    }
  };
  const handleDeleteRepl = async (replId) => {
    const confirmed = window.confirm('Are you sure you want to delete this REPL?');
    if (!confirmed) return;

    try {
      const response = await api.delete(`/api/repls/${replId}`);
      if (response.data.success) {
        setRepls((prev) => prev.filter((repl) => repl._id !== replId));
      } else {
        alert('Failed to delete REPL');
      }
    } catch (error) {
      console.error('Failed to delete REPL:', error);
      alert('An error occurred while deleting the REPL');
    }
  };

  const handleInviteCollaborator = async (replId) => {
    try {
      const response = await api.post(`/api/repls/${replId}/add-collaborator`, { email: inviteEmail });
      if (response.data.success) {
        alert('Collaborator added successfully');
        setShowInviteModal(false);
        setInviteEmail('');
      } else {
        alert('Failed to add collaborator');
      }
    } catch (error) {
      console.error('Error inviting collaborator:', error);
      alert('An error occurred while inviting the collaborator');
    }
  };

  const languages = [
    { value: 'javascript', label: 'JavaScript', color: 'bg-yellow-500' },
    { value: 'python', label: 'Python', color: 'bg-blue-500' },
    { value: 'java', label: 'Java', color: 'bg-red-500' },
    { value: 'cpp', label: 'C++', color: 'bg-purple-500' },
    { value: 'reactjs', label: 'ReactJS', color: 'bg-green-500' }
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8 flex justify-between items-center">
          <h1 className="text-3xl font-bold text-gray-900">My REPLs</h1>
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors flex items-center"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
            </svg>
            New REPL
          </button>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        {/* REPL Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {repls.map((repl) => (
            <div
              key={repl._id}
              onClick={() => navigate(`/repl/${repl._id}/${repl.language}`)}
              className="bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow cursor-pointer p-6 relative"
            >
              <div className="flex items-center mb-4">
                <div className={`w-3 h-3 rounded-full ${languages.find(l => l.value === repl.language)?.color || 'bg-gray-500'} mr-2`}></div>
                <h2 className="text-xl font-semibold text-gray-900">{repl.name}</h2>
              </div>
              <p className="text-gray-600 text-sm mb-4 line-clamp-2">{repl.description || 'No description'}</p>
              <div className="flex justify-between items-center text-sm text-gray-500">
                <span>Created {new Date(repl.createdAt).toLocaleDateString()}</span>
                <span>{languages.find(l => l.value === repl.language)?.label}</span>
              </div>
              {repl.isCollaborator && (
                <span className="absolute top-2 right-2 text-xs bg-blue-100 text-blue-600 px-2 py-1 rounded">
                  Collaborator
                </span>
              )}
              {!repl.isCollaborator && (
                <>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteRepl(repl._id);
                    }}
                    className="absolute top-2 right-2 text-xs bg-red-100 text-red-600 px-2 py-1 rounded hover:bg-red-200"
                  >
                    Delete
                  </button>
                  <button
                     onClick={(e) => {
                      e.stopPropagation();
                      setSelectedReplId(repl._id);
                      setShowInviteModal(true);
                    }}
                    className="absolute top-2 left-2 text-xs bg-blue-100 text-blue-600 px-2 py-1 rounded hover:bg-blue-200"
                  >
                    Invite
                  </button>
                </>
              )}
            </div>
          ))}
        </div>

        {/* Create REPL Modal */}
        {showCreateModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-lg max-w-md w-full p-6">
              <h2 className="text-2xl font-bold mb-4">Create New REPL</h2>
              <form onSubmit={handleCreateRepl}>
                <div className="mb-4">
                  <label className="block text-gray-700 text-sm font-bold mb-2">
                    Name
                  </label>
                  <input
                    type="text"
                    value={newRepl.name}
                    onChange={(e) => setNewRepl({ ...newRepl, name: e.target.value })}
                    className="w-full p-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
                <div className="mb-4">
                  <label className="block text-gray-700 text-sm font-bold mb-2">
                    Language
                  </label>
                  <select
                    value={newRepl.language}
                    onChange={(e) => setNewRepl({ ...newRepl, language: e.target.value })}
                    className="w-full p-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {languages.map((lang) => (
                      <option key={lang.value} value={lang.value}>
                        {lang.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="mb-4">
                  <label className="block text-gray-700 text-sm font-bold mb-2">
                    Description (optional)
                  </label>
                  <textarea
                    value={newRepl.description}
                    onChange={(e) => setNewRepl({ ...newRepl, description: e.target.value })}
                    className="w-full p-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    rows="3"
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(false)}
                    className="px-4 py-2 text-gray-600 hover:text-gray-800"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                  >
                    Create REPL
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
        {showInviteModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-lg max-w-md w-full p-6">
              <h2 className="text-2xl font-bold mb-4">Invite Collaborator</h2>
              <input
                type="email"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                placeholder="Enter collaborator's email"
                className="w-full p-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 mb-4"
              />
              <div className="flex justify-end gap-2">
                <button
                  onClick={() => setShowInviteModal(false)}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleInviteCollaborator(selectedReplId)}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  Invite
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default Dashboard;