const express = require('express');
const router = express.Router();
const User = require('../models/User');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const auth = require('../middleware/authMiddleware');
const { logger } = require('../utils/logger');

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
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user || !(await bcrypt.compare(password, user.password)))
      return res.json({ success: false, message: 'Invalid credentials' });

    const token = jwt.sign({ id: user._id, username: user.username }, process.env.JWT_SECRET);
   
    res.cookie('token', token, { httpOnly: true }).json({ 
      success: true,
      user: {
        _id: user._id,
        username: user.username,
        email: user.email
      },
      token // Optionally send token in response body if not using httpOnly cookie
    });
  } catch (error) {
    logger.error('Login error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to login'
    });
  }
});

router.get('/me', auth, async (req, res) => {
  try {

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
  try {
    res.clearCookie('token', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict'
    }).json({ success: true });
  } catch (error) {
    logger.error('Logout error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to logout' 
    });
  }
});

module.exports = router;


