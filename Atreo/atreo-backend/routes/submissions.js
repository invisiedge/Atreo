const express = require('express');
const router = express.Router();
const Submission = require('../models/Submission');

// Get all submissions
router.get('/', async (req, res) => {
  try {
    if (req.user.role === 'admin') {
      const submissions = await Submission.find()
        .populate('userId', 'name email employeeId')
        .sort({ submittedAt: -1 });
      return res.json(submissions);
    }

    const submissions = await Submission.find({ userId: req.user.userId })
      .populate('userId', 'name email employeeId')
      .sort({ submittedAt: -1 });
    res.json(submissions);
  } catch (error) {
    console.error('Get submissions error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Create submission
router.post('/', async (req, res) => {
  try {
    const { items, totalAmount, notes } = req.body;

    if (!items || items.length === 0) {
      return res.status(400).json({ message: 'At least one item is required' });
    }

    const newSubmission = new Submission({
      userId: req.user.userId,
      items,
      totalAmount: totalAmount || 0,
      notes,
      status: 'pending'
    });

    await newSubmission.save();
    await newSubmission.populate('userId', 'name email employeeId');

    res.status(201).json(newSubmission);
  } catch (error) {
    console.error('Create submission error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update submission status
router.patch('/:id/status', async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Admin access required' });
    }

    const { id } = req.params;
    const { status } = req.body;

    const submission = await Submission.findById(id);
    if (!submission) {
      return res.status(404).json({ message: 'Submission not found' });
    }

    submission.status = status;
    if (status === 'approved') {
      submission.approvedAt = new Date();
    } else if (status === 'rejected') {
      submission.rejectedAt = new Date();
    }

    await submission.save();
    await submission.populate('userId', 'name email employeeId');

    res.json(submission);
  } catch (error) {
    console.error('Update submission status error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
