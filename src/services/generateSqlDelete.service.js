const xlsx = require('xlsx');
const fs = require('fs');
const path = require('path');

const execute = (excelFilePath, originalFileName) => {
  return new Promise((resolve, reject) => {
    try {
      const workbook = xlsx.readFile(excelFilePath);
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const rawData = xlsx.utils.sheet_to_json(worksheet);

      const citizenIds = new Set();
      const hospNos = new Set();
      const diseaseCodes = new Set(); 

      rawData.forEach(row => {
          const cid = row['เลขที่บัตรประชาชน'];
          if (cid) citizenIds.add(String(cid).trim());

          const hn = row['HN'];
          if (hn) hospNos.add(String(hn).trim());

          const dCode = row['รหัสโรค (รหัส)'];
          if (dCode) diseaseCodes.add(String(dCode).trim());
      });

      if (citizenIds.size === 0 && hospNos.size === 0) {
          return resolve({ success: false, message: "ไม่พบข้อมูลเลขบัตรประชาชน หรือ HN ในไฟล์ Excel" });
      }

      const createInClauseString = (dataSet) => {
          const arr = Array.from(dataSet).map(val => `'${val.replace(/'/g, "''")}'`);
          if (arr.length <= 5) return ` ${arr.join(', ')} `;
          
          let lines = [];
          for (let i = 0; i < arr.length; i += 6) {
              lines.push('    ' + arr.slice(i, i + 6).join(', '));
          }
          return `\n${lines.join(', \n')}\n`;
      };

      let identityConditions = [];
      if (citizenIds.size > 0) {
          if (citizenIds.size === 1) {
              identityConditions.push(`citizen_id = '${Array.from(citizenIds)[0].replace(/'/g, "''")}'`);
          } else {
              identityConditions.push(`citizen_id IN (${createInClauseString(citizenIds)})`);
          }
      }

      if (hospNos.size > 0) {
          if (hospNos.size === 1) {
              identityConditions.push(`hosp_no = '${Array.from(hospNos)[0].replace(/'/g, "''")}'`);
          } else {
              identityConditions.push(`hosp_no IN (${createInClauseString(hospNos)})`);
          }
      }
      const whereIdentityClause = identityConditions.length > 0 ? `AND ( ${identityConditions.join(' OR ')} )` : '';

      let whereDiseaseClause = '';
      if (diseaseCodes.size > 0) {
          if (diseaseCodes.size === 1) {
              whereDiseaseClause = `AND disease_code = '${Array.from(diseaseCodes)[0].replace(/'/g, "''")}'`;
          } else {
              whereDiseaseClause = `AND disease_code IN (${createInClauseString(diseaseCodes)})`;
          }
      }

      const fileNameParts = originalFileName.replace('.xlsx', '').split('_');
      let caseDate = fileNameParts[0] || '1970-01-01';  
      let cureLocCode = fileNameParts[1] || '25060';    

      const sqlStatement = `-- ตรวจสอบ records จากไฟล์ ${originalFileName}
SELECT id, uuid, hosp_no, citizen_id, firstname, lastname, disease, disease_code, cure_loc_code, case_date, rec_status, state 
FROM bma_report 
WHERE cure_loc_code = '${cureLocCode}' 
AND rec_status = 'active' 
AND case_date = '${caseDate}' 
${whereDiseaseClause}
${whereIdentityClause} 
ORDER BY id;

UPDATE bma_report 
SET rec_status = 'delete', updated = UNIX_TIMESTAMP() 
WHERE cure_loc_code = '${cureLocCode}' 
AND rec_status = 'active' 
AND case_date = '${caseDate}' 
${whereDiseaseClause}
${whereIdentityClause} 
ORDER BY id;
`;

      const outputFileName = `delete_bma_report_${originalFileName.replace('.xlsx', '.sql')}`;
      const targetDir = path.join(process.cwd(), 'delete-e506-by-sql');
      if (!fs.existsSync(targetDir)) {
          fs.mkdirSync(targetDir, { recursive: true });
      }
      const outputPath = path.join(targetDir, outputFileName);

      fs.writeFileSync(outputPath, sqlStatement, 'utf-8');

      resolve({
        success: true,
        outputPath,
        details: {
          caseDate,
          cureLocCode,
          diseaseCodesCount: diseaseCodes.size,
          citizenIdsCount: citizenIds.size,
          hospNosCount: hospNos.size
        }
      });
    } catch(err) {
      reject(err);
    }
  });
};

module.exports = { execute };
