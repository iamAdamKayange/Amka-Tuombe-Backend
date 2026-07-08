const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { validateUser } = require('../middleware/validate');
const { deleteObject, extractR2Key, uploadImage } = require('../services/r2Service');

function serializeUser(user) {
  return {
    id: user.id,
    email: user.email,
    fullName: user.full_name,
    full_name: user.full_name,
    role: user.role,
    avatarUrl: user.avatar_url || null,
    avatar_url: user.avatar_url || null,
  };
}

exports.register = async (req, res) => {
  try {
    const { error } = validateUser(req.body);
    if (error) return res.status(400).json({ error: error.details[0].message });

    const { email, password, fullName } = req.body;
    const existing = await User.findByEmail(email);
    if (existing) return res.status(400).json({ error: 'Email already registered' });

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await User.create({ email, passwordHash, fullName, role: 'user' });

    const token = jwt.sign(
      { userId: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.status(201).json({
      token,
      user: serializeUser(user),
    });
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ error: 'Server error' });
  }
};

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findByEmail(email);
    if (!user) return res.status(401).json({ error: 'Invalid credentials' });

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) return res.status(401).json({ error: 'Invalid credentials' });

    const token = jwt.sign(
      { userId: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      token,
      user: serializeUser(user),
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Server error' });
  }
};

exports.getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    return res.json({ user: serializeUser(user) });
  } catch (err) {
    console.error('Get profile error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
};

exports.updateMe = async (req, res) => {
  try {
    const fullName = req.body.fullName?.trim() || req.body.full_name?.trim();
    const email = req.body.email?.trim()?.toLowerCase();

    if (!fullName || fullName.length < 2 || fullName.length > 100) {
      return res.status(400).json({ error: 'Full name must be 2 to 100 characters' });
    }
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ error: 'Valid email is required' });
    }

    const existing = await User.findByEmail(email);
    if (existing && existing.id !== req.user.id) {
      return res.status(400).json({ error: 'Email already registered' });
    }

    const user = await User.updateProfile(req.user.id, { email, fullName });
    return res.json({ user: serializeUser(user) });
  } catch (err) {
    console.error('Update profile error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
};

exports.uploadAvatar = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Profile image required' });
    }

    const result = await uploadImage(req.file.path, {
      title: `profile_${req.user.id}`,
      originalName: req.file.originalname,
      contentType: req.file.mimetype,
    });
    const avatarUrl = `${req.protocol}://${req.get('host')}/api/media/r2/${encodeURI(result.key)}`;
    const user = await User.updateProfile(req.user.id, { avatarUrl });

    return res.status(201).json({
      user: serializeUser(user),
      avatarUrl,
      avatar_url: avatarUrl,
    });
  } catch (err) {
    console.error('Upload avatar error:', err);
    return res.status(500).json({ error: err.message || 'Server error' });
  }
};

exports.deleteMe = async (req, res) => {
  try {
    const deleted = await User.deleteById(req.user.id);
    if (!deleted) return res.status(404).json({ error: 'User not found' });

    const avatarKey = extractR2Key(deleted.avatar_url);
    if (avatarKey) await deleteObject(avatarKey);

    return res.json({ message: 'Account deleted' });
  } catch (err) {
    console.error('Delete account error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
};
