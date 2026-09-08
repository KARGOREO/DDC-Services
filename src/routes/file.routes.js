const express = require('express');
const router = express.Router();
const multer = require('multer');
const fileController = require('../controllers/file.controller');
const reportController = require('../controllers/report.controller');

const upload = multer({ dest: 'uploads/' });

router.get('/history', fileController.getFileHistory);
router.get('/download', fileController.downloadFile);

// Alias routes for json-to-excel
router.post('/json-to-excel', upload.single('jsonFile'), reportController.jsonToExcelHandler);
router.get('/sample/test-json-excel', reportController.convertSampleGovTestHandler);
router.get('/sample/bma-excel', reportController.convertSampleUserBmaHandler);

module.exports = router;
