// index.js
// This file sets up the Node.js Express server, connects to MongoDB,
// and defines the API routes for the URL shortener application.

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const shortid = require('shortid');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

// --- Middleware ---

// This single CORS configuration is sufficient to handle all requests,
// including the OPTIONS preflight requests sent by browsers.
const corsOptions = {
  origin: 'https://lc-corporate-frontend.vercel.app', // Your Vercel URL
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type'],
  credentials: true,
};
app.use(cors(corsOptions));

// Parse incoming JSON requests
app.use(express.json());

// --- MongoDB Connection ---
const MONGO_URI = process.env.MONGO_URI;

mongoose.connect(MONGO_URI)
  .then(() => console.log('MongoDB database connection established successfully'))
  .catch(err => console.error('MongoDB connection error:', err));


// --- Mongoose Schema and Model ---
const urlSchema = new mongoose.Schema({
  originalUrl: { type: String, required: true },
  shortCode: { type: String, required: true, default: shortid.generate },
  shortUrl: { type: String, required: true },
  clicks: { type: Number, required: true, default: 0 },
  date: { type: Date, default: Date.now },
});

const Url = mongoose.model('Url', urlSchema);

// --- API Routes ---
// NOTE: Specific routes are defined BEFORE general/wildcard routes.

/**
 * @route   POST /api/shorten
 * @desc    Create a short URL
 */
app.post('/api/shorten', async (req, res) => {
  const { longUrl } = req.body;
  const baseUrl = process.env.BASE_URL || `http://localhost:${PORT}`;

  if (!longUrl) {
    return res.status(400).json('Invalid URL: Please provide a URL.');
  }

  try {
    let url = await Url.findOne({ originalUrl: longUrl });

    if (url) {
      res.json(url);
    } else {
      const shortCode = shortid.generate();
      const shortUrl = `${baseUrl}/${shortCode}`;

      url = new Url({
        originalUrl: longUrl,
        shortCode,
        shortUrl,
        date: new Date(),
      });

      await url.save();
      res.json(url);
    }
  } catch (err) {
    console.error(err);
    res.status(500).json('Server error');
  }
});

/**
 * @route   GET /api/urls
 * @desc    Get all shortened URLs (for admin page)
 */
app.get('/api/urls', async (req, res) => {
    try {
        const urls = await Url.find().sort({ date: -1 });
        res.json(urls);
    } catch (err) {
        console.error(err);
        res.status(500).json('Server error');
    }
});

/**
 * @route   GET /:shortcode
 * @desc    Redirect to the original long URL (This is a general route and must be last)
 */
app.get('/:shortcode', async (req, res) => {
  try {
    const url = await Url.findOne({ shortCode: req.params.shortcode });

    if (url) {
      url.clicks++;
      await url.save();
      return res.redirect(url.originalUrl);
    } else {
      return res.status(404).json('No URL found');
    }
  } catch (err) {
    console.error(err);
    res.status(500).json('Server error');
  }
});


// --- Start Server ---
app.listen(PORT, () => {
  console.log(`Server is running on port: ${PORT}`);
});
