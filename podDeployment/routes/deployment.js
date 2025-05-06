import express from 'express';
import { decrementActiveUsers, deployRepl, incrementActiveUsers, scheduleReplDeletion } from '../controller/deploymentController.js';

const router = express.Router();

// Route to deploy a new repl
router.post('/deploy', async (req, res) => {
  try {
    const { userId, replId, language } = req.body;
    
    if (!userId || !replId || !language) {
      console.log("1")
      return res.status(400).json({
        success: false,
        error: 'Missing required parameters. Please provide userId, replId, and language.'
      });
    }
    console.log("here for colaboration")
    const result = await deployRepl(userId, replId, language);
    console.log("3")
    if (result.success) {
      console.log("4")
      return res.status(200).json(result);
    } else {
      console.log("5")
      return res.status(500).json(result);
    }
  } catch (error) {
    console.log("6")
    console.error('Error in deploy route:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'An error occurred while deploying the repl'
    });
  }
});


router.post('/increment-active-users', async (req, res) => {
  try {
    const { replId , userId} = req.body;

    if (!replId || !userId) {
      return res.status(400).json({ success: false, message: 'replId is required' });
    }

    await incrementActiveUsers(replId, userId);
    return res.status(200).json({ success: true, message: 'Active user count incremented' });
  } catch (error) {
    console.error('Error incrementing active users:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
});

router.post('/decrement-active-users', async (req, res) => {
  try {
    const { replId, userId } = req.body;

    if (!replId || !userId) {
      return res.status(400).json({ success: false, message: 'replId is required' });
    }

    await decrementActiveUsers(replId, userId);
    return res.status(200).json({ success: true, message: 'Active user count decremented' });
  } catch (error) {
    console.error('Error decrementing active users:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
});

export default router;