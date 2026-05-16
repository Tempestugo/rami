const express = require('express');
const router = express.Router();
const path = require('path');
const { buildPhrase } = require(path.join(__dirname, '..', 'controllers', 'phraseController'));

// POST /api/phrases/build
router.post('/build', buildPhrase);

module.exports = router;
