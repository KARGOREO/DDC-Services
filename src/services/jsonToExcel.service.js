const fs = require('fs');
const path = require('path');
const ExcelJS = require('exceljs');

/**
 * Robust JSON parser that handles database-dump artifacts:
 * - Unescaped quotes or backslashes (e.g. $+4(#\")z or \')
 * - Trailing commas
 * - Single quotes
 * - Byte Order Mark (BOM)
 */
function safeJsonParse(rawString) {
  if (typeof rawString !== 'string') return rawString;
  let str = rawString.trim();

  // Strip BOM if present
  if (str.charCodeAt(0) === 0xFEFF) {
    str = str.slice(1);
  }

  // 1. Try native JSON.parse
  try {
    return JSON.parse(str);
  } catch (initialErr) {
    // 2. Clean common SQL dump escapes: \' -> '
    let cleaned = str.replace(/\\'/g, "'");

    // 3. Fix unescaped backslash-quote pairs in database string dumps
    // e.g. "$+4(#\\")z" -> "$+4(#\\\")z"
    cleaned = cleaned.replace(/\\\\"/g, '\\\\"');

    try {
      return JSON.parse(cleaned);
    } catch (err2) {
      // 4. Line-by-line sanitization for malformed values
      try {
        const fixedLines = str.split(/\r?\n/).map(line => {
          // Check if line matches a key-value pair: "key": "value"
          const match = line.match(/^(\s*"[^"]+"\s*:\s*)"(.*)"(,?)$/);
          if (match) {
            const prefix = match[1];
            let val = match[2];
            const suffix = match[3];

            // If val contains unescaped quote that broke the string
            // Replace malformed `\\"` with `\"` or `\\\"`
            val = val.replace(/\\"/g, '\\"').replace(/\\\\"/g, '\\\\\\"');
            return `${prefix}"${val}"${suffix}`;
          }
          return line;
        }).join('\n');

        return JSON.parse(fixedLines);
      } catch (err3) {
        // 5. Fallback: try removing trailing commas and control characters
        try {
          const stripped = cleaned
            .replace(/,(\s*[}\]])/g, '$1') // trailing commas
            .replace(/[\u0000-\u001F]+/g, ' '); // control chars
          return JSON.parse(stripped);
        } catch (err4) {
          throw new Error(`ไม่สามารถแปลงข้อมูล JSON ได้: ${initialErr.message}`);
        }
      }
    }
  }
}

/**
 * Helper to recursively flatten nested objects if needed
 * e.g., { user: { name: 'John' } } => { 'user.name': 'John' }
 */
function flattenObject(obj, prefix = '', res = {}) {
  for (const key in obj) {
    if (!Object.prototype.hasOwnProperty.call(obj, key)) continue;
    const propName = prefix ? `${prefix}.${key}` : key;
    const val = obj[key];

    if (val !== null && typeof val === 'object' && !Array.isArray(val) && !(val instanceof Date)) {
      flattenObject(val, propName, res);
    } else if (Array.isArray(val)) {
      if (val.every(item => typeof item !== 'object' || item === null)) {
        res[propName] = val.join(', ');
      } else {
        res[propName] = JSON.stringify(val);
      }
    } else {
      res[propName] = val;
    }
  }
  return res;
}

/**
 * Normalize any JSON input into one or more sheets:
 * Map of sheetName -> Array of flat objects
 */
function normalizeJsonData(rawData, shouldFlatten = true) {
  const sheets = {};

  if (!rawData) {
    throw new Error('ไม่พบข้อมูล JSON');
  }

  const data = typeof rawData === 'string' ? safeJsonParse(rawData) : rawData;

  if (Array.isArray(data)) {
    // Direct array of records (e.g., user_bma.json)
    sheets['Sheet1'] = data.map(item => (shouldFlatten && typeof item === 'object' && item !== null ? flattenObject(item) : item));
  } else if (typeof data === 'object' && data !== null) {
    // Check if root object contains arrays (e.g., { data: [...] } or { users: [...], roles: [...] })
    const arrayKeys = Object.keys(data).filter(k => Array.isArray(data[k]));

    if (arrayKeys.length > 0) {
      arrayKeys.forEach(k => {
        const sheetName = k.substring(0, 30); // Excel sheet name max 31 chars
        sheets[sheetName] = data[k].map(item => (shouldFlatten && typeof item === 'object' && item !== null ? flattenObject(item) : item));
      });
    } else {
      // Single object -> Single row table
      sheets['Data'] = [shouldFlatten ? flattenObject(data) : data];
    }
  } else {
    throw new Error('โครงสร้างไฟล์ JSON ไม่ถูกต้อง');
  }

  return sheets;
}

/**
 * Execute conversion from JSON file/data to Excel (.xlsx) using ExcelJS
 */
const execute = async (inputSource, options = {}) => {
  let rawContent;
  let defaultBaseName = 'export_data';

  if (typeof inputSource === 'string' && fs.existsSync(inputSource)) {
    rawContent = fs.readFileSync(inputSource, 'utf-8');
    const parsedPath = path.parse(inputSource);
    defaultBaseName = parsedPath.name;
  } else if (typeof inputSource === 'object' || typeof inputSource === 'string') {
    rawContent = inputSource;
  } else {
    throw new Error('ไม่พบแหล่งข้อมูล JSON ที่ถูกต้อง');
  }

  const sheetsData = normalizeJsonData(rawContent, options.flatten !== false);
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'DDC Data Platform';
  workbook.created = new Date();

  let totalRowsCount = 0;
  let allColumnsCount = 0;
  const sheetNames = Object.keys(sheetsData);

  for (const sheetName of sheetNames) {
    const records = sheetsData[sheetName];
    const worksheet = workbook.addWorksheet(sheetName, {
      views: [{ state: 'frozen', xSplit: 0, ySplit: 1 }]
    });

    if (!records || records.length === 0) {
      worksheet.addRow(['(ไม่มีข้อมูล)']);
      continue;
    }

    // Collect all unique keys from all records to preserve all columns
    const columnKeysSet = new Set();
    records.forEach(row => {
      if (row && typeof row === 'object') {
        Object.keys(row).forEach(k => columnKeysSet.add(k));
      }
    });

    const columnKeys = Array.from(columnKeysSet);
    allColumnsCount = Math.max(allColumnsCount, columnKeys.length);
    totalRowsCount += records.length;

    // Define worksheet columns
    worksheet.columns = columnKeys.map(key => {
      return {
        header: key,
        key: key,
        width: Math.max(key.length + 4, 15)
      };
    });

    // Style the Header Row
    const headerRow = worksheet.getRow(1);
    headerRow.height = 28;
    headerRow.eachCell((cell) => {
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF1E293B' } // Slate 800
      };
      cell.font = {
        name: 'Segoe UI',
        bold: true,
        color: { argb: 'FFFFFFFF' },
        size: 11
      };
      cell.alignment = {
        vertical: 'middle',
        horizontal: 'center',
        wrapText: false
      };
      cell.border = {
        top: { style: 'thin', color: { argb: 'FF334155' } },
        left: { style: 'thin', color: { argb: 'FF334155' } },
        bottom: { style: 'medium', color: { argb: 'FF0F172A' } },
        right: { style: 'thin', color: { argb: 'FF334155' } }
      };
    });

    // Populate data rows
    records.forEach((record, index) => {
      const rowData = {};
      columnKeys.forEach(col => {
        let val = record[col];
        if (val === undefined || val === null) {
          rowData[col] = '';
        } else if (typeof val === 'boolean') {
          rowData[col] = val ? 'TRUE' : 'FALSE';
        } else {
          rowData[col] = val;
        }
      });

      const row = worksheet.addRow(rowData);
      row.height = 20;

      // Alternating row background for readability
      const isEven = index % 2 === 0;
      row.eachCell({ includeEmpty: true }, (cell) => {
        cell.font = { name: 'Segoe UI', size: 10 };
        cell.alignment = { vertical: 'middle', horizontal: 'left' };
        cell.border = {
          top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
          left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
          bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
          right: { style: 'thin', color: { argb: 'FFE2E8F0' } }
        };
        if (isEven) {
          cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFF8FAFC' }
          };
        }
      });
    });

    // Auto-fit column widths based on cell content (capped between 12 and 50)
    worksheet.columns.forEach(column => {
      let maxLen = column.header ? column.header.toString().length : 10;
      const sampleRows = records.slice(0, 100);
      sampleRows.forEach(row => {
        const val = row[column.key];
        if (val !== undefined && val !== null) {
          const len = val.toString().length;
          if (len > maxLen) maxLen = len;
        }
      });
      column.width = Math.min(Math.max(maxLen + 4, 14), 50);
    });

    // Enable auto-filter
    worksheet.autoFilter = {
      from: { row: 1, column: 1 },
      to: { row: 1, column: columnKeys.length }
    };
  }

  // Ensure uploads directory exists
  const uploadsDir = path.join(process.cwd(), 'uploads');
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }

  const outputFileName = `${defaultBaseName}_${Date.now()}.xlsx`;
  const outputPath = path.join(uploadsDir, outputFileName);

  await workbook.xlsx.writeFile(outputPath);

  return {
    outputPath,
    fileName: outputFileName,
    totalRows: totalRowsCount,
    totalColumns: allColumnsCount,
    sheetNames
  };
};

module.exports = {
  execute,
  normalizeJsonData,
  safeJsonParse
};
