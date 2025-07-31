require('dotenv').config();

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

// ==============================
// 1. Middleware: Body, Cookies, Logging
// ==============================
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));

// ==============================
// 2. CSP Nonce
// ==============================
app.use((req, res, next) => {
  res.locals.nonce = crypto.randomBytes(16).toString('base64');
  next();
});

// ==============================
// 3. Security Headers with CSP
// ==============================
app.use(helmet({
  contentSecurityPolicy: {
    useDefaults: true,
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", (req, res) => `'nonce-${res.locals.nonce}'`],
      styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
      fontSrc: ["'self'", 'https://fonts.gstatic.com'],
      imgSrc: ["'self'", 'data:', 'https:'],
      connectSrc: ["'self'", 'https://tidyzenic.com', 'https://*.tidyzenic.com']
    }
  },
  crossOriginEmbedderPolicy: false,
  crossOriginResourcePolicy: { policy: 'cross-origin' }
}));

// ==============================
// 4. CORS
// ==============================
const allowedOrigins = [
  'http://localhost:3000',
  'https://tidyzenic.com',
  'https://www.tidyzenic.com',
  /^https:\/\/([a-z0-9-]+)\.tidyzenic\.com$/i
];

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.some(entry =>
      entry instanceof RegExp ? entry.test(origin) : entry === origin
    )) {
      return callback(null, true);
    }
    return callback(new Error(`❌ CORS rejected: ${origin}`));
  },
  credentials: true
}));

// ==============================
// 5. Tenant Resolver Middleware
// ==============================
const tenantResolver = require('./middleware/tenantResolver');
app.use(tenantResolver);

// ==============================
// 6. Static Assets
// ==============================
app.use(express.static(path.join(__dirname, 'public'), {
  maxAge: process.env.NODE_ENV === 'production' ? '1y' : 0,
  etag: true
}));

// ==============================
// 7. API Routes
// ==============================
app.use('/register', require('./routes/register_user'));
app.use('/auth', require('./routes/auth'));
app.use('/api/business', require('./routes/business'));
app.use('/api', require('./routes/support')); // handles /api/tickets and /api/replies

// ==============================
// 8. HTML Page Routes
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
// 9. 404 Not Found
// ==============================
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// ==============================
// 10. Global Error Handler
// ==============================
app.use((err, req, res, next) => {
  console.error('🔥 Unhandled Error:', err.stack || err.message);
  res.status(500).json({
    error: process.env.NODE_ENV === 'production'
      ? 'Internal server error'
      : err.message
  });
});

// ==============================
// 11. HTTP + Socket.IO Setup
// ==============================
const httpServer = http.createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: allowedOrigins,
    credentials: true
  }
});

// Expose Socket.IO for use in routes
app.set('io', io);

io.on('connection', (socket) => {
  console.log('📡 Socket.IO client connected');
});

// ==============================
// 12. Start Server
// ==============================
httpServer.listen(PORT, () => {
  const url = process.env.NODE_ENV === 'production'
    ? 'https://tidyzenic.com'
    : `http://localhost:${PORT}`;
  console.log(`✅ Server running at ${url}`);
});

// ==============================
// 13. Graceful Shutdown
// ==============================
process.on('SIGINT', () => {
  console.log('🛑 Gracefully shutting down...');
  httpServer.close(() => {
    console.log('✅ Server closed');
    process.exit(0);
  });
});
