const express = require('express');
const router = express.Router();
const User = require('../models/User');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const auth = require('../middleware/authMiddleware');

router.post('/signup', async (req, res) => {
  const { username, email, password } = req.body;
  const exists = await User.findOne({ $or: [{ email }, { username }] });
  if (exists) return res.json({ success: false, message: 'User exists' });

  const hashed = await bcrypt.hash(password, 10);
  const user = await User.create({ username, email, password: hashed });
  const token = jwt.sign({ id: user._id, username }, process.env.JWT_SECRET);

  res.cookie('token', token, { httpOnly: true }).json({ success: true });
});

router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email });
  if (!user || !(await bcrypt.compare(password, user.password)))
    return res.json({ success: false, message: 'Invalid credentials' });

  const token = jwt.sign({ id: user._id, username: user.username }, process.env.JWT_SECRET);
  
  // Send back user data along with the success response
  res.cookie('token', token, { httpOnly: true }).json({ 
    success: true,
    user: {
      _id: user._id,
      username: user.username,
      email: user.email
    },
    token // Optionally send token in response body if not using httpOnly cookie
  });
});

router.get('/me', auth, async (req, res) => {
  try {
    // Since we have the user ID from the auth middleware
    const user = await User.findById(req.user.id).select('-password');
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    res.json({ 
      success: true,
      user: {
        _id: user._id,
        username: user.username,
        email: user.email
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

router.post('/logout', (req, res) => {
  res.clearCookie('token').json({ success: true });
});

module.exports = router;


