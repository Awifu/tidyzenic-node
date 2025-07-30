require('dotenv').config();

const express = require('express');
const path = require('path');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');
const cors = require('cors');
const crypto = require('crypto');
const helmet = require('helmet');

const app = express();
const PORT = process.env.PORT || 3000;

// 1. Middleware: JSON, URL-encoded, cookies, logging
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));

// 2. CSP nonce middleware (for inline script security)
app.use((req, res, next) => {
  res.locals.nonce = crypto.randomBytes(16).toString('base64');
  next();
});

// 3. Security headers with Helmet (including CSP)
app.use(
  helmet({
    contentSecurityPolicy: {
      useDefaults: true,
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", (req, res) => `'nonce-${res.locals.nonce}'`],
        styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
        fontSrc: ["'self'", "https://fonts.gstatic.com"],
        connectSrc: ["'self'", "https://*.tidyzenic.com"],
        imgSrc: ["'self'", "data:", "https:"],
      }
    },
    crossOriginEmbedderPolicy: false,
    crossOriginResourcePolicy: { policy: 'cross-origin' }
  })
);

// 4. CORS config
const allowedOrigins = [
  'http://localhost:3000',
  'https://tidyzenic.com',
  'https://www.tidyzenic.com',
  /^https:\/\/([a-z0-9-]+)\.tidyzenic\.com$/i,
];

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.some(entry =>
      entry instanceof RegExp ? entry.test(origin) : entry === origin
    )) {
      return callback(null, true);
    }
    callback(new Error(`❌ CORS rejected: ${origin}`));
  },
  credentials: true
}));

// 5. Tenant resolver middleware
const tenantResolver = require('./middleware/tenantResolver');
app.use(tenantResolver);

// 6. Static files (long cache in production)
app.use(express.static(path.join(__dirname, 'public'), {
  maxAge: process.env.NODE_ENV === 'production' ? '1y' : 0,
  etag: true
}));

// 7. API routes
app.use('/register', require('./routes/register_user'));
app.use('/auth', require('./routes/auth'));
app.use('/api/business', require('./routes/business'));
app.use('/api/support', require('./routes/support'));

// 8. HTML routes
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

// 9. 404 Fallback
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// 10. Global error handler
app.use((err, req, res, next) => {
  console.error('🔥 Unhandled Error:', err.stack || err.message);
  res.status(500).json({
    error: process.env.NODE_ENV === 'production'
      ? 'Internal server error'
      : err.message
  });
});

// 11. Start server
const server = app.listen(PORT, () => {
  const url = process.env.NODE_ENV === 'production'
    ? 'https://tidyzenic.com'
    : `http://localhost:${PORT}`;
  console.log(`✅ Server running at ${url}`);
});

// 12. Graceful shutdown
process.on('SIGINT', () => {
  console.log('🛑 Gracefully shutting down...');
  server.close(() => {
    console.log('✅ Server closed');
    process.exit(0);
  });
});
