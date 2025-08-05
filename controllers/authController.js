const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { getUserByEmail } = require('../models/userModel');

exports.loginUser = async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required.' });
  }

  try {
    const user = await getUserByEmail(email);

    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    // Build payload
    const payload = {
      id: user.id,
      email: user.email,
      business_id: user.business_id,
      role: user.role
    };

    const token = jwt.sign(payload, process.env.JWT_SECRET, {
      expiresIn: '1d'
    });

    // Set cookie with JWT
    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'None',
      domain: '.tidyzenic.com', // for subdomain access
      maxAge: 24 * 60 * 60 * 1000 // 1 day
    });

    // ✅ Return minimal but useful user info to frontend
    return res.status(200).json({
      message: 'Login successful',
      user: {
        id: user.id,
        email: user.email,
        business_id: user.business_id,
        role: user.role
      }
    });
  } catch (err) {
    console.error('Login error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};
