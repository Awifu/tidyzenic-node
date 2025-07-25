require('dotenv').config();

const express = require('express');
const path = require('path');
const helmet = require('helmet');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

// === 1. Security & Middleware ===
app.use(helmet());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));

// === 2. CORS Setup ===
const allowedOrigins = [
  'http://localhost:3000',
  'https://tidyzenic.com',
  'https://www.tidyzenic.com',
  /\.tidyzenic\.com$/ // ✅ Allow subdomains
];

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.some(pattern =>
      pattern instanceof RegExp ? pattern.test(origin) : pattern === origin
    )) {
      return callback(null, true);
    }
    return callback(new Error('Not allowed by CORS'));
  },
  credentials: true
}));

// === 3. Serve Static Frontend ===
app.use(express.static(path.join(__dirname, 'public'), {
  maxAge: process.env.NODE_ENV === 'production' ? '1y' : 0,
  etag: true
}));

// === 4. Multi-Tenant Resolver ===
const tenantResolver = require('./middleware/tenantResolver');
app.use(tenantResolver);

// === 5. API Routes ===
app.use('/register', require('./routes/register_user'));
app.use('/auth', require('./routes/auth'));
app.use('/api', require('./routes/business')); // ✅ Must be BEFORE 404

// === 6. Public Page Routes ===
app.get('/login', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

app.get('/reset-password.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'reset-password.html'));
});

app.get('/verified.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'verified.html'));
});

// === 7. 404 Handler (Must come AFTER routes) ===
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// === 8. Global Error Handler ===
app.use((err, req, res, next) => {
  console.error('🔥 Unhandled Error:', err.stack || err.message);
  res.status(500).json({ error: 'Internal server error' });
});

// === 9. Start Server ===
const server = app.listen(PORT, () => {
  console.log(`✅ Server running at http://localhost:${PORT}`);
});

// === 10. Graceful Shutdown ===
process.on('SIGINT', () => {
  console.log('🛑 Shutting down gracefully...');
  server.close(() => {
    console.log('✅ Server closed. Bye!');
    process.exit(0);
  });
});
