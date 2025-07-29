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
// 1. Security Middleware
// ==============================
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'"],
        styleSrc: ["'self'", "'unsafe-inline'", 'https:'],
        imgSrc: ["'self'", 'data:', 'https:'],
        connectSrc: ["'self'", 'https:', 'https://*.tidyzenic.com'],
      },
    },
    crossOriginEmbedderPolicy: false,
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  })
);

// ==============================
// 2. General Middleware
// ==============================
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));

// ==============================
// 3. CORS Middleware
// ==============================
const allowedOrigins = [
  'http://localhost:3000',
  'https://tidyzenic.com',
  'https://www.tidyzenic.com',
  /^https:\/\/([a-z0-9-]+\.)?tidyzenic\.com$/,
];

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.some((o) => (o instanceof RegExp ? o.test(origin) : o === origin))) {
        return callback(null, true);
      }
      callback(new Error('❌ Not allowed by CORS: ' + origin));
    },
    credentials: true,
  })
);

// ==============================
// 4. Static Assets
// ==============================
app.use(
  express.static(path.join(__dirname, 'public'), {
    maxAge: process.env.NODE_ENV === 'production' ? '1y' : 0,
    etag: true,
  })
);

// ==============================
// 5. Subdomain/Tenant Detection
// ==============================
const tenantResolver = require('./middleware/tenantResolver');
app.use(tenantResolver);

// ==============================
// 6. API Routes
// ==============================
app.use('/register', require('./routes/register_user'));
app.use('/auth', require('./routes/auth'));
app.use('/api/business', require('./routes/business'));
app.use('/api/support', require('./routes/support'));

// ==============================
// 7. HTML File Routes
// ==============================
const sendPublicFile = (filename) => (req, res) => {
  res.sendFile(path.join(__dirname, 'public', filename));
};

app.get(['/login', '/login.html'], sendPublicFile('login.html'));
app.get('/reset-password.html', sendPublicFile('reset-password.html'));
app.get('/verified.html', sendPublicFile('verified.html'));

// 🚀 Default dashboard route for all tenants
app.get(['/admin/dashboard.html'], sendPublicFile('admin-dashboard.html'));

// Optional: serve specific pages manually if needed
app.get('/admin/support.html', sendPublicFile('admin/support.html'));

// ==============================
// 8. Fallback 404
// ==============================
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// ==============================
// 9. Error Handler
// ==============================
app.use((err, req, res, next) => {
  console.error('🔥 Unhandled Error:', err.stack || err.message);
  res.status(500).json({ error: 'Internal server error' });
});

// ==============================
// 10. Server Startup
// ==============================
const server = app.listen(PORT, () => {
  console.log(`✅ Server running at http://localhost:${PORT}`);
});

// ==============================
// 11. Graceful Shutdown
// ==============================
process.on('SIGINT', () => {
  console.log('🛑 Shutting down gracefully...');
  server.close(() => {
    console.log('✅ Server closed. Bye!');
    process.exit(0);
  });
});
