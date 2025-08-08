// app.js
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
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const { Server } = require('socket.io');

const app = express();
const PORT = Number(process.env.PORT || 3000);
const PROD = process.env.NODE_ENV === 'production';
const APP_DOMAIN = process.env.APP_DOMAIN || 'tidyzenic.com';

// ---------- 0. Trust proxy (behind CDN/ELB) ----------
app.set('trust proxy', 1);

// ---------- 1. Core middleware ----------
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));
app.use(cookieParser());
app.use(compression());
app.use(morgan(PROD ? 'combined' : 'dev'));

// ---------- 2. Per-request CSP nonce ----------
app.use((req, res, next) => {
  res.locals.nonce = crypto.randomBytes(16).toString('base64');
  next();
});

// ---------- 3. Security headers with Helmet (CSP uses the nonce) ----------
app.use((req, res, next) => {
  const nonce = res.locals.nonce;

  helmet({
    // Fine-tuned CSP; allow inline only via nonce
    contentSecurityPolicy: {
      useDefaults: true,
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: [
          "'self'",
          // Only allow inline scripts that include this nonce
          `'nonce-${nonce}'`,
          'https://cdn.jsdelivr.net',
          // reCAPTCHA / gstatic (if you use it on register.html)
          'https://www.google.com',
          'https://www.gstatic.com',
        ],
        styleSrc: [
          "'self'",
          "'unsafe-inline'", // needed for Tailwind runtime classes or inline styles
          'https://fonts.googleapis.com',
          'https://cdn.jsdelivr.net'
        ],
        fontSrc: ["'self'", 'https://fonts.gstatic.com', 'data:'],
        imgSrc: ["'self'", 'data:', 'https:'],
        connectSrc: [
          "'self'",
          // Your apex + subdomains
          `https://${APP_DOMAIN}`,
          `https://*.${APP_DOMAIN}`,
          // Socket.io over HTTPS/WSS
          'wss:',
          'https:',
        ],
        frameSrc: [
          "'self'",
          'https://www.google.com', // reCAPTCHA widget
        ],
        objectSrc: ["'none'"],
        baseUri: ["'self'"],
        upgradeInsecureRequests: PROD ? [] : null,
      },
    },
    referrerPolicy: { policy: 'no-referrer' },
    crossOriginEmbedderPolicy: false,
    crossOriginResourcePolicy: { policy: 'cross-origin' },
    hsts: PROD ? { maxAge: 31536000, includeSubDomains: true, preload: true } : false,
    noSniff: true,
    xssFilter: true,
  })(req, res, next);
});

// ---------- 4. i18n middleware (your existing one) ----------
const languageMiddleware = require('./middleware/language');
app.use(languageMiddleware);

// ---------- 5. CORS ----------
const allowedOrigins = [
  'http://localhost:3000',
  `https://${APP_DOMAIN}`,
  `https://www.${APP_DOMAIN}`,
  new RegExp(`^https:\\/\\/([a-z0-9-]+)\\.${APP_DOMAIN.replace('.', '\\.')}\\/?$`, 'i'),
];

app.use(
  cors({
    origin(origin, callback) {
      if (
        !origin ||
        allowedOrigins.some((entry) =>
          entry instanceof RegExp ? entry.test(origin) : entry === origin
        )
      ) {
        return callback(null, true);
      }
      return callback(new Error(`❌ CORS rejected: ${origin}`));
    },
    credentials: true,
  })
);

// ---------- 6. Static files ----------
app.use(
  express.static(path.join(__dirname, 'public'), {
    maxAge: PROD ? '1y' : 0,
    etag: true,
    setHeaders(res, filePath) {
      // Cache bust only for immutable assets (basic heuristic)
      if (/\.(js|css|png|jpg|jpeg|gif|svg|woff2?)$/i.test(filePath)) {
        res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
      }
    },
  })
);

// ---------- 7. Rate limits (auth/register sensitive endpoints) ----------
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100, // Adjust as desired
  standardHeaders: true,
  legacyHeaders: false,
});
const writeLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
});

app.use('/auth', authLimiter);
app.use('/register', writeLimiter);

// ---------- 8. Routers ----------
const plansRouter = require('./routes/plans');
const templateRoutes = require('./routes/templates');

app.use('/plans', plansRouter);
app.use('/api/templates', templateRoutes);
app.use('/register', require('./routes/register_user'));
app.use('/auth', require('./routes/auth'));
app.use('/api/business', require('./routes/business'));
app.use('/api/tickets', require('./routes/tickets'));
app.use('/api/reviews', require('./routes/reviews'));
app.use('/api/reviews', require('./routes/reviewAnalytics'));
app.use('/api/sms', require('./routes/sms'));

// ---------- 9. Admin HTML pages & helpers ----------
const sendFile = (file) => (req, res) => res.sendFile(path.join(__dirname, 'public', file));

app.get('/admin/support.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin', 'support_ticket.html'));
});

app.get(['/login', '/login.html'], (req, res) => {
  const host = req.hostname;
  if (host !== APP_DOMAIN && host !== `www.${APP_DOMAIN}`) {
    return res.redirect(`https://${APP_DOMAIN}/login.html`);
  }
  res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

app.get('/reset-password.html', sendFile('reset-password.html'));
app.get('/verified.html', sendFile('verified.html'));
app.get('/admin/dashboard', (req, res) => res.redirect('/admin/admin-dashboard.html'));

// Translation route
const translationRoute = require('./routes/translation');
app.use('/admin/translation', translationRoute);

// ---------- 10. Health checks ----------
app.get('/healthz', (req, res) => res.status(200).json({ ok: true }));
app.get('/readyz', (req, res) => res.status(200).json({ ready: true }));

// ---------- 11. 404 handler ----------
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// ---------- 12. Error handler ----------
app.use((err, req, res, next) => {
  const status = err.status || 500;
  if (!PROD) {
    console.error('🔥 Unhandled Error:', err.stack || err.message);
  } else {
    console.error('🔥 Unhandled Error:', err.message);
  }
  res.status(status).json({
    error: PROD ? 'Internal server error' : err.message,
  });
});

// ---------- 13. HTTP + Socket.IO ----------
const httpServer = http.createServer(app);

const io = new Server(httpServer, {
  cors: {
    origin(origin, callback) {
      if (
        !origin ||
        allowedOrigins.some((entry) =>
          entry instanceof RegExp ? entry.test(origin) : entry === origin
        )
      ) {
        return callback(null, true);
      }
      return callback(new Error(`❌ Socket.IO CORS rejected: ${origin}`));
    },
    credentials: true,
  },
  transports: ['websocket', 'polling'],
});

app.set('io', io);

io.on('connection', (socket) => {
  console.log('📡 Client connected');
  socket.on('disconnect', () => {
    console.log('📴 Client disconnected');
  });
});

// ---------- 14. Start server ----------
httpServer.listen(PORT, () => {
  const url = PROD ? `https://${APP_DOMAIN}` : `http://localhost:${PORT}`;
  console.log(`✅ Server running at ${url}`);
});

// ---------- 15. Graceful shutdown ----------
function shutdown(signal) {
  console.log(`🛑 ${signal} received. Shutting down gracefully...`);
  httpServer.close(() => {
    console.log('✅ Server closed');
    process.exit(0);
  });
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
