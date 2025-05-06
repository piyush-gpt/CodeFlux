const express = require('express');
const router = express.Router();
const Repl = require('../models/Repl');
const auth = require('../middleware/authMiddleware');
const User = require('../models/User');
const Collaboration = require('../models/Collaboration');
const { copyS3Folder, deleteFromS3 } = require('../s3');

// Get all REPLs for the user
router.get('/', auth, async (req, res) => {
  try {
    const ownedRepls = await Repl.find({ creator: req.user.id }).sort({ createdAt: -1 });
    const collaborations = await Collaboration.find({ user: req.user.id }).populate('repl');

    const collaboratedRepls = collaborations.map((collab) => ({
      ...collab.repl.toObject(),
      isCollaborator: true,
    }));

    const repls = [...ownedRepls.map((repl) => ({ ...repl.toObject(), isCollaborator: false })), ...collaboratedRepls];

    res.json({ success: true, repls });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Create a new REPL
router.post('/', auth, async (req, res) => {
  try {
    const { name, language, description } = req.body;
    
    // Check if REPL with same name exists for this user
    const existing = await Repl.findOne({ 
      creator: req.user.id,
      name: name 
    });

    if (existing) {
      return res.status(400).json({ 
        success: false, 
        message: 'You already have a REPL with this name' 
      });
    }

    const repl = await Repl.create({
      name,
      language,
      description,
      creator: req.user.id,
    });

    await copyS3Folder(`base/${language}/`, `code/${req.user.id}/${repl._id}/`);

    res.json({ success: true, repl });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Get a specific REPL
router.get('/:id', auth, async (req, res) => {
  try {
    const repl = await Repl.findOne({ 
      _id: req.params.id,
      creator: req.user.id 
    });

    if (!repl) {
      // Check if the user is a collaborator
      const collaboration = await Collaboration.findOne({
        repl: req.params.id,
        user: req.user.id,
      }).populate('repl');
      if (collaboration) {
        return res.json({ success: true, repl: collaboration.repl });
      }
      // If not found and not a collaborator, return 404
      return res.status(404).json({ 
        success: false, 
        message: 'REPL not found' 
      });
    }

    res.json({ success: true, repl });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

router.post('/:id/add-collaborator', auth, async (req, res) => {
  const { email } = req.body;
  const { id } = req.params; // REPL ID

  try {
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const repl = await Repl.findOne({ _id: id, creator: req.user.id });
    if (!repl) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    // Add collaborator if not already added
    if (!repl.collaborators.includes(user._id)) {
      repl.collaborators.push(user._id);
      await repl.save();
      await Collaboration.create({ user: user._id, repl: repl._id });
    }

    res.json({ success: true, message: 'Collaborator added' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

router.delete('/:id', auth, async (req, res) => {
  try {
    const repl = await Repl.findOne({ _id: req.params.id, creator: req.user.id });

    if (!repl) {
      return res.status(403).json({ success: false, message: 'Not authorized to delete this REPL' });
    }

    // Delete associated collaborations
    await Collaboration.deleteMany({ repl: repl._id });

    // Delete files from S3
    const s3Prefix = `code/${req.user.id}/${repl._id}/`;
    const s3Result = await deleteFromS3(req.user.id, repl._id, s3Prefix);

    if (!s3Result.success) {
      return res.status(500).json({ success: false, message: 'Failed to delete files from S3' });
    }

    // Delete the REPL
    await repl.remove();

    res.json({ success: true, message: 'REPL deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router; 