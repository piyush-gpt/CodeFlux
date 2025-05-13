const Repl = require('../models/Repl');

const replAuth = async (req, res, next) => {
  try {
    const { id } = req.params; 
    const userId = req.user.id;

    const repl = await Repl.findById(id);

    if (!repl) {
      return res.status(404).json({ success: false, message: 'REPL not found' });
    }

    if (repl.creator.toString() !== userId && !repl.collaborators.includes(userId)) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    req.repl = repl; // Attach REPL to the request object
    next();
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

module.exports = replAuth;