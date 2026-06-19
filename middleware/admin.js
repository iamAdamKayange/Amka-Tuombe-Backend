// middleware/admin.js
module.exports = (req, res, next) => {
  console.log('🔐 Admin middleware called');
  console.log('👤 req.user:', req.user);
  console.log('👤 req.user?.role:', req.user?.role);

  if (!req.user) {
    console.log('❌ No user object');
    return res.status(401).json({ error: 'Not authenticated' });
  }

  if (req.user.role !== 'admin') {
    console.log(`❌ User role is "${req.user.role}", not "admin"`);
    return res.status(403).json({ error: `Admin access required. Your role: ${req.user.role}` });
  }

  console.log('✅ Admin access granted');
  next();
};