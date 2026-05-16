const express = require('express');
const router = express.Router();
const path = require('path');
const { getGraph, getCharacter, getTags, expandNode } = require(path.join(__dirname, '..', 'controllers', 'graphController'));

// GET /api/graph?maxHsk=3&context=cozinha&mode=evo
router.get('/', getGraph);

// GET /api/graph/tags
router.get('/tags', getTags);

// GET /api/graph/expand/:id?mode=evo&maxHsk=6
router.get('/expand/:id', expandNode);

// GET /api/graph/character/:id
router.get('/character/:id', getCharacter);

module.exports = router;
