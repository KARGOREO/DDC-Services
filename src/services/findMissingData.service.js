const fs = require('fs');

const execute = (d506FilePath, e506FilePath) => {
  return new Promise((resolve, reject) => {
    try {
      const e506Raw = fs.readFileSync(e506FilePath, 'utf8');
      const d506Raw = fs.readFileSync(d506FilePath, 'utf8');

      const e506Data = JSON.parse(e506Raw);
      const d506Data = JSON.parse(d506Raw);

      const e506Uuids = new Set(
        e506Data.map(row => row.uuid?.trim().toLowerCase())
      );

      const missingInE506 = d506Data.filter(row => {
        const guid = row.epidem_report_guid || row.uuid;
        const cleanGuid = guid?.replace(/[{}]/g, '').trim().toLowerCase();
        return !e506Uuids.has(cleanGuid);
      });

      if (missingInE506.length > 0) {
        const results = missingInE506.map(item => ({
          GUID: item.epidem_report_guid || item.uuid,
          HOSPCODE: item.hospcode || item.hcode,
          NAME: `${item.name || ''} ${item.lname || ''}`.trim()
        }));
        resolve({ isMissing: true, count: missingInE506.length, results });
      } else {
        resolve({ isMissing: false, count: 0, message: 'ไม่พบข้อมูลที่ตกหล่น ข้อมูลทั้งสองไฟล์ตรงกัน' });
      }

    } catch (error) {
      reject(error);
    }
  });
}

module.exports = {
  execute
};
