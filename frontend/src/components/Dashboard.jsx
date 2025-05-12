import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Code, 
  Plus, 
  Folder, 
  Settings, 
  LogOut, 
  Search,
  Bell,
  User,
  Terminal,
  FileCode,
  Users,
  X,
  Trash2,
  UserPlus,
  Users as UsersIcon
} from 'lucide-react';
import api from '../api';

const Dashboard = () => {
  const [repls, setRepls] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newRepl, setNewRepl] = useState({ name: '', language: 'python', description: '' });
  const { user, logout } = useAuth();
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [selectedReplId, setSelectedReplId] = useState(null);
  const [showCollaboratorsModal, setShowCollaboratorsModal] = useState(false);
  const [selectedRepl, setSelectedRepl] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

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

  const handleRemoveCollaborator = async (replId, collaboratorId) => {
    try {
      const response = await api.delete(`/api/repls/${replId}/collaborators/${collaboratorId}`);
      if (response.data.success) {
        setRepls(prevRepls => 
          prevRepls.map(repl => {
            if (repl._id === replId) {
              return {
                ...repl,
                collaborators: repl.collaborators.filter(c => c._id !== collaboratorId)
              };
            }
            return repl;
          })
        );
        if (collaboratorId === user._id) {
          setRepls(prevRepls => prevRepls.filter(repl => repl._id !== replId));
        }
        alert(response.data.message);
      }
    } catch (error) {
      console.error('Error removing collaborator:', error);
      alert('Failed to remove collaborator');
    }
  };

  const languages = [
    { value: 'python', label: 'Python', color: 'bg-blue-500' },
    { value: 'cpp', label: 'C++', color: 'bg-purple-500' },
    { value: 'reactjs', label: 'ReactJS', color: 'bg-green-500' }
  ];

  const filteredRepls = repls.filter(repl => 
    repl.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    repl.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white flex">
      {/* Sidebar */}
      <motion.div
        initial={{ x: -100, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        className="w-64 bg-gray-800 p-6 flex flex-col"
      >
        <div className="flex items-center space-x-2 mb-8">
          <Code className="h-8 w-8 text-blue-500" />
          <span className="text-xl font-bold">CodeFlux</span>
        </div>

        <nav className="space-y-2 flex-grow">
          <button
            className="w-full flex items-center space-x-3 px-4 py-3 rounded-lg bg-blue-500 text-white"
          >
            <Folder className="h-5 w-5" />
            <span>Projects</span>
          </button>

          <button
            className="w-full flex items-center space-x-3 px-4 py-3 rounded-lg text-gray-400 hover:bg-gray-700 transition-colors"
          >
            <Users className="h-5 w-5" />
            <span>Collaborations</span>
          </button>

          <button
            className="w-full flex items-center space-x-3 px-4 py-3 rounded-lg text-gray-400 hover:bg-gray-700 transition-colors"
          >
            <FileCode className="h-5 w-5" />
            <span>Recent Files</span>
          </button>
        </nav>

        <div className="space-y-2">
          <button className="w-full flex items-center space-x-3 px-4 py-3 rounded-lg text-gray-400 hover:bg-gray-700 transition-colors">
            <Settings className="h-5 w-5" />
            <span>Settings</span>
          </button>
          <button 
            onClick={() => {
              logout();
              navigate('/login');
            }}
            className="w-full flex items-center space-x-3 px-4 py-3 rounded-lg text-gray-400 hover:bg-gray-700 transition-colors"
          >
            <LogOut className="h-5 w-5" />
            <span>Logout</span>
          </button>
        </div>
      </motion.div>

      {/* Main Content */}
      <div className="flex-grow p-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center space-x-4">
            <h1 className="text-2xl font-bold">My Projects</h1>
            <button
              onClick={() => setShowCreateModal(true)}
              className="bg-blue-500 hover:bg-blue-600 px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors"
            >
              <Plus className="h-5 w-5" />
              <span>New Project</span>
            </button>
          </div>
          <div className="flex items-center space-x-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search projects..."
                className="bg-gray-800 border border-gray-700 rounded-lg py-2 pl-10 pr-4 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <button className="p-2 text-gray-400 hover:text-white transition-colors">
              <Bell className="h-6 w-6" />
            </button>
            <button className="p-2 text-gray-400 hover:text-white transition-colors">
              <User className="h-6 w-6" />
            </button>
          </div>
        </div>

        {/* Projects Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredRepls.map((repl) => (
            <motion.div
              key={repl._id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-gray-800 rounded-xl p-6 hover:bg-gray-750 transition-colors cursor-pointer"
            >
              <div 
                onClick={() => navigate(`/repl/${repl._id}/${repl.language}`)}
                className="cursor-pointer"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-blue-500/10 rounded-lg">
                      <Terminal className="h-5 w-5 text-blue-500" />
                    </div>
                    <h3 className="font-semibold">{repl.name}</h3>
                  </div>
                </div>
                <p className="text-gray-400 text-sm mb-4 line-clamp-2">
                  {repl.description || 'No description'}
                </p>
                <div className="flex items-center text-sm text-gray-400">
                  <span className="px-2 py-1 bg-gray-700 rounded text-xs">
                    {languages.find(l => l.value === repl.language)?.label}
                  </span>
                  <span className="mx-2">•</span>
                  <span>Created {new Date(repl.createdAt).toLocaleDateString()}</span>
                </div>
              </div>
              
              <div className="mt-4 flex gap-2">
                {!repl.isCollaborator && (
                  <>
                    <button
                      onClick={() => {
                        setSelectedRepl(repl);
                        setShowCollaboratorsModal(true);
                      }}
                      className="text-xs bg-gray-700 text-gray-300 px-2 py-1 rounded hover:bg-gray-600 transition-colors flex items-center space-x-1"
                    >
                      <UsersIcon className="h-3 w-3" />
                      <span>Collaborators</span>
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedReplId(repl._id);
                        setShowInviteModal(true);
                      }}
                      className="text-xs bg-blue-500/10 text-blue-400 px-2 py-1 rounded hover:bg-blue-500/20 transition-colors flex items-center space-x-1"
                    >
                      <UserPlus className="h-3 w-3" />
                      <span>Invite</span>
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteRepl(repl._id);
                      }}
                      className="text-xs bg-red-500/10 text-red-400 px-2 py-1 rounded hover:bg-red-500/20 transition-colors flex items-center space-x-1"
                    >
                      <Trash2 className="h-3 w-3" />
                      <span>Delete</span>
                    </button>
                  </>
                )}
                {repl.isCollaborator && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRemoveCollaborator(repl._id, user._id);
                    }}
                    className="text-xs bg-red-500/10 text-red-400 px-2 py-1 rounded hover:bg-red-500/20 transition-colors flex items-center space-x-1"
                  >
                    <LogOut className="h-3 w-3" />
                    <span>Leave</span>
                  </button>
                )}
              </div>
            </motion.div>
          ))}

          {/* New Project Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            onClick={() => setShowCreateModal(true)}
            className="bg-gray-800/50 border-2 border-dashed border-gray-700 rounded-xl p-6 hover:bg-gray-750 transition-colors cursor-pointer flex items-center justify-center"
          >
            <div className="text-center">
              <div className="bg-blue-500/10 rounded-full p-3 inline-block mb-3">
                <Plus className="h-6 w-6 text-blue-500" />
              </div>
              <h3 className="font-semibold text-gray-400">Create New Project</h3>
            </div>
          </motion.div>
        </div>
        </div>

      {/* Create Project Modal */}
      <AnimatePresence>
        {showCreateModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-gray-800 rounded-2xl p-6 max-w-md w-full"
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold">Create New Project</h2>
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <form onSubmit={handleCreateRepl} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">
                    Project Name
                  </label>
                  <input
                    type="text"
                    value={newRepl.name}
                    onChange={(e) => setNewRepl({ ...newRepl, name: e.target.value })}
                    className="w-full bg-gray-700 border border-gray-600 rounded-lg py-2 px-4 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Enter project name"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">
                    Language
                  </label>
                  <select
                    value={newRepl.language}
                    onChange={(e) => setNewRepl({ ...newRepl, language: e.target.value })}
                    className="w-full bg-gray-700 border border-gray-600 rounded-lg py-2 px-4 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    {languages.map((lang) => (
                      <option key={lang.value} value={lang.value}>
                        {lang.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">
                    Description (optional)
                  </label>
                  <textarea
                    value={newRepl.description}
                    onChange={(e) => setNewRepl({ ...newRepl, description: e.target.value })}
                    className="w-full bg-gray-700 border border-gray-600 rounded-lg py-2 px-4 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Enter project description"
                    rows="3"
                  />
                </div>

                <div className="flex justify-end space-x-3 mt-6">
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(false)}
                    className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors"
                  >
                    Create Project
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Invite Collaborator Modal */}
      <AnimatePresence>
        {showInviteModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-gray-800 rounded-2xl p-6 max-w-md w-full"
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold">Invite Collaborator</h2>
                <button
                  onClick={() => setShowInviteModal(false)}
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <form onSubmit={(e) => {
                e.preventDefault();
                handleInviteCollaborator(selectedReplId);
              }} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">
                    Email Address
                  </label>
              <input
                type="email"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                    className="w-full bg-gray-700 border border-gray-600 rounded-lg py-2 px-4 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter collaborator's email"
                    required
              />
                </div>

                <div className="flex justify-end space-x-3 mt-6">
                <button
                    type="button"
                  onClick={() => setShowInviteModal(false)}
                    className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
                >
                  Cancel
                </button>
                <button
                    type="submit"
                    className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors"
                >
                    Send Invitation
                </button>
              </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

        {/* Collaborators Modal */}
      <AnimatePresence>
        {showCollaboratorsModal && selectedRepl && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-gray-800 rounded-2xl p-6 max-w-md w-full"
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold">Project Collaborators</h2>
                <button
                  onClick={() => setShowCollaboratorsModal(false)}
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="space-y-4">
                {selectedRepl.collaborators?.map((collaborator) => (
                  <div key={collaborator._id} className="flex items-center justify-between bg-gray-700/50 p-3 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-blue-500/10 rounded-full flex items-center justify-center">
                        <User className="h-4 w-4 text-blue-500" />
                      </div>
                    <div>
                      <p className="font-medium">{collaborator.username}</p>
                        <p className="text-sm text-gray-400">{collaborator.email}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => handleRemoveCollaborator(selectedRepl._id, collaborator._id)}
                      className="text-red-400 hover:text-red-300 transition-colors"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>

              <div className="mt-6 flex justify-end">
                <button
                  onClick={() => setShowCollaboratorsModal(false)}
                  className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Dashboard;