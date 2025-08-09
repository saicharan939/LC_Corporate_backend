// server.js
// This file sets up the Node.js Express server, connects to MongoDB,
// and defines the API routes for the URL shortener application.

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const shortid = require('shortid');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;
const corsOptions = {
  origin: 'https://lc-corporate-frontend.vercel.app/', // Replace with your Vercel URL
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type'],
  credentials: true,
};
// --- Middleware ---
// Enable Cross-Origin Resource Sharing to allow requests from the frontend
app.use(cors(corsOptions));
app.options('*', cors(corsOptions));
// Parse incoming JSON requests
app.use(express.json());

// --- MongoDB Connection ---
// Connect to the MongoDB database using the URI from environment variables.
// Using mongoose for object data modeling (ODM).
const MONGO_URI = process.env.MONGO_URI;

mongoose.connect(MONGO_URI);

const connection = mongoose.connection;
connection.once('open', () => {
  console.log('MongoDB database connection established successfully');
});

// --- Mongoose Schema and Model ---
// Defines the structure for the URL documents stored in MongoDB.
const urlSchema = new mongoose.Schema({
  originalUrl: { type: String, required: true },
  shortCode: { type: String, required: true, default: shortid.generate },
  shortUrl: { type: String, required: true },
  clicks: { type: Number, required: true, default: 0 },
  date: { type: Date, default: Date.now },
});

const Url = mongoose.model('Url', urlSchema);

// --- API Routes ---

/**
 * @route   POST /api/shorten
 * @desc    Create a short URL
 * @access  Public
 */
app.post('/api/shorten', async (req, res) => {
  const { longUrl } = req.body;
  const baseUrl = process.env.BASE_URL || `http://localhost:${PORT}`;

  // Basic validation for the long URL
  if (!longUrl) {
    return res.status(400).json('Invalid URL: Please provide a URL.');
  }

  try {
    // Check if the URL has already been shortened
    let url = await Url.findOne({ originalUrl: longUrl });

    if (url) {
      // If it exists, return the existing short URL
      res.json(url);
    } else {
      // If it's a new URL, generate a new short code
      const shortCode = shortid.generate();
      const shortUrl = `${baseUrl}/${shortCode}`;

      // Create a new URL document
      url = new Url({
        originalUrl: longUrl,
        shortCode,
        shortUrl,
        date: new Date(),
      });

      // Save the new URL to the database
      await url.save();
      res.json(url);
    }
  } catch (err) {
    console.error(err);
    res.status(500).json('Server error');
  }
});

/**
 * @route   GET /:shortcode
 * @desc    Redirect to the original long URL
 * @access  Public
 */
app.get('/:shortcode', async (req, res) => {
  try {
    // Find the URL by its short code in the database
    const url = await Url.findOne({ shortCode: req.params.shortcode });

    if (url) {
      // If found, increment the click count
      url.clicks++;
      await url.save();
      // Redirect the user to the original URL
      return res.redirect(url.originalUrl);
    } else {
      // If not found, return a 404 error
      return res.status(404).json('No URL found');
    }
  } catch (err) {
    console.error(err);
    res.status(500).json('Server error');
  }
});

/**
 * @route   GET /api/urls
 * @desc    Get all shortened URLs (for admin page)
 * @access  Public (in a real app, this should be protected)
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


// --- Start Server ---
app.listen(PORT, () => {
  console.log(`Server is running on port: ${PORT}`);
});
