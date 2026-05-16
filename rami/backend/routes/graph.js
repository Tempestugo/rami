const express = require('express');
const router = express.Router();
const { getGraph, getCharacter, getTags } = require('../controllers/graphController');

// GET /api/graph?maxHsk=3&context=cozinha&mode=evo
router.get('/', getGraph);

// GET /api/graph/tags
router.get('/tags', getTags);

// GET /api/graph/character/:id
router.get('/character/:id', getCharacter);

module.exports = router;
