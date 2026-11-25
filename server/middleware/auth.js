const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const User = require('../models/User');

module.exports = (allowedRoles) => {
  return async (req, res, next) => {
    try {
      const token = req.header('Authorization')?.replace('Bearer ', '');
      if (!token) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      if (decoded.role === 'admin' && decoded.isAdmin === true) {
        req.user = {
          _id: 'admin',
          role: 'admin',
          isAdmin: true
        };
      } else {
        if (!mongoose.isValidObjectId(decoded.userId)) {
          return res.status(401).json({ error: 'Authentication failed' });
        }
        const user = await User.findById(decoded.userId)
          .select('_id role name image isSuspended suspensionReason +tokenVersion');
        if (!user) {
          return res.status(401).json({ error: 'Authentication failed' });
        }
        if ((decoded.tokenVersion || 0) !== (user.tokenVersion || 0)) {
          return res.status(401).json({ error: 'Authentication failed' });
        }
        if (user.isSuspended) {
          return res.status(403).json({
            error: user.suspensionReason
              ? `Account suspended: ${user.suspensionReason}`
              : 'Account suspended. Contact the administrator.'
          });
        }
        req.user = user;
      }

      if (allowedRoles && !allowedRoles.includes(req.user.role)) {
        return res.status(403).json({ error: 'You do not have permission to access this resource' });
      }

      return next();
    } catch (err) {
      if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
        return res.status(401).json({ error: 'Authentication failed' });
      }
      console.error('Authentication middleware error:', err);
      return res.status(500).json({ error: 'Unable to authenticate request' });
    }
  };
};