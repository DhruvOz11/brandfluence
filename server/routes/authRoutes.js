const express = require('express');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { verifyInstagramProfile } = require('../utils/instagramScraper');
const upload = require('../utils/upload');
const bcrypt = require('bcryptjs');
const { rateLimit } = require('express-rate-limit');
const {
  isEmailConfigured,
  sendPasswordResetEmail
} = require('../utils/passwordResetEmail');
const router = express.Router();

const passwordResetLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  standardHeaders: 'draft-8',
  legacyHeaders: false
});

const resetMessage = 'If an account exists for that email, a password reset link has been sent.';
const escapeRegex = value => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const findUserByEmailAndRole = (email, role) => User.findOne({
  email: { $regex: `^${escapeRegex(email.trim())}$`, $options: 'i' },
  role
});

const invalidCredentialsMessage = 'Invalid email or password. Check the account details or use Forgot password.';

const loginUser = async (req, res, role) => {
  const { email, password, rememberMe } = req.body || {};
  if (
    typeof email !== 'string'
    || !email.trim()
    || typeof password !== 'string'
    || !password
  ) {
    return res.status(400).json({ error: 'Enter your email and password' });
  }

  try {
    const user = await findUserByEmailAndRole(email, role)
      .select('name email role password +tokenVersion isSuspended suspensionReason');

    if (!user) {
      return res.status(401).json({ error: invalidCredentialsMessage });
    }
    if (typeof user.password !== 'string' || !user.password) {
      console.error(`Login account is missing a stored password hash for role: ${role}`);
      return res.status(401).json({ error: invalidCredentialsMessage });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({ error: invalidCredentialsMessage });
    }
    if (user.isSuspended) {
      return res.status(403).json({
        error: user.suspensionReason
          ? `Account suspended: ${user.suspensionReason}`
          : 'Account suspended. Contact the administrator.'
      });
    }

    const token = jwt.sign(
      {
        userId: user._id,
        role: user.role,
        tokenVersion: user.tokenVersion
      },
      process.env.JWT_SECRET,
      { expiresIn: rememberMe === true ? '7d' : '1d' }
    );

    return res.status(200).json({
      message: `${role === 'creator' ? 'Creator' : 'Brand'} login successful`,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role
      },
      token
    });
  } catch (err) {
    console.error(`${role} login failed:`, err);
    return res.status(500).json({ error: 'Unable to sign in right now. Please try again.' });
  }
};

router.post('/signup/creator', upload.single('image'), async (req, res) => {
  try {
    const { name, email, password, instagramProfile, description, charges, city, category } = req.body;

    const hashedPassword = await bcrypt.hash(password, 10);

    const { followers } = await verifyInstagramProfile(instagramProfile);

    const user = new User({
      name,
      email: email.trim().toLowerCase(),
      password: hashedPassword, // Store hashed password
      role: 'creator', // Explicitly set role
      instagramProfile,
      followers,
      image: `uploads/${req.file.filename}`,
      description,
      charges,
      city,
      category,
      isVerified: false,
    });

    await user.save();
    res.status(201).json({
      message: 'Creator account created successfully',
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/signup/brand', async (req, res) => {
  try {
    const { name, email, password } = req.body;

    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 10);

    const user = new User({ 
      name, 
      email: email.trim().toLowerCase(),
      password: hashedPassword, // Store hashed password
      role: 'brand' 
    });
    await user.save();
    res.status(201).json({ message: 'Brand account created successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


router.post('/login/admin', async (req, res) => {
  try {
    const { password, rememberMe } = req.body;
    const adminPassword = process.env.ADMIN_PASSWORD;

    if (!adminPassword) {
      return res.status(503).json({ error: 'Admin login is not configured' });
    }

    if (password !== adminPassword) {
      return res.status(401).json({ error: 'Invalid admin credentials' });
    }

    // Create admin payload without MongoDB _id
    const token = jwt.sign(
      { 
        userId: 'admin', 
        role: 'admin',
        isAdmin: true
      },
      process.env.JWT_SECRET,
      { expiresIn: rememberMe === true ? '8h' : '1h' }
    );

    res.json({ 
      message: 'Admin login successful',
      token,
      user: { role: 'admin' }
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});




router.post('/login/creator', (req, res) => loginUser(req, res, 'creator'));

router.post('/login/brand', (req, res) => loginUser(req, res, 'brand'));

router.post('/password/forgot', passwordResetLimiter, async (req, res) => {
  try {
    const email = typeof req.body.email === 'string'
      ? req.body.email.trim().toLowerCase()
      : '';

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ error: 'Enter a valid email address' });
    }

    if (!isEmailConfigured()) {
      return res.status(503).json({ error: 'Password reset email is not configured' });
    }

    const user = await User.findOne({
      email: { $regex: `^${escapeRegex(email)}$`, $options: 'i' },
      role: { $in: ['creator', 'brand'] }
    }).select('+passwordResetTokenHash +passwordResetExpires');

    if (!user) {
      return res.status(200).json({ message: resetMessage });
    }

    const resetToken = crypto.randomBytes(32).toString('hex');
    user.passwordResetTokenHash = crypto
      .createHash('sha256')
      .update(resetToken)
      .digest('hex');
    user.passwordResetExpires = new Date(Date.now() + 15 * 60 * 1000);
    await user.save();

    const clientUrl = (process.env.CLIENT_URL || 'http://localhost:3000').replace(/\/$/, '');
    const resetUrl = `${clientUrl}/reset-password/${resetToken}`;

    try {
      await sendPasswordResetEmail(user.email, resetUrl);
    } catch (emailError) {
      console.error('Password reset email delivery failed:', emailError);
      user.passwordResetTokenHash = undefined;
      user.passwordResetExpires = undefined;
      await user.save();
      return res.status(503).json({ error: 'Unable to send a password reset email right now' });
    }

    return res.status(200).json({ message: resetMessage });
  } catch (err) {
    console.error('Password reset request failed:', err);
    return res.status(500).json({ error: 'Unable to process password reset request' });
  }
});

router.post('/password/reset', passwordResetLimiter, async (req, res) => {
  try {
    const { token, password } = req.body;
    if (typeof token !== 'string' || !/^[a-f0-9]{64}$/i.test(token)) {
      return res.status(400).json({ error: 'Invalid or expired reset link' });
    }
    if (typeof password !== 'string' || password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters long' });
    }

    const passwordResetTokenHash = crypto
      .createHash('sha256')
      .update(token)
      .digest('hex');
    const user = await User.findOne({
      passwordResetTokenHash,
      passwordResetExpires: { $gt: new Date() },
      role: { $in: ['creator', 'brand'] }
    }).select('+passwordResetTokenHash +passwordResetExpires +tokenVersion');

    if (!user) {
      return res.status(400).json({ error: 'Invalid or expired reset link' });
    }

    user.password = await bcrypt.hash(password, 10);
    user.passwordResetTokenHash = undefined;
    user.passwordResetExpires = undefined;
    user.tokenVersion = (user.tokenVersion || 0) + 1;
    await user.save();

    return res.status(200).json({ message: 'Password reset successfully. Please sign in.' });
  } catch (err) {
    console.error('Password reset failed:', err);
    return res.status(500).json({ error: 'Unable to reset password' });
  }
});


module.exports = router;