const express = require('express');
const mongoose = require('mongoose');
const User = require('../models/User');
const auth = require('../middleware/auth');
const {
  portfolioUpload,
  profileImageUpload,
  hasValidFileSignature,
  removePortfolioFile
} = require('../utils/portfolioUpload');
const router = express.Router();

const creatorProfileFields = 'name image followers charges city category description instagramProfile isVerified portfolio';
const creatorSelfProfileFields = `${creatorProfileFields} verificationStatus verificationEvidence verificationDecisionReason`;
const MAX_PORTFOLIO_ITEMS = 12;
const escapeRegex = value => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const handlePortfolioUpload = (req, res, next) => {
  portfolioUpload.single('media')(req, res, error => {
    if (!error) return next();
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(413).json({ error: 'Media must be 50 MB or smaller' });
    }
    if (error.code === 'UNSUPPORTED_MEDIA_TYPE') {
      return res.status(415).json({ error: error.message });
    }
    console.error('Portfolio upload failed:', error);
    return res.status(400).json({ error: 'Unable to upload this media file' });
  });
};

const handleProfileImageUpload = (req, res, next) => {
  profileImageUpload.single('image')(req, res, error => {
    if (!error) return next();
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(413).json({ error: 'Profile images must be 5 MB or smaller' });
    }
    if (error.code === 'UNSUPPORTED_MEDIA_TYPE') {
      return res.status(415).json({ error: error.message });
    }
    console.error('Profile image upload failed:', error);
    return res.status(400).json({ error: 'Unable to upload this profile image' });
  });
};

const removeUploadedFile = async filename => {
  try {
    await removePortfolioFile(filename);
  } catch (error) {
    if (error.code !== 'ENOENT') {
      console.error('Unable to remove uploaded portfolio file:', error);
    }
  }
};

router.get('/me/profile', auth(['creator', 'brand']), async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('name email role image');
    if (!user) return res.status(404).json({ error: 'Account profile not found' });
    return res.status(200).json(user);
  } catch (err) {
    return res.status(500).json({ error: 'Unable to load account profile' });
  }
});

router.post(
  '/me/profile-image',
  auth(['creator', 'brand']),
  handleProfileImageUpload,
  async (req, res) => {
    if (!req.file) {
      return res.status(400).json({ error: 'Choose a profile image to upload' });
    }

    try {
      const validSignature = await hasValidFileSignature(req.file);
      if (!validSignature) {
        await removeUploadedFile(req.file.filename);
        return res.status(415).json({ error: 'The file contents do not match a supported image type' });
      }

      const user = await User.findOne({ _id: req.user._id, role: req.user.role })
        .select('name role image');
      if (!user) {
        await removeUploadedFile(req.file.filename);
        return res.status(404).json({ error: 'Account profile not found' });
      }

      const previousImage = user.image;
      user.image = `uploads/${req.file.filename}`;
      await user.save();

      if (typeof previousImage === 'string' && /^uploads[\\/]/.test(previousImage)) {
        await removeUploadedFile(previousImage);
      }

      return res.status(200).json({
        _id: user._id,
        name: user.name,
        role: user.role,
        image: user.image
      });
    } catch (err) {
      await removeUploadedFile(req.file.filename);
      console.error('Unable to save profile image:', err);
      return res.status(500).json({ error: 'Unable to save this profile image' });
    }
  }
);

// Get all creators (for brand dashboard)
router.get('/creators', auth(['brand']), async (req, res) => {
  try {
    const { category, city, maxRate, minFollowers } = req.query;
    const filters = { role: 'creator', isSuspended: { $ne: true } };

    if (category) filters.category = category;
    if (city) {
      filters.city = { $regex: escapeRegex(String(city).trim()), $options: 'i' };
    }

    if (maxRate !== undefined && maxRate !== '') {
      const numericMaxRate = Number(maxRate);
      if (!Number.isFinite(numericMaxRate) || numericMaxRate < 0) {
        return res.status(400).json({ error: 'Maximum rate must be a non-negative number' });
      }
      filters.charges = { $lte: numericMaxRate };
    }

    if (minFollowers !== undefined && minFollowers !== '') {
      const numericMinFollowers = Number(minFollowers);
      if (!Number.isInteger(numericMinFollowers) || numericMinFollowers < 0) {
        return res.status(400).json({ error: 'Minimum followers must be a non-negative whole number' });
      }
      filters.followers = { $gte: numericMinFollowers };
    }


    const creators = await User.find(filters)
      .select('name image followers charges city category description instagramProfile isVerified');
    res.status(200).json(creators);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/creators/me/profile', auth(['creator']), async (req, res) => {
  try {
    const creator = await User.findOne({ _id: req.user._id, role: 'creator' })
      .select(creatorSelfProfileFields);

    if (!creator) return res.status(404).json({ error: 'Creator profile not found' });
    return res.status(200).json(creator);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

router.put('/creators/me/profile', auth(['creator']), async (req, res) => {
  try {
    const { name, description, city, category, charges, followers, instagramProfile } = req.body;

    if (typeof name !== 'string' || name.trim().length < 2 || name.trim().length > 80) {
      return res.status(400).json({ error: 'Name must be between 2 and 80 characters' });
    }
    if (typeof description !== 'string' || description.length > 1000) {
      return res.status(400).json({ error: 'Bio must be 1000 characters or fewer' });
    }
    if (typeof city !== 'string' || city.trim().length > 100) {
      return res.status(400).json({ error: 'City must be 100 characters or fewer' });
    }
    if (typeof category !== 'string' || category.trim().length > 50) {
      return res.status(400).json({ error: 'Category must be 50 characters or fewer' });
    }
    if (typeof instagramProfile !== 'string' || instagramProfile.length > 300) {
      return res.status(400).json({ error: 'Social profile URL must be 300 characters or fewer' });
    }

    const numericCharges = Number(charges);
    const numericFollowers = Number(followers);
    if (!Number.isFinite(numericCharges) || numericCharges < 0) {
      return res.status(400).json({ error: 'Rate must be a non-negative number' });
    }
    if (!Number.isInteger(numericFollowers) || numericFollowers < 0) {
      return res.status(400).json({ error: 'Follower count must be a non-negative whole number' });
    }

    const creator = await User.findOneAndUpdate(
      { _id: req.user._id, role: 'creator' },
      {
        $set: {
          name: name.trim(),
          description: description.trim(),
          city: city.trim(),
          category: category.trim(),
          charges: numericCharges,
          followers: numericFollowers,
          instagramProfile: instagramProfile.trim()
        }
      },
      { new: true, runValidators: true }
    ).select(creatorSelfProfileFields);

    if (!creator) return res.status(404).json({ error: 'Creator profile not found' });
    return res.status(200).json(creator);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

router.post('/creators/me/verification-request', auth(['creator']), async (req, res) => {
  try {
    const { evidence } = req.body;
    if (typeof evidence !== 'string' || evidence.trim().length < 10 || evidence.trim().length > 1000) {
      return res.status(400).json({ error: 'Provide verification evidence between 10 and 1000 characters' });
    }

    const creator = await User.findOneAndUpdate(
      {
        _id: req.user._id,
        role: 'creator',
        isVerified: { $ne: true },
        verificationStatus: { $ne: 'Pending' }
      },
      {
        $set: {
          verificationEvidence: evidence.trim(),
          verificationStatus: 'Pending',
          verificationDecisionReason: ''
        }
      },
      { new: true, runValidators: true }
    ).select('name isVerified verificationStatus verificationEvidence verificationDecisionReason');

    if (!creator) {
      return res.status(409).json({ error: 'Verification is already approved or a request is pending' });
    }
    return res.status(200).json(creator);
  } catch (err) {
    console.error('Verification request failed:', err);
    return res.status(500).json({ error: 'Unable to submit verification request' });
  }
});

router.get('/creators/:creatorId', auth(['brand']), async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.creatorId)) {
      return res.status(400).json({ error: 'Invalid creator ID' });
    }

    const creator = await User.findOne({
      _id: req.params.creatorId,
      role: 'creator',
      isSuspended: { $ne: true }
    }).select(creatorProfileFields);

    if (!creator) return res.status(404).json({ error: 'Creator not found' });
    return res.status(200).json(creator);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

router.post(
  '/creators/me/portfolio',
  auth(['creator']),
  handlePortfolioUpload,
  async (req, res) => {
    if (!req.file) {
      return res.status(400).json({ error: 'Choose an image or video to upload' });
    }

    try {
      const { file } = req;
      const caption = typeof req.body.caption === 'string' ? req.body.caption.trim() : '';

      if (caption.length > 200) {
        await removeUploadedFile(file.filename);
        return res.status(400).json({ error: 'Caption must be 200 characters or fewer' });
      }

      const validSignature = await hasValidFileSignature(file);
      if (!validSignature) {
        await removeUploadedFile(file.filename);
        return res.status(415).json({ error: 'The file contents do not match a supported media type' });
      }

      if (file.mimetype.startsWith('image/') && file.size > 10 * 1024 * 1024) {
        await removeUploadedFile(file.filename);
        return res.status(413).json({ error: 'Images must be 10 MB or smaller' });
      }

      const creator = await User.findOne({ _id: req.user._id, role: 'creator' })
        .select('portfolio');
      if (!creator) {
        await removeUploadedFile(file.filename);
        return res.status(404).json({ error: 'Creator profile not found' });
      }
      if (creator.portfolio.length >= MAX_PORTFOLIO_ITEMS) {
        await removeUploadedFile(file.filename);
        return res.status(409).json({ error: `Portfolio is limited to ${MAX_PORTFOLIO_ITEMS} items` });
      }

      creator.portfolio.push({
        filename: file.filename,
        mediaType: file.mimetype.startsWith('video/') ? 'video' : 'image',
        caption,
        position: creator.portfolio.length
      });
      await creator.save();

      const portfolioItem = creator.portfolio[creator.portfolio.length - 1];
      return res.status(201).json({ portfolioItem });
    } catch (err) {
      if (req.file) await removeUploadedFile(req.file.filename);
      console.error('Unable to save portfolio item:', err);
      return res.status(500).json({ error: 'Unable to save portfolio item' });
    }
  }
);

router.patch('/creators/me/portfolio/:mediaId', auth(['creator']), async (req, res) => {
  try {
    const { caption } = req.body;
    if (typeof caption !== 'string' || caption.trim().length > 200) {
      return res.status(400).json({ error: 'Caption must be 200 characters or fewer' });
    }
    if (!mongoose.isValidObjectId(req.params.mediaId)) {
      return res.status(400).json({ error: 'Invalid portfolio item ID' });
    }

    const creator = await User.findOne({ _id: req.user._id, role: 'creator' })
      .select('portfolio');
    const portfolioItem = creator?.portfolio.id(req.params.mediaId);
    if (!portfolioItem) return res.status(404).json({ error: 'Portfolio item not found' });

    portfolioItem.caption = caption.trim();
    await creator.save();
    return res.status(200).json({ portfolioItem });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

router.put('/creators/me/portfolio/order', auth(['creator']), async (req, res) => {
  try {
    const { orderedIds } = req.body;
    const creator = await User.findOne({ _id: req.user._id, role: 'creator' })
      .select('portfolio');

    if (!creator) return res.status(404).json({ error: 'Creator profile not found' });
    const currentIds = creator.portfolio.map(item => String(item._id));
    if (
      !Array.isArray(orderedIds)
      || orderedIds.length !== currentIds.length
      || new Set(orderedIds).size !== currentIds.length
      || orderedIds.some(id => !currentIds.includes(String(id)))
    ) {
      return res.status(400).json({ error: 'Order must contain each portfolio item exactly once' });
    }

    orderedIds.forEach((id, position) => {
      creator.portfolio.id(id).position = position;
    });
    await creator.save();

    const portfolio = [...creator.portfolio].sort((a, b) => a.position - b.position);
    return res.status(200).json({ portfolio });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

router.delete('/creators/me/portfolio/:mediaId', auth(['creator']), async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.mediaId)) {
      return res.status(400).json({ error: 'Invalid portfolio item ID' });
    }

    const creator = await User.findOne({ _id: req.user._id, role: 'creator' })
      .select('portfolio');
    const portfolioItem = creator?.portfolio.id(req.params.mediaId);
    if (!portfolioItem) return res.status(404).json({ error: 'Portfolio item not found' });

    const filename = portfolioItem.filename;
    portfolioItem.deleteOne();
    creator.portfolio.forEach((item, position) => {
      item.position = position;
    });
    await creator.save();

    try {
      await removePortfolioFile(filename);
    } catch (fileError) {
      if (fileError.code !== 'ENOENT') {
        console.error('Portfolio record removed but media cleanup failed:', fileError);
        return res.status(500).json({ error: 'Portfolio item removed, but its file could not be cleaned up' });
      }
    }

    return res.status(200).json({ message: 'Portfolio item removed' });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

module.exports = router;