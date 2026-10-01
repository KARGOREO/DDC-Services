const fs = require('fs');
const path = require('path');

/**
 * แปลงข้อมูลจาก JSON array เพื่อสร้าง SQL UPDATE สำหรับเคสที่ epidem_address ว่าง
 * โดย fallback ไปใช้ข้อมูลที่อยู่ปัจจุบัน (address, moo, road, chw_code, amp_code, tmb_code)
 * 
 * @param {Array<Object>} jsonData - อาเรย์ของข้อมูล JSON ที่ได้จาก query
 * @param {Object} options - ตัวเลือกเพิ่มเติม เช่น tableName
 * @returns {Promise<{success: boolean, queries: Array<string>, sqlContent: string, count: number, outputPath?: string}>}
 */
const execute = (jsonData, options = {}) => {
  return new Promise((resolve, reject) => {
    try {
      if (!Array.isArray(jsonData) || jsonData.length === 0) {
        return resolve({
          success: false,
          message: 'ข้อมูล JSON ว่างเปล่าหรือไม่ถูกต้อง (ต้องเป็น Array)',
          count: 0,
          queries: []
        });
      }

      const tableName = options.tableName || 'data';
      const isBlank = (val) => val === null || val === undefined || String(val).trim() === '';
      const escapeSql = (val) => {
        if (val === null || val === undefined) return 'NULL';
        return `'${String(val).replace(/'/g, "''")}'`;
      };

      const queries = [];
      let updatedCount = 0;

      jsonData.forEach((row) => {
        // ตรวจสอบว่ามีข้อมูล epidem_ ส่วนใดส่วนหนึ่งว่างหรือไม่
        const hasMissingEpidem =
          isBlank(row.epidem_address) ||
          isBlank(row.epidem_chw_code) ||
          isBlank(row.epidem_amp_code) ||
          isBlank(row.epidem_tmb_code);

        // ดึงค่าโดย fallback ถ้า epidem_ ว่าง ให้ใช้ค่าที่อยู่ปัจจุบัน
        const epidemAddress = !isBlank(row.epidem_address) ? row.epidem_address : row.address;
        const epidemMoo     = !isBlank(row.epidem_moo)     ? row.epidem_moo     : row.moo;
        const epidemRoad    = !isBlank(row.epidem_road)    ? row.epidem_road    : row.road;
        const epidemChw     = !isBlank(row.epidem_chw_code)? row.epidem_chw_code: row.chw_code;
        const epidemAmp     = !isBlank(row.epidem_amp_code)? row.epidem_amp_code: row.amp_code;
        const epidemTmb     = !isBlank(row.epidem_tmb_code)? row.epidem_tmb_code: row.tmb_code;

        // เงื่อนไขในการค้นหาเพื่อ UPDATE (ใช้ epidem_report_guid ถ้ามี หรือ cid/id)
        let whereClause = '';
        if (!isBlank(row.epidem_report_guid)) {
          whereClause = `epidem_report_guid = ${escapeSql(row.epidem_report_guid)}`;
        } else if (!isBlank(row.id)) {
          whereClause = `id = ${escapeSql(row.id)}`;
        } else if (!isBlank(row.cid)) {
          whereClause = `cid = ${escapeSql(row.cid)}`;
        }

        if (whereClause) {
          const query = `UPDATE ${tableName} SET ` +
            `epidem_address = ${escapeSql(epidemAddress)}, ` +
            `epidem_moo = ${escapeSql(epidemMoo)}, ` +
            `epidem_road = ${escapeSql(epidemRoad)}, ` +
            `epidem_chw_code = ${escapeSql(epidemChw)}, ` +
            `epidem_amp_code = ${escapeSql(epidemAmp)}, ` +
            `epidem_tmb_code = ${escapeSql(epidemTmb)} ` +
            `WHERE ${whereClause};`;

          queries.push(query);
          if (hasMissingEpidem) {
            updatedCount++;
          }
        }
      });

      const sqlContent = `-- Generated SQL Update Address (Epidem Fallback)\n-- Total Records: ${queries.length}\n-- Generated Date: ${new Date().toISOString()}\n\n` + queries.join('\n');

      // สร้างไฟล์ .sql เก็บไว้ใน delete-e506-by-sql หรือ โฟลเดอร์ sql
      const targetDir = path.join(process.cwd(), 'delete-e506-by-sql');
      if (!fs.existsSync(targetDir)) {
        fs.mkdirSync(targetDir, { recursive: true });
      }

      const timestamp = Date.now();
      const outputFileName = `update_epidem_address_${timestamp}.sql`;
      const outputPath = path.join(targetDir, outputFileName);

      fs.writeFileSync(outputPath, sqlContent, 'utf-8');

      return resolve({
        success: true,
        count: queries.length,
        updatedEpidemCount: updatedCount,
        queries,
        sqlContent,
        outputFileName,
        outputPath
      });
    } catch (error) {
      return reject(error);
    }
  });
};

module.exports = {
  execute
};
