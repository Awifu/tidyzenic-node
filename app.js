require('dotenv').config();

const express = require('express');
const path = require('path');
const helmet = require('helmet');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

// ==============================
// 1. Security Headers
// ==============================
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", 'https:'],
      styleSrc: ["'self'", "'unsafe-inline'", 'https:'],
      imgSrc: ["'self'", 'data:', 'https:'],
      connectSrc: ["'self'", 'https:', 'https://*.tidyzenic.com'],
    }
  },
  crossOriginEmbedderPolicy: false,
  crossOriginResourcePolicy: { policy: 'cross-origin' }
}));

// ==============================
// 2. Middleware
// ==============================
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));

// ==============================
// 3. CORS Configuration
// ==============================
const allowedOrigins = [
  'http://localhost:3000',
  'https://tidyzenic.com',
  'https://www.tidyzenic.com',
  /^https:\/\/([a-z0-9-]+)\.tidyzenic\.com$/i,
];

app.use(cors({
  origin: (origin, callback) => {
    if (
      !origin ||
      allowedOrigins.some(entry => entry instanceof RegExp ? entry.test(origin) : entry === origin)
    ) {
      return callback(null, true);
    }
    return callback(new Error(`❌ CORS rejected: ${origin}`));
  },
  credentials: true
}));

// ==============================
// 4. Tenant Resolver Middleware
// ==============================
const tenantResolver = require('./middleware/tenantResolver');
app.use(tenantResolver);

// ==============================
// 5. Static Files
// ==============================
app.use(express.static(path.join(__dirname, 'public'), {
  maxAge: process.env.NODE_ENV === 'production' ? '1y' : 0,
  etag: true
}));

// ==============================
// 6. API Routes
// ==============================
app.use('/register', require('./routes/register_user'));
app.use('/auth', require('./routes/auth'));
app.use('/api/business', require('./routes/business'));
app.use('/api/support', require('./routes/support')); // 💬 Support ticket routes

// ==============================
// 7. HTML Routes
// ==============================
const sendFile = (file) => (req, res) =>
  res.sendFile(path.join(__dirname, 'public', file));

app.get(['/login', '/login.html'], (req, res) => {
  const host = req.hostname;
  if (host !== 'tidyzenic.com' && host !== 'www.tidyzenic.com') {
    return res.redirect('https://tidyzenic.com/login.html');
  }
  res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

app.get('/reset-password.html', sendFile('reset-password.html'));
app.get('/verified.html', sendFile('verified.html'));
app.get('/admin-dashboard.html', (req, res) => res.redirect('/admin/dashboard.html'));
app.get('/admin/support.html', sendFile('admin/support.html'));

// ==============================
// 8. 404 Not Found
// ==============================
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// ==============================
// 9. Global Error Handler
// ==============================
app.use((err, req, res, next) => {
  console.error('🔥 Unhandled Error:', err.stack || err.message);
  const isProduction = process.env.NODE_ENV === 'production';
  res.status(500).json({ error: isProduction ? 'Internal server error' : err.message });
});

// ==============================
// 10. Launch Server
// ==============================
const server = app.listen(PORT, () => {
  const url = process.env.NODE_ENV === 'production'
    ? 'https://tidyzenic.com'
    : `http://localhost:${PORT}`;
  console.log(`✅ Server running at ${url}`);
});

// ==============================
// 11. Graceful Shutdown
// ==============================
process.on('SIGINT', () => {
  console.log('🛑 Gracefully shutting down...');
  server.close(() => {
    console.log('✅ Server closed');
    process.exit(0);
  });
});
