const express = require('express');
const router = express.Router();
const fileController = require('../controllers/file.controller');

router.get('/history', fileController.getFileHistory);

module.exports = router;
