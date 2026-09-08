const express = require('express');
const router = express.Router();
const fileController = require('../controllers/file.controller');

router.get('/history', fileController.getFileHistory);
router.get('/download', fileController.downloadFile);

module.exports = router;
