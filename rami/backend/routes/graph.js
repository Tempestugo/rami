const express = require('express');
const router = express.Router();
const { getGraph, getCharacter, getTags, expandNode } = require('../controllers/graphController');

// GET /api/graph?maxHsk=3&context=cozinha&mode=evo
router.get('/', getGraph);

// GET /api/graph/tags
router.get('/tags', getTags);

// GET /api/graph/expand/:id?mode=evo&maxHsk=6
router.get('/expand/:id', expandNode);

// GET /api/graph/character/:id
router.get('/character/:id', getCharacter);

module.exports = router;
