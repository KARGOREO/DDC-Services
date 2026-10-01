const fs = require('fs');
const path = require('path');
const generateSqlDeleteService = require('../services/generateSqlDelete.service');
const generateSqlUpdateAddressService = require('../services/generateSqlUpdateAddress.service');

exports.generateSqlDeleteHandler = async (req, res, next) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'กรุณาอัปโหลดไฟล์ Excel' });
        }

        const originalName = req.file.originalname;
        const excelDir = path.join(process.cwd(), 'item-excel');
        
        if (!fs.existsSync(excelDir)) {
            fs.mkdirSync(excelDir, { recursive: true });
        }

        const targetPath = path.join(excelDir, originalName);

        // ย้ายไฟล์จาก uploads ไปที่ item-excel
        fs.renameSync(req.file.path, targetPath);

        const result = await generateSqlDeleteService.execute(targetPath, originalName);

        if (result.success) {
            res.download(result.outputPath);
        } else {
            res.status(400).json(result);
        }
    } catch (error) {
        if(req.file && fs.existsSync(req.file.path)) {
             fs.unlinkSync(req.file.path);
        }
        next(error); // ส่งให้ Global Error Handler
    }
};

exports.generateSqlUpdateAddressHandler = async (req, res, next) => {
    try {
        let jsonData = req.body.data || req.body;

        // รองรับกรณีส่งไฟล์ JSON มาเป็น Multipart form
        if (req.file) {
            const fileContent = fs.readFileSync(req.file.path, 'utf-8');
            jsonData = JSON.parse(fileContent);
            if (fs.existsSync(req.file.path)) {
                fs.unlinkSync(req.file.path);
            }
        }

        // กรณี jsonData ส่งมาเป็น string JSON
        if (typeof jsonData === 'string') {
            try {
                jsonData = JSON.parse(jsonData);
            } catch (e) {
                return res.status(400).json({ error: 'รูปแบบ JSON ไม่ถูกต้อง' });
            }
        }

        if (!Array.isArray(jsonData)) {
            return res.status(400).json({ error: 'ข้อมูลต้องเป็น Array ของ JSON objects' });
        }

        const tableName = req.body.tableName || 'data';
        const result = await generateSqlUpdateAddressService.execute(jsonData, { tableName });

        // ถ้า query param หรือ body ระบุ download=true หรือให้ดาวน์โหลดไฟล์ .sql
        if (req.query.download === 'true' || req.body.download === true) {
            return res.download(result.outputPath);
        }

        return res.json(result);
    } catch (error) {
        if (req.file && fs.existsSync(req.file.path)) {
            fs.unlinkSync(req.file.path);
        }
        next(error);
    }
};

