const fs = require('fs');
const path = require('path');
const analyzeDelayService = require('../services/analyzeDelay.service');
const validateIdentityService = require('../services/validateIdentity.service');
const findMissingDataService = require('../services/findMissingData.service');
const jsonToExcelService = require('../services/jsonToExcel.service');

const cleanupFiles = (files) => {
    if (!files) return;
    if (Array.isArray(files)) {
        files.forEach(file => {
            if (fs.existsSync(file.path)) fs.unlinkSync(file.path);
        });
        return;
    }
    Object.values(files).forEach(fileArray => {
        if (Array.isArray(fileArray)) {
            fileArray.forEach(file => {
                if (fs.existsSync(file.path)) {
                    fs.unlinkSync(file.path);
                }
            });
        } else if (fileArray && fileArray.path && fs.existsSync(fileArray.path)) {
            fs.unlinkSync(fileArray.path);
        }
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

exports.jsonToExcelHandler = async (req, res, next) => {
    try {
        let inputSource;
        const flatten = req.body.flatten !== 'false' && req.body.flatten !== false;
        const mode = req.body.mode || req.query.mode || 'auto';

        let filters = req.body.filters;
        if (typeof filters === 'string') {
            try {
                filters = JSON.parse(filters);
            } catch (e) {
                filters = null;
            }
        }

        let selectedColumns = req.body.selectedColumns;
        if (typeof selectedColumns === 'string') {
            try {
                selectedColumns = JSON.parse(selectedColumns);
            } catch (e) {
                selectedColumns = selectedColumns.split(',').map(s => s.trim()).filter(Boolean);
            }
        }

        if (req.file) {
            inputSource = req.file.path;
        } else if (req.body && req.body.jsonData) {
            inputSource = req.body.jsonData;
        } else if (req.query && req.query.useSample === 'true') {
            const samplePath = path.join(process.cwd(), 'src', 'item-excel', 'user_bma.json');
            if (!fs.existsSync(samplePath)) {
                return res.status(404).json({ error: 'ไม่พบไฟล์ตัวอย่าง user_bma.json ในระบบ' });
            }
            inputSource = samplePath;
        } else {
            return res.status(400).json({ error: 'กรุณาอัปโหลดไฟล์ JSON หรือส่งข้อมูล JSON มาในคำขอ' });
        }

        const originalName = req.file ? req.file.originalname : undefined;
        const result = await jsonToExcelService.execute(inputSource, { flatten, mode, originalName, filters, selectedColumns });
        if (req.file) {
            cleanupFiles([req.file]);
        }

        res.setHeader('Content-Disposition', `attachment; filename="${result.fileName}"`);
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.download(result.outputPath, result.fileName);
    } catch (error) {
        if (req.file) {
            cleanupFiles([req.file]);
        }
        next(error);
    }
};

exports.convertSampleUserBmaHandler = async (req, res, next) => {
    try {
        const samplePath = path.join(process.cwd(), 'src', 'item-excel', 'user_bma.json');
        if (!fs.existsSync(samplePath)) {
            return res.status(404).json({ error: 'ไม่พบไฟล์ตัวอย่าง user_bma.json ในระบบ' });
        }

        const result = await jsonToExcelService.execute(samplePath, { mode: 'standard' });
        res.setHeader('Content-Disposition', `attachment; filename="${result.fileName}"`);
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.download(result.outputPath, result.fileName);
    } catch (error) {
        next(error);
    }
};

exports.convertSampleGovTestHandler = async (req, res, next) => {
    try {
        let samplePath = path.join(process.cwd(), 'src', 'item-excel', 'test.json');
        if (!fs.existsSync(samplePath)) {
            samplePath = 'c:/Users/008/Downloads/test.json';
        }
        if (!fs.existsSync(samplePath)) {
            return res.status(404).json({ error: 'ไม่พบไฟล์ตัวอย่าง test.json ในระบบ' });
        }

        const result = await jsonToExcelService.execute(samplePath, { mode: 'gov' });
        res.setHeader('Content-Disposition', `attachment; filename="${result.fileName}"`);
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.download(result.outputPath, result.fileName);
    } catch (error) {
        next(error);
    }
};

