const express = require('express');
const router = express.Router();
const { buildPhrase } = require('../controllers/phraseController');

// POST /api/phrases/build
router.post('/build', buildPhrase);

module.exports = router;
