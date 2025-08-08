require('dotenv').config();
require('./jobs/reviewScheduler');

const express = require('express');
const path = require('path');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');
const cors = require('cors');
const crypto = require('crypto');
const helmet = require('helmet');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const PORT = process.env.PORT || 3000;

// 1. Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
// Load translations per request
const languageMiddleware = require('./middleware/language');
app.use(languageMiddleware);

app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));

// 2. CSP Nonce for inline scripts
app.use((req, res, next) => {
  res.locals.nonce = crypto.randomBytes(16).toString('base64');
  next();
});
const templateRoutes = require('./routes/templates');
app.use('/api/templates', templateRoutes);

// 3. Security Headers with Helmet and CSP
app.use(
  helmet({
    contentSecurityPolicy: {
      useDefaults: true,
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: [
          "'self'",
          "'unsafe-inline'", // Required if you inject inline scripts with nonce
          'https://cdn.jsdelivr.net', // For Chart.js and other CDN scripts
        ],
        styleSrc: [
          "'self'",
          "'unsafe-inline'", // Required for Tailwind, inline styles
          'https://fonts.googleapis.com',
        ],
        fontSrc: ["'self'", 'https://fonts.gstatic.com'],
        imgSrc: ["'self'", 'data:', 'https:'],
        connectSrc: ["'self'", 'https://tidyzenic.com', 'https://*.tidyzenic.com'],
        objectSrc: ["'none'"],
        upgradeInsecureRequests: [],
      },
    },
    crossOriginEmbedderPolicy: false,
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  })
);

// 4. CORS Configuration
const allowedOrigins = [
  'http://localhost:3000',
  'https://tidyzenic.com',
  'https://www.tidyzenic.com',
  /^https:\/\/([a-z0-9-]+)\.tidyzenic\.com$/i,
];

app.use(
  cors({
    origin: (origin, callback) => {
      if (
        !origin ||
        allowedOrigins.some((entry) =>
          entry instanceof RegExp ? entry.test(origin) : entry === origin
        )
      ) {
        callback(null, true);
      } else {
        callback(new Error(`❌ CORS rejected: ${origin}`));
      }
    },
    credentials: true,
  })
);

// 5. Tenant Middleware
const tenantResolver = require('./middleware/tenantResolver');
app.use(tenantResolver);

// 6. Static Files
app.use(
  express.static(path.join(__dirname, 'public'), {
    maxAge: process.env.NODE_ENV === 'production' ? '1y' : 0,
    etag: true,
  })
);

// 7. API Routes
app.use('/register', require('./routes/register_user'));
app.use('/auth', require('./routes/auth'));
app.use('/api/business', require('./routes/business'));
app.use('/api/tickets', require('./routes/tickets'));
app.use('/api/reviews', require('./routes/reviews'));
app.use('/api/reviews', require('./routes/reviewAnalytics'));
app.use('/api/sms', require('./routes/sms'));

// 8. Admin HTML Pages
app.get('/admin/support.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin', 'support_ticket.html'));
});

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
const translationRoute = require('./routes/translation');
app.use('/admin/translation', translationRoute);
// 9. 404 Handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// 10. Error Handler
app.use((err, req, res, next) => {
  console.error('🔥 Unhandled Error:', err.stack || err.message);
  res.status(500).json({
    error:
      process.env.NODE_ENV === 'production'
        ? 'Internal server error'
        : err.message,
  });
});

// 11. Start Server with Socket.IO
const httpServer = http.createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: allowedOrigins,
    credentials: true,
  },
});


app.set('io', io);

io.on('connection', (socket) => {
  console.log('📡 Client connected');
});

httpServer.listen(PORT, () => {
  const url =
    process.env.NODE_ENV === 'production'
      ? 'https://tidyzenic.com'
      : `http://localhost:${PORT}`;
  console.log(`✅ Server running at ${url}`);
});

// 12. Graceful Shutdown
process.on('SIGINT', () => {
  console.log('🛑 Gracefully shutting down...');
  httpServer.close(() => {
    console.log('✅ Server closed');
    process.exit(0);
  });
});
