const fs = require('fs');
const path = require('path');
const analyzeDelayService = require('../services/analyzeDelay.service');
const validateIdentityService = require('../services/validateIdentity.service');
const findMissingDataService = require('../services/findMissingData.service');

const cleanupFiles = (files) => {
    if (!files) return;
    Object.values(files).forEach(fileArray => {
        fileArray.forEach(file => {
            if (fs.existsSync(file.path)) {
                fs.unlinkSync(file.path);
            }
        });
    });
};

exports.analyzeDelayHandler = async (req, res, next) => {
    try {
        if (!req.files || !req.files.d506File || !req.files.eFormFile) {
            return res.status(400).json({ error: 'กรุณาอัปโหลดไฟล์ D506 และ E-Form' });
        }

        const d506Path = req.files.d506File[0].path;
        const eFormPath = req.files.eFormFile[0].path;

        const result = await analyzeDelayService.execute(d506Path, eFormPath);
        cleanupFiles(req.files);
        res.download(result.outputPath);
    } catch (error) {
        cleanupFiles(req.files);
        next(error);
    }
};

exports.validateIdentityHandler = async (req, res, next) => {
    try {
        if (!req.files || !req.files.dataFile || !req.files.schemaFile) {
            return res.status(400).json({ error: 'กรุณาอัปโหลดไฟล์ข้อมูล (Data) และโครงสร้าง (Schema)' });
        }

        const dataPath = req.files.dataFile[0].path;
        const schemaPath = req.files.schemaFile[0].path;

        const result = await validateIdentityService.execute(dataPath, schemaPath);
        cleanupFiles(req.files);
        
        if (result.hasErrors) {
            res.download(result.outputPath);
        } else {
            res.json(result);
        }
    } catch (error) {
        cleanupFiles(req.files);
        next(error);
    }
};

exports.findMissingHandler = async (req, res, next) => {
    try {
        if (!req.files || !req.files.d506File || !req.files.e506File) {
            return res.status(400).json({ error: 'กรุณาอัปโหลดไฟล์ D506 และ E506' });
        }

        const d506Path = req.files.d506File[0].path;
        const e506Path = req.files.e506File[0].path;

        const result = await findMissingDataService.execute(d506Path, e506Path);
        cleanupFiles(req.files);
        res.json(result);
    } catch (error) {
        cleanupFiles(req.files);
        next(error);
    }
};
