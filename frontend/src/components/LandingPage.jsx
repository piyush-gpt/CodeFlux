import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Code, Zap, Users, Terminal, ArrowRight } from 'lucide-react';

const LandingPage = () => {
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-black text-white">
      
      <nav className="container mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Code className="h-8 w-8 text-blue-500" />
            <span className="text-2xl font-bold">CodeFlux</span>
          </div>
          <div className="flex items-center space-x-6">
            <Link to="/login" className="hover:text-blue-400 transition-colors">Login</Link>
            <Link to="/signup" className="bg-blue-500 hover:bg-blue-600 px-4 py-2 rounded-lg transition-colors">
              Get Started
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="container mx-auto px-6 py-20">
        <div className="flex flex-col items-center text-center">
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-5xl md:text-7xl font-bold mb-6"
          >
            Code, Collaborate, <span className="text-blue-500">Create</span>
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-xl text-gray-400 mb-8 max-w-2xl"
          >
            The next-generation coding platform that brings developers together. 
            Write, run, and share code in real-time with your team.
          </motion.p>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <Link 
              to="/signup" 
              className="bg-blue-500 hover:bg-blue-600 px-8 py-4 rounded-lg text-lg font-semibold inline-flex items-center space-x-2 transition-colors"
            >
              <span>Start Coding Now</span>
              <ArrowRight className="h-5 w-5" />
            </Link>
          </motion.div>
        </div>
      </section>

      {/* Features Section */}
      <section className="container mx-auto px-6 py-20">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            className="bg-gray-800 p-8 rounded-xl"
          >
            <Zap className="h-12 w-12 text-blue-500 mb-4" />
            <h3 className="text-xl font-semibold mb-2">Lightning Fast</h3>
            <p className="text-gray-400">Instant code execution and real-time collaboration with minimal latency.</p>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-gray-800 p-8 rounded-xl"
          >
            <Users className="h-12 w-12 text-blue-500 mb-4" />
            <h3 className="text-xl font-semibold mb-2">Team Collaboration</h3>
            <p className="text-gray-400">Work together seamlessly with real-time code sharing and pair programming.</p>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="bg-gray-800 p-8 rounded-xl"
          >
            <Terminal className="h-12 w-12 text-blue-500 mb-4" />
            <h3 className="text-xl font-semibold mb-2">Powerful IDE</h3>
            <p className="text-gray-400">Full-featured development environment with syntax highlighting and debugging.</p>
          </motion.div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="container mx-auto px-6 py-20">
        <div className="bg-gradient-to-r from-blue-600 to-blue-800 rounded-2xl p-12 text-center">
          <h2 className="text-3xl font-bold mb-4">Ready to Transform Your Coding Experience?</h2>
          <p className="text-xl text-blue-100 mb-8">Join thousands of developers already using CodeFlux</p>
          <Link 
            to="/signup" 
            className="bg-white text-blue-600 hover:bg-blue-50 px-8 py-4 rounded-lg text-lg font-semibold inline-flex items-center space-x-2 transition-colors"
          >
            <span>Get Started for Free</span>
            <ArrowRight className="h-5 w-5" />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="container mx-auto px-6 py-8 border-t border-gray-800">
        <div className="flex flex-col md:flex-row justify-between items-center">
          <div className="flex items-center space-x-2 mb-4 md:mb-0">
            <Code className="h-6 w-6 text-blue-500" />
            <span className="text-xl font-bold">CodeFlux</span>
          </div>
          <div className="text-gray-400 text-sm">
            © 2024 CodeFlux. All rights reserved.
          </div>
    </div>
      </footer>
  </div>
);
};

export default LandingPage;
