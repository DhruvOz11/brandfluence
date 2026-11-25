const express = require('express');
const mongoose = require('mongoose');
const Collaboration = require('../models/Collaboration');
const router = express.Router();
const auth = require('../middleware/auth'); // Add authentication middleware
const User = require('../models/User');

router.get('/brand', auth(['brand']), async (req, res) => {
  try {
    const collaborations = await Collaboration.find({ 
      brandId: req.user._id 
    })
    .populate('creatorId', 'name image') 
    .sort({ createdAt: -1 }); 

    res.status(200).json(collaborations);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/request', auth(['brand']), async (req, res) => {
  try {
    const brandId = req.user._id;
    const {
      creatorId,
      title,
      purpose,
      deliverables,
      budget,
      dueDate
    } = req.body;

    if (!mongoose.isValidObjectId(creatorId)) {
      return res.status(400).json({ error: 'A valid creator is required' });
    }
    if (typeof title !== 'string' || title.trim().length < 3 || title.trim().length > 100) {
      return res.status(400).json({ error: 'Campaign title must be between 3 and 100 characters' });
    }
    if (typeof purpose !== 'string' || purpose.trim().length < 10 || purpose.trim().length > 2000) {
      return res.status(400).json({ error: 'Campaign description must be between 10 and 2000 characters' });
    }
    if (typeof deliverables !== 'string' || deliverables.trim().length < 3 || deliverables.trim().length > 2000) {
      return res.status(400).json({ error: 'Deliverables must be between 3 and 2000 characters' });
    }
    const numericBudget = Number(budget);
    if (!Number.isFinite(numericBudget) || numericBudget <= 0) {
      return res.status(400).json({ error: 'Budget must be a positive number' });
    }
    if (typeof dueDate !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(dueDate)) {
      return res.status(400).json({ error: 'Choose a valid campaign due date' });
    }
    const parsedDueDate = new Date(`${dueDate}T23:59:59.999Z`);
    if (
      Number.isNaN(parsedDueDate.getTime())
      || parsedDueDate.toISOString().slice(0, 10) !== dueDate
      || parsedDueDate < new Date()
    ) {
      return res.status(400).json({ error: 'Due date must be today or a future date' });
    }

    const creator = await User.findOne({
      _id: creatorId,
      role: 'creator',
      isSuspended: { $ne: true }
    });
    if (!creator) return res.status(404).json({ error: 'Creator not found' });

    const collaboration = new Collaboration({
      brandId,
      creatorId,
      title: title.trim(),
      purpose: purpose.trim(),
      deliverables: deliverables.trim(),
      budget: numericBudget,
      dueDate: parsedDueDate,
      charges: creator.charges,
      status: 'Pending',
      statusHistory: [{
        status: 'Pending',
        updatedBy: brandId,
        note: 'Campaign request created'
      }]
    });

    await collaboration.save();
    res.status(201).json(collaboration);
    
  } catch (err) {
    console.error('Collaboration Error:', err);
    res.status(500).json({ error: 'Failed to create collaboration' });
  }
});

// Get pending collaborations for the authenticated creator
router.get('/creator', auth(['creator']), async (req, res) => {
  try {
    const collaborations = await Collaboration.find({
      creatorId: req.user._id
    })
      .populate('brandId', 'name')
      .sort({ createdAt: -1 });
    res.status(200).json(collaborations);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/creator/pending', auth(['creator']), async (req, res) => {
  try {
    const collaborations = await Collaboration.find({
      creatorId: req.user._id,
      status: 'Pending'
    })
      .populate('brandId', 'name')
      .sort({ createdAt: -1 });
    res.status(200).json(collaborations);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Admin analytics
router.get('/admin/analytics', auth(['admin']), async (req, res) => {
  try {
    const topCreators = await Collaboration.aggregate([
      { $match: { status: 'Completed' } },
      { $group: { 
        _id: '$creatorId', 
        totalDeals: { $sum: 1 },
        totalRevenue: { $sum: '$charges' }, // Now using real charges
        avgDealSize: { $avg: '$charges' } // Bonus metric
      }},
      { $sort: { totalDeals: -1 } },
      { $lookup: {
        from: 'users',
        localField: '_id',
        foreignField: '_id',
        as: 'creator'
      }},
      { $unwind: '$creator' },
      { $project: {
        name: '$creator.name',
        followers: '$creator.followers',
        totalDeals: 1,
        totalRevenue: 1
      }}
    ]);

    res.status(200).json({ topCreators });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


// Apply only the next allowed campaign transition for its authenticated participant.
router.put('/:id/status', auth(['creator', 'brand']), async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ error: 'Invalid collaboration ID' });
    }

    const { status, submissionNote } = req.body;
    const transitions = {
      creator: {
        Accepted: 'Pending',
        Rejected: 'Pending',
        Submitted: 'In Progress'
      },
      brand: {
        'In Progress': 'Accepted',
        Completed: 'Submitted'
      }
    };
    const roleTransitions = transitions[req.user.role] || {};
    const expectedStatus = Object.prototype.hasOwnProperty.call(roleTransitions, status)
      ? roleTransitions[status]
      : null;
    if (!expectedStatus) {
      return res.status(400).json({ error: 'That role cannot perform the requested campaign transition' });
    }

    let cleanedSubmissionNote = '';
    if (status === 'Submitted') {
      if (typeof submissionNote !== 'string' || submissionNote.trim().length < 3) {
        return res.status(400).json({ error: 'Add a short note describing the submitted work' });
      }
      if (submissionNote.trim().length > 1000) {
        return res.status(400).json({ error: 'Submission note must be 1000 characters or fewer' });
      }
      cleanedSubmissionNote = submissionNote.trim();
    }

    const update = {
      $set: { status },
      $push: {
        statusHistory: {
          status,
          updatedBy: req.user._id,
          note: cleanedSubmissionNote
        }
      }
    };

    if (status === 'Submitted') {
      update.$set.submissionNote = cleanedSubmissionNote;
    }

    const participantField = req.user.role === 'creator' ? 'creatorId' : 'brandId';
    const collaboration = await Collaboration.findOneAndUpdate(
      {
        _id: req.params.id,
        [participantField]: req.user._id,
        status: expectedStatus
      },
      update,
      { new: true, runValidators: true }
    )
      .populate('brandId', 'name')
      .populate('creatorId', 'name image');

    if (!collaboration) {
      return res.status(409).json({ error: 'Campaign unavailable or its status has already changed' });
    }

    return res.status(200).json({ message: 'Campaign status updated', collaboration });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});



module.exports = router;