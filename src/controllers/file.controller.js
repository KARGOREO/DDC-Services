const fs = require('fs');
const path = require('path');

const getFilesDetails = (dirPath) => {
    if (!fs.existsSync(dirPath)) return [];
    
    return fs.readdirSync(dirPath)
        .filter(file => fs.statSync(path.join(dirPath, file)).isFile())
        .map(file => {
            const stats = fs.statSync(path.join(dirPath, file));
            return {
                name: file,
                size: (stats.size / 1024).toFixed(2) + ' KB',
                createdAt: stats.birthtime,
                timestamp: stats.birthtimeMs
            };
        });
};

exports.getFileHistory = (req, res, next) => {
    try {
        const itemExcelDir = path.join(process.cwd(), 'item-excel');
        const sqlDir = path.join(process.cwd(), 'delete-e506-by-sql');

        const excelFiles = getFilesDetails(itemExcelDir);
        const sqlFiles = getFilesDetails(sqlDir);

        const allFiles = [
            ...excelFiles.map(f => ({ ...f, type: 'excel', folder: 'item-excel' })),
            ...sqlFiles.map(f => ({ ...f, type: 'sql', folder: 'delete-e506-by-sql' }))
        ];

        // Sort by newest
        allFiles.sort((a, b) => b.timestamp - a.timestamp);

        // Group by Date (YYYY-MM-DD)
        const groupedFiles = allFiles.reduce((acc, file) => {
            const dateStr = file.createdAt.toISOString().split('T')[0];
            if (!acc[dateStr]) acc[dateStr] = [];
            acc[dateStr].push(file);
            return acc;
        }, {});

        // Format into array for easier frontend mapping
        const result = Object.keys(groupedFiles).map(date => ({
            date,
            files: groupedFiles[date]
        }));

        res.json({ success: true, history: result });
    } catch (error) {
        next(error);
    }
};

exports.downloadFile = (req, res, next) => {
    try {
        const { folder, name } = req.query;
        if (!name) return res.status(400).json({ error: 'กรุณาระบุชื่อไฟล์' });
        
        const allowedFolders = ['item-excel', 'delete-e506-by-sql', 'uploads'];
        const targetFolder = allowedFolders.includes(folder) ? folder : 'item-excel';
        const filePath = path.join(process.cwd(), targetFolder, path.basename(name));

        if (!fs.existsSync(filePath)) {
            return res.status(404).json({ error: 'ไม่พบไฟล์ที่ต้องการดาวน์โหลด' });
        }

        res.download(filePath, name);
    } catch (error) {
        next(error);
    }
};
