const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const http = require('http');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const app = express();
const mongoose = require('mongoose');
const server = http.createServer(app);

function normalizeMongoUri(raw) {
  if (raw == null) return '';
  let s = String(raw)
    .replace(/^\uFEFF/, '')
    .replace(/\r?\n/g, '')
    .replace(/\t/g, '')
    .trim();
  // Common mistake: pasting "MONGODB_URI=..." into the value field
  s = s.replace(/^(?:MONGODB_URI|MONGO_URI)\s*=\s*/i, '').trim();
  if ((s.startsWith('"') && s.endsWith('"')) || (s.startsWith("'") && s.endsWith("'"))) {
    s = s.slice(1, -1).trim();
  }
  return s;
}

const mongoUri = normalizeMongoUri(process.env.MONGODB_URI || process.env.MONGO_URI);
if (!mongoUri.startsWith('mongodb://') && !mongoUri.startsWith('mongodb+srv://')) {
  console.error('❌ MongoDB: MONGODB_URI (or MONGO_URI) is missing or invalid.');
  console.error('   It must start with mongodb:// or mongodb+srv:// (Atlas “Drivers” connection string).');
  console.error('   In Render: Environment → Key = MONGODB_URI, Value = connection string only (no "MONGODB_URI=" prefix).');
  process.exit(1);
}

// Essential for rate limiting behind Render's load balancer
app.set('trust proxy', 1);

mongoose.connect(mongoUri)
  .then(() => console.log('✅ MongoDB Connected successfully'))
  .catch((err) => {
    console.error('❌ MongoDB Connection Error:', err.message);
    const m = err.message || '';
    if (/querySrv|ENOTFOUND|ECONNREFUSED|timed out|ETIMEDOUT/i.test(m)) {
      console.error('   Hint: Atlas → Network Access → add IP 0.0.0.0/0 (or confirm outbound DNS from Render).');
    }
    if (/bad auth|Authentication failed|SCRAM/i.test(m)) {
      console.error('   Hint: reset the database user password in Atlas and URL-encode special characters in the URI.');
    }
    process.exit(1);
  });

function normalizeOrigin(o) {
  if (!o || typeof o !== 'string') return '';
  let s = o.trim();
  if (s.endsWith('/')) s = s.slice(0, -1);
  return s;
}

const allowedOrigins = (process.env.ALLOWED_ORIGINS || 'http://localhost:3000')
  .split(',')
  .map((o) => normalizeOrigin(o))
  .filter(Boolean);

if (process.env.NODE_ENV === 'production' && allowedOrigins.length === 1 && allowedOrigins[0] === 'http://localhost:3000') {
  console.warn('⚠️  ALLOWED_ORIGINS is still localhost — set your Render frontend URL in Environment.');
}

if (!process.env.JWT_SECRET || String(process.env.JWT_SECRET).trim().length < 16) {
  console.error('❌ JWT_SECRET is missing or too short (min 16 chars). Set it in Render → Environment.');
  process.exit(1);
}

app.use(cors({
  origin: (origin, cb) => {
    if (!origin) return cb(null, true);
    const normalized = normalizeOrigin(origin);
    if (allowedOrigins.includes(normalized)) return cb(null, true);
    console.warn(`CORS blocked origin: ${origin} (allowed: ${allowedOrigins.join(', ')})`);
    return cb(null, false);
  },
  credentials: true,
}));

const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 1000,
  // Attempts have their own limiter with a higher ceiling — skip global for those
  skip: (req) => req.path.startsWith('/api/attempts'),
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many requests, please try again later.' },
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many auth attempts, please try again later.' },
});

// Attempts need a higher ceiling — subjective auto-save fires every few seconds
const attemptLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 2000,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many requests, please try again later.' },
});

app.use(globalLimiter);
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

app.use('/api/auth', authLimiter, require('./src/routes/authRoutes'));
app.use('/api/questions', require('./src/routes/questionRoutes'));
app.use('/api/tests', require('./src/routes/testRoutes'));
app.use('/api/attempts', attemptLimiter, require('./src/routes/attemptRoutes'));
app.use('/api/users', require('./src/routes/userRoutes'));

const { errorHandler, notFound } = require('./src/middlewares/errorMiddleware');

app.get('/', (req, res) => {
  res.send('API is running');
});

app.get('/api/health', (req, res) => {
  const dbState = mongoose.connection.readyState;
  const dbOk = dbState === 1;
  res.status(dbOk ? 200 : 503).json({
    ok: dbOk,
    mongo: dbOk ? 'connected' : ['disconnected', 'connected', 'connecting', 'disconnecting'][dbState] || 'unknown',
  });
});

app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
