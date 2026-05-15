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
  if (raw == null || typeof raw !== 'string') return '';
  let s = raw.trim();
  if ((s.startsWith('"') && s.endsWith('"')) || (s.startsWith("'") && s.endsWith("'"))) {
    s = s.slice(1, -1).trim();
  }
  return s;
}

const mongoUri = normalizeMongoUri(process.env.MONGODB_URI || process.env.MONGO_URI);
if (!mongoUri.startsWith('mongodb://') && !mongoUri.startsWith('mongodb+srv://')) {
  console.error('❌ MongoDB: MONGODB_URI (or MONGO_URI) is missing or invalid.');
  console.error('   It must start with mongodb:// or mongodb+srv:// (Atlas “Drivers” connection string).');
  console.error('   In Render: Web Service → Environment → set secret MONGODB_URI with no extra quotes or spaces.');
  process.exit(1);
}

// Essential for rate limiting behind Render's load balancer
app.set('trust proxy', 1);

mongoose.connect(mongoUri)
  .then(() => console.log('✅ MongoDB Connected successfully'))
  .catch(err => {
    console.error('❌ MongoDB Connection Error:', err.message);
    process.exit(1); // Exit if DB connection fails in production
  });

const allowedOrigins = (process.env.ALLOWED_ORIGINS || 'http://localhost:3000')
  .split(',').map(o => o.trim()).filter(Boolean);

app.use(cors({
  origin: (origin, cb) => {
    if (!origin || allowedOrigins.includes(origin)) return cb(null, true);
    cb(new Error(`CORS: origin ${origin} not allowed`));
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
  res.send('API is running on Firebase...');
});

app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
