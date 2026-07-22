const fs = require('fs');
const ExcelJS = require('exceljs');
const path = require('path');

const execute = async (dataFilePath, schemaFilePath) => {
    try {
        const incomingData = JSON.parse(fs.readFileSync(dataFilePath, 'utf8')); 
        const schema = JSON.parse(fs.readFileSync(schemaFilePath, 'utf8'));
        
        const maxCid = schema.database_schema?.D506?.fields?.cid?.length || 13;
        const maxPassport = 19; 
        
        const errorRows = [];

        incomingData.forEach((row, index) => {
            const rowNumber = index + 1;
            const cidValue = row.cid;
            const passportValue = row.passport_no;

            if (cidValue) {
                const cidStr = String(cidValue).trim();
                if (cidStr.length > maxCid) {
                    errorRows.push({
                        rowNumber,
                        identity: row.epidem_report_guid || 'N/A',
                        field: 'cid',
                        currentLen: cidStr.length,
                        limit: maxCid,
                        value: `"${cidStr}"`,
                        reason: `CID ยาวเกินกำหนด (${cidStr.length} > ${maxCid})`
                    });
                }
            }

            if (passportValue) {
                const ppStr = String(passportValue).trim();
                if (ppStr.length >= maxPassport) {
                    errorRows.push({
                        rowNumber,
                        identity: row.epidem_report_guid || 'N/A',
                        field: 'passport_no',
                        currentLen: ppStr.length,
                        limit: maxPassport,
                        value: `"${ppStr}"`,
                        reason: `Passport ยาวเกิน ${maxPassport} ตัว (${ppStr.length} > ${maxPassport})`
                    });
                }
            }
        });

        if (errorRows.length > 0) {
            const workbook = new ExcelJS.Workbook();
            const worksheet = workbook.addWorksheet('Identity Errors');

            worksheet.columns = [
                { header: 'แถวที่ (Row)', key: 'rowNumber', width: 12 },
                { header: 'GUID / Identity', key: 'identity', width: 35 },
                { header: 'ฟิลด์ที่พบปัญหา', key: 'field', width: 15 },
                { header: 'ความยาวจริง', key: 'currentLen', width: 12 },
                { header: 'เกณฑ์สูงสุด', key: 'limit', width: 12 },
                { header: 'สาเหตุ', key: 'reason', width: 30 },
                { header: 'ค่าข้อมูลที่มีปัญหา', key: 'value', width: 30 }
            ];

            const headerRow = worksheet.getRow(1);
            headerRow.font = { bold: true, color: { argb: 'FFFFFF' } };
            headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'D9534F' } };

            worksheet.addRows(errorRows);

            const fileName = `check_identity_report_${Date.now()}.xlsx`;
            const outputPath = path.join(process.cwd(), 'uploads', fileName);
            await workbook.xlsx.writeFile(outputPath);
            
            return { hasErrors: true, count: errorRows.length, outputPath };
        } else {
            return { hasErrors: false, count: 0, message: `ไม่พบ CID ที่เกิน ${maxCid} หรือ Passport ที่เกิน ${maxPassport}` };
        }

    } catch (err) {
        throw err;
    }
}

module.exports = {
  execute
};
