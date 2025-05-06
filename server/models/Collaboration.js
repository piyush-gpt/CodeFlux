const mongoose = require('mongoose');

const collaborationSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  repl: { type: mongoose.Schema.Types.ObjectId, ref: 'Repl', required: true },
});

const Collaboration = mongoose.model('Collaboration', collaborationSchema);

module.exports = Collaboration;