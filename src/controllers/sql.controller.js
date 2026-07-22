const fs = require('fs');
const path = require('path');
const generateSqlDeleteService = require('../services/generateSqlDelete.service');

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
