const mongoose = require('mongoose');

const replSchema = new mongoose.Schema({
  name: { 
    type: String, 
    required: true 
  },
  creator: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User',
    required: true 
  },
  description: {
    type: String,
    default: ''
  },
  language: {
    type: String,
    required: true
  },
  collaborators: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  
  createdAt: { 
    type: Date, 
    default: Date.now 
  },
});


const Repl = mongoose.model('Repl', replSchema);

module.exports = Repl; 