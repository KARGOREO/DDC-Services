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
    // 2. Clean common SQL dump escapes: \' -> ' and \\" -> \"
    let cleaned = str.replace(/\\'/g, "'").replace(/\\\\"/g, '\\"');

    try {
      return JSON.parse(cleaned);
    } catch (err2) {
      // 3. Try double unescaping if nested stringified JSON
      try {
        let doubleCleaned = cleaned.replace(/\\"/g, '"');
        return JSON.parse(doubleCleaned);
      } catch (err3) {
        // 4. Fallback: try removing trailing commas and control characters
        try {
          const stripped = cleaned
            .replace(/,(\s*[}\]])/g, '$1')
            .replace(/[\u0000-\u001F]+/g, ' ');
          return JSON.parse(stripped);
        } catch (err4) {
          throw new Error(`ไม่สามารถแปลงข้อมูล JSON ได้: ${initialErr.message}`);
        }
      }
    }
  }
}

/**
 * Format Citizen ID (13 digits) into Thai standard format: x-xxxx-xxxxx-xx-x
 */
function formatThaiCitizenId(cid) {
  if (!cid) return '-';
  const str = String(cid).replace(/\D/g, '');
  if (str.length === 13) {
    return `${str.substring(0, 1)}-${str.substring(1, 5)}-${str.substring(5, 10)}-${str.substring(10, 12)}-${str.substring(12, 13)}`;
  }
  return String(cid);
}

/**
 * Check if the dataset is an error log / audit log structure (like test.json)
 */
function detectErrorLogStructure(data) {
  if (!data) return false;
  const items = Array.isArray(data) ? data : [data];
  if (items.length === 0) return false;

  const sample = items[0];
  if (sample && typeof sample === 'object') {
    if ('error_cases' in sample || ('error_records_count' in sample && 'total_records' in sample)) {
      return true;
    }
  }
  return false;
}

/**
 * Helper to recursively flatten nested objects if needed
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
 * Helper to test a single rule against a record
 */
function testFilterRule(item, rule) {
  if (!rule || !rule.field) return true;
  const { field, operator, value } = rule;
  const rawVal = item[field];
  const itemValStr = (rawVal === null || rawVal === undefined) ? '' : String(rawVal);
  const targetValStr = (value === null || value === undefined) ? '' : String(value);

  switch (operator) {
    case 'equals':
      return itemValStr.toLowerCase() === targetValStr.toLowerCase();
    case 'not_equals':
      return itemValStr.toLowerCase() !== targetValStr.toLowerCase();
    case 'contains':
      return itemValStr.toLowerCase().includes(targetValStr.toLowerCase());
    case 'not_contains':
      return !itemValStr.toLowerCase().includes(targetValStr.toLowerCase());
    case 'starts_with':
      return itemValStr.toLowerCase().startsWith(targetValStr.toLowerCase());
    case 'ends_with':
      return itemValStr.toLowerCase().endsWith(targetValStr.toLowerCase());
    case 'is_empty':
      return rawVal === null || rawVal === undefined || itemValStr.trim() === '' || itemValStr.trim() === 'null' || itemValStr.trim() === '-';
    case 'is_not_empty':
      return rawVal !== null && rawVal !== undefined && itemValStr.trim() !== '' && itemValStr.trim() !== 'null' && itemValStr.trim() !== '-';
    case 'gt': {
      const numVal = Number(rawVal);
      const targetNum = Number(value);
      return !isNaN(numVal) && !isNaN(targetNum) && numVal > targetNum;
    }
    case 'gte': {
      const numVal = Number(rawVal);
      const targetNum = Number(value);
      return !isNaN(numVal) && !isNaN(targetNum) && numVal >= targetNum;
    }
    case 'lt': {
      const numVal = Number(rawVal);
      const targetNum = Number(value);
      return !isNaN(numVal) && !isNaN(targetNum) && numVal < targetNum;
    }
    case 'lte': {
      const numVal = Number(rawVal);
      const targetNum = Number(value);
      return !isNaN(numVal) && !isNaN(targetNum) && numVal <= targetNum;
    }
    case 'year_equals': {
      if (!itemValStr || !targetValStr) return false;
      const targetYear = parseInt(targetValStr.trim(), 10);
      if (isNaN(targetYear)) return false;
      const yearMatches = itemValStr.match(/\b(19\d{2}|20\d{2}|21\d{2}|25\d{2}|26\d{2})\b/g);
      if (yearMatches) {
        return yearMatches.some(yStr => {
          const yNum = parseInt(yStr, 10);
          return yNum === targetYear || (yNum > 2400 && yNum - 543 === targetYear) || (yNum < 2200 && yNum + 543 === targetYear);
        });
      }
      return itemValStr.includes(targetValStr.trim());
    }
    default:
      return itemValStr.toLowerCase().includes(targetValStr.toLowerCase());
  }
}

/**
 * Check if a record matches given filter configuration
 */
function matchesFilter(item, filterConfig) {
  if (!filterConfig || !Array.isArray(filterConfig.rules) || filterConfig.rules.length === 0) {
    return true;
  }
  const { logic = 'AND', rules } = filterConfig;
  const activeRules = rules.filter(r => r && r.field && String(r.field).trim() !== '');
  if (activeRules.length === 0) return true;

  if (logic === 'OR') {
    return activeRules.some(rule => testFilterRule(item, rule));
  } else {
    return activeRules.every(rule => testFilterRule(item, rule));
  }
}

/**
 * Build Government Style Official Error Report Workbook (DDC Official Style)
 * Simplified & direct for non-IT users:
 * - Summary KPI cards with Missing Address count
 * - Direct error_cases table showing patient cases directly with exact field names
 * - Daily Master Log with Thai (field_name) labels
 */
async function buildGovErrorReportWorkbook(parsedData, options = {}) {
  const { filters, selectedColumns } = options;
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'กองระบาดวิทยา กรมควบคุมโรค กระทรวงสาธารณสุข';
  workbook.lastModifiedBy = 'Central Processing Platform';
  workbook.created = new Date();
  workbook.modified = new Date();

  const items = Array.isArray(parsedData) ? parsedData : [parsedData];
  
  // Aggregate stats
  let totalRecordsSum = 0;
  let validImportedSum = 0;
  let errorRecordsSum = 0;
  let logDates = new Set();
  let lastUpdatedAt = '-';

  // Extract all error cases & log summaries
  const allErrors = [];
  const logSummaries = [];

  let nullAddressCount = 0;
  let invalidAddressCodeCount = 0;

  items.forEach((item, itemIdx) => {
    const logDate = item.log_date || '-';
    if (item.log_date) logDates.add(item.log_date);
    if (item.last_updated_at) lastUpdatedAt = item.last_updated_at;

    const total = Number(item.total_records) || 0;
    const valid = Number(item.valid_imported_count) || 0;
    const errCount = Number(item.error_records_count) || 0;

    totalRecordsSum += total;
    validImportedSum += valid;
    errorRecordsSum += errCount;

    logSummaries.push({
      id: item.id || (itemIdx + 1),
      logDate: logDate,
      totalRecords: total,
      validRecords: valid,
      errorRecords: errCount,
      lastUpdatedAt: item.last_updated_at || '-'
    });

    let cases = item.error_cases;
    if (typeof cases === 'string') {
      try {
        cases = safeJsonParse(cases);
      } catch {
        cases = [];
      }
    }

    if (Array.isArray(cases)) {
      cases.forEach((ec) => {
        const isNullRawAddress = ec.raw_address === null || ec.raw_address === undefined || String(ec.raw_address).trim() === '';
        if (isNullRawAddress && !ec.address) {
          nullAddressCount++;
        }
        if (ec.error_reason && (ec.error_reason.includes('ตำบล') || ec.error_reason.includes('ที่อยู่') || ec.error_reason.includes('address'))) {
          invalidAddressCodeCount++;
        }

        allErrors.push(ec);
      });
    }
  });

  // Extract all unique field keys present across all error_cases
  // Requirement: Logical field ordering with 'uuid' first, grouped personal/address/clinical info, and special end fields preserved at the end.
  const allFieldKeysSet = new Set();
  allErrors.forEach(errObj => {
    Object.keys(errObj).forEach(k => allFieldKeysSet.add(k));
  });

  // Predefined logical priority order for DDC error cases
  const PREFERRED_FIELD_ORDER = [
    // 1. Primary Identifier
    'uuid',
    'citizen_id',
    'passport_id',

    // 2. Personal Information
    'titlename',
    'firstname',
    'lastname',
    'gender',
    'birthdate',
    'age_year',
    'age_month',
    'age_day',
    'nationality_code',
    'married_status',
    'work_code',
    'contact_mobile',

    // 3. Current Address
    'address',
    'moo',
    'road',
    'tmb_code',
    'amp_code',
    'chw_code',
    'raw_address',

    // 4. Epidem Address
    'epidem_address',
    'epidem_moo',
    'epidem_road',
    'epidem_tmb_code',
    'epidem_amp_code',
    'epidem_chw_code',

    // 5. Clinical & Disease Information
    'disease_code',
    'icd_10',
    'diagnosis_date',
    'patient_sick',
    'patient_found',
    'patient_death',
    'patient_type',
    'patient_status',
    'case_date',
    'dds_date',

    // 6. Hospital & Healthcare Facility
    'hospital_code',
    'cure_loc_code',
    'report_loc_code',

    // 7. Lab Results
    'lab_method',
    'lab_result',

    // 8. Report Information
    'report_name',
    'report_date',
    'report_time',
    't_ransfer',

    // 9. System / Status / Audit
    'status',
    'rec_status',
    'state',
    'remark',
    'invalid_code',
    'detected_at',
    'resolved_at',
    'update_datetime'
  ];

  const specialEndFields = ['address_flag', 'address_remark', 'error_reason'];
  
  // 1. Add fields according to preferred logical order if present
  let orderedFields = [];
  PREFERRED_FIELD_ORDER.forEach(field => {
    if (allFieldKeysSet.has(field) && !specialEndFields.includes(field)) {
      orderedFields.push(field);
    }
  });

  // 2. Add any other dynamic/unknown fields from data not in preferred list
  allFieldKeysSet.forEach(field => {
    if (!orderedFields.includes(field) && !specialEndFields.includes(field)) {
      orderedFields.push(field);
    }
  });

  // 3. Preserve special end fields at the very end
  if (allFieldKeysSet.has('address_flag')) {
    orderedFields.push('address_flag');
  }
  if (allFieldKeysSet.has('address_remark')) {
    orderedFields.push('address_remark');
  }
  if (allFieldKeysSet.has('error_reason')) {
    orderedFields.push('error_reason'); // error_reason is always last!
  }

  // Filter columns if selectedColumns is provided
  if (Array.isArray(selectedColumns) && selectedColumns.length > 0) {
    const selectedSet = new Set(selectedColumns);
    const filteredCols = orderedFields.filter(f => selectedSet.has(f));
    if (filteredCols.length > 0) {
      orderedFields = filteredCols;
    }
  }

  // Filter error cases if filters is provided
  const displayErrors = filters ? allErrors.filter(ec => matchesFilter(ec, filters)) : allErrors;

  const primaryLogDate = Array.from(logDates).join(', ') || new Date().toISOString().split('T')[0];

  // =============================================================
  // Sheet 1: รายงานข้อผิดพลาด (Summary + Error Cases Table)
  // =============================================================
  const wsMain = workbook.addWorksheet('รายงานข้อผิดพลาด', {
    pageSetup: { paperSize: 9, orientation: 'landscape' },
    views: [{ state: 'frozen', xSplit: 0, ySplit: 8 }]
  });

  const totalCols = Math.max(orderedFields.length, 8);
  const colLetter = (colIndex) => {
    let temp = '';
    let num = colIndex;
    while (num > 0) {
      let mod = (num - 1) % 26;
      temp = String.fromCharCode(65 + mod) + temp;
      num = Math.floor((num - mod) / 26);
    }
    return temp;
  };
  const lastColLetter = colLetter(totalCols);

  // 1. Header Banner
  wsMain.mergeCells(`A1:${lastColLetter}1`);
  const titleCell = wsMain.getCell('A1');
  titleCell.value = 'รายงานสรุปผลการนำเข้าและข้อผิดพลาดของข้อมูล (Error Log Report)';
  titleCell.font = { name: 'TH Sarabun New', size: 18, bold: true, color: { argb: 'FFFFFFFF' } };
  titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0F2942' } }; // Gov Deep Navy
  titleCell.alignment = { vertical: 'middle', horizontal: 'center' };
  wsMain.getRow(1).height = 34;

  // 2. Subtitle Banner
  wsMain.mergeCells(`A2:${lastColLetter}2`);
  const subCell = wsMain.getCell('A2');
  subCell.value = 'กองระบาดวิทยา กรมควบคุมโรค กระทรวงสาธารณสุข';
  subCell.font = { name: 'TH Sarabun New', size: 12, bold: true, color: { argb: 'FFE2E8F0' } };
  subCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E3A8A' } };
  subCell.alignment = { vertical: 'middle', horizontal: 'center' };
  wsMain.getRow(2).height = 24;

  // 3. Metadata Bar
  wsMain.mergeCells(`A3:${lastColLetter}3`);
  const metaCell = wsMain.getCell('A3');
  const nowStr = new Date().toLocaleString('th-TH');
  metaCell.value = `วันที่ออกรายงาน: ${nowStr}   |   วันที่บันทึกข้อมูล (log_date): ${primaryLogDate}   |   เวลาอัปเดตล่าสุด (last_updated_at): ${lastUpdatedAt}`;
  metaCell.font = { name: 'TH Sarabun New', size: 11, italic: true, color: { argb: 'FF334155' } };
  metaCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF1F5F9' } };
  metaCell.alignment = { vertical: 'middle', horizontal: 'center' };
  wsMain.getRow(3).height = 20;

  wsMain.getRow(4).height = 8; // Spacer

  // 4. Summary KPI Cards (Row 5 - 7)
  // Card 1: Total records
  wsMain.mergeCells('A5:B5');
  wsMain.getCell('A5').value = 'จำนวนข้อมูลทั้งหมด (total_records)';
  wsMain.getCell('A5').font = { name: 'TH Sarabun New', size: 11, bold: true, color: { argb: 'FF1E293B' } };
  wsMain.getCell('A5').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE2E8F0' } };
  wsMain.getCell('A5').alignment = { vertical: 'middle', horizontal: 'center' };

  wsMain.mergeCells('A6:B7');
  const totalKpi = wsMain.getCell('A6');
  totalKpi.value = `${totalRecordsSum.toLocaleString()} รายการ`;
  totalKpi.font = { name: 'TH Sarabun New', size: 16, bold: true, color: { argb: 'FF0F172A' } };
  totalKpi.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8FAFC' } };
  totalKpi.alignment = { vertical: 'middle', horizontal: 'center' };

  // Card 2: Valid imported
  wsMain.mergeCells('C5:D5');
  wsMain.getCell('C5').value = 'นำเข้าสำเร็จ (valid_imported_count)';
  wsMain.getCell('C5').font = { name: 'TH Sarabun New', size: 11, bold: true, color: { argb: 'FF065F46' } };
  wsMain.getCell('C5').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD1FAE5' } };
  wsMain.getCell('C5').alignment = { vertical: 'middle', horizontal: 'center' };

  wsMain.mergeCells('C6:D7');
  const validKpi = wsMain.getCell('C6');
  validKpi.value = `${validImportedSum.toLocaleString()} รายการ`;
  validKpi.font = { name: 'TH Sarabun New', size: 16, bold: true, color: { argb: 'FF047857' } };
  validKpi.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF0FDF4' } };
  validKpi.alignment = { vertical: 'middle', horizontal: 'center' };

  // Card 3: Error records
  wsMain.mergeCells('E5:F5');
  wsMain.getCell('E5').value = 'พบข้อผิดพลาดทั้งหมด (error_records_count)';
  wsMain.getCell('E5').font = { name: 'TH Sarabun New', size: 11, bold: true, color: { argb: 'FF991B1B' } };
  wsMain.getCell('E5').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEE2E2' } };
  wsMain.getCell('E5').alignment = { vertical: 'middle', horizontal: 'center' };

  wsMain.mergeCells('E6:F7');
  const errKpi = wsMain.getCell('E6');
  errKpi.value = `${errorRecordsSum.toLocaleString()} เคส (ต้องตรวจสอบ)`;
  errKpi.font = { name: 'TH Sarabun New', size: 16, bold: true, color: { argb: 'FFDC2626' } };
  errKpi.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEF2F2' } };
  errKpi.alignment = { vertical: 'middle', horizontal: 'center' };

  // Card 4: Address issues summary (As requested by user: "สรุปว่าวันนิมีไม่เจอที่อยู่กี่เคส")
  wsMain.mergeCells(`G5:${lastColLetter}5`);
  wsMain.getCell('G5').value = 'สรุปเคสที่มีปัญหาเรื่องที่อยู่ (Address Summary)';
  wsMain.getCell('G5').font = { name: 'TH Sarabun New', size: 11, bold: true, color: { argb: 'FF854D0E' } };
  wsMain.getCell('G5').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEF3C7' } };
  wsMain.getCell('G5').alignment = { vertical: 'middle', horizontal: 'center' };

  wsMain.mergeCells(`G6:${lastColLetter}7`);
  const addrKpi = wsMain.getCell('G6');
  let addrSummaryText = '';
  if (nullAddressCount > 0 && invalidAddressCodeCount > 0) {
    addrSummaryText = `⚠️ ไม่พบที่อยู่/รหัสที่อยู่ผิด: ${invalidAddressCodeCount} เคส (ไม่ระบุที่อยู่ ${nullAddressCount} เคส, รหัสตำบลผิด ${invalidAddressCodeCount} เคส)`;
  } else if (nullAddressCount > 0) {
    addrSummaryText = `⚠️ ไม่พบข้อมูลที่อยู่: ${nullAddressCount} เคส (null)`;
  } else if (invalidAddressCodeCount > 0) {
    addrSummaryText = `⚠️ รหัสที่อยู่/ตำบลไม่ถูกต้อง: ${invalidAddressCodeCount} เคส`;
  } else {
    addrSummaryText = `✅ ข้อมูลที่อยู่ครบถ้วนสมบูรณ์`;
  }
  addrKpi.value = addrSummaryText;
  addrKpi.font = { name: 'TH Sarabun New', size: 13, bold: true, color: { argb: invalidAddressCodeCount > 0 ? 'FFB45309' : 'FF16A34A' } };
  addrKpi.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFBEB' } };
  addrKpi.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };

  const applyBorderBox = (startCol, startRow, endCol, endRow) => {
    for (let r = startRow; r <= endRow; r++) {
      for (let c = startCol; c <= endCol; c++) {
        const cell = wsMain.getCell(r, c);
        cell.border = {
          top: { style: r === startRow ? 'medium' : 'thin', color: { argb: 'FFCBD5E1' } },
          left: { style: c === startCol ? 'medium' : 'thin', color: { argb: 'FFCBD5E1' } },
          bottom: { style: r === endRow ? 'medium' : 'thin', color: { argb: 'FFCBD5E1' } },
          right: { style: c === endCol ? 'medium' : 'thin', color: { argb: 'FFCBD5E1' } }
        };
      }
    }
  };
  applyBorderBox(1, 5, 2, 7);
  applyBorderBox(3, 5, 4, 7);
  applyBorderBox(5, 5, 6, 7);
  applyBorderBox(7, 5, totalCols, 7);

  // 5. Table Header for error_cases (Row 8)
  // Display all field keys from error_cases with error_reason as the last column
  const tableHeaderRow = wsMain.getRow(8);
  tableHeaderRow.height = 30;
  orderedFields.forEach((fieldName, idx) => {
    const colIdx = idx + 1;
    const cell = tableHeaderRow.getCell(colIdx);
    cell.value = fieldName; // Exact field name!
    cell.font = { name: 'Segoe UI', size: 11, bold: true, color: { argb: 'FFFFFFFF' } };
    
    // error_reason is the last column -> give it special distinct header color (Dark Crimson)
    if (fieldName === 'error_reason') {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF831843' } }; // Distinct Wine/Crimson
    } else {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0F2942' } }; // Gov Deep Navy
    }

    cell.alignment = { vertical: 'middle', horizontal: 'center' };
    cell.border = {
      top: { style: 'medium', color: { argb: 'FF0F172A' } },
      left: { style: 'thin', color: { argb: 'FF334155' } },
      bottom: { style: 'medium', color: { argb: 'FF0F172A' } },
      right: { style: 'thin', color: { argb: 'FF334155' } }
    };

    // Calculate sensible column width
    let colWidth = Math.max(fieldName.length + 4, 14);
    if (fieldName === 'uuid') colWidth = 38;
    else if (fieldName === 'error_reason') colWidth = 55;
    else if (fieldName === 'firstname' || fieldName === 'lastname' || fieldName === 'patient_name') colWidth = 24;
    else if (fieldName === 'raw_address' || fieldName === 'address' || fieldName === 'address_remark') colWidth = 30;
    else if (fieldName.includes('date') || fieldName.includes('time')) colWidth = 22;

    wsMain.getColumn(colIdx).width = colWidth;
  });

  // 6. Data Rows for error_cases
  if (displayErrors.length === 0) {
    const emptyVals = orderedFields.map((_, i) => i === 0 ? '(ไม่พบรายการข้อผิดพลาดตรงตามเงื่อนไข)' : '-');
    const emptyRow = wsMain.addRow(emptyVals);
    emptyRow.height = 26;
    emptyRow.eachCell(cell => {
      cell.font = { name: 'TH Sarabun New', size: 12, color: { argb: 'FF16A34A' } };
      cell.alignment = { vertical: 'middle', horizontal: 'center' };
    });
  } else {
    displayErrors.forEach((errObj, idx) => {
      const rowValues = orderedFields.map(field => {
        const val = errObj[field];
        if (val === null || val === undefined) return '-';
        if (typeof val === 'object') return JSON.stringify(val);
        return val;
      });

      const row = wsMain.addRow(rowValues);
      row.height = 26;

      const isEven = idx % 2 === 0;
      row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
        const fieldName = orderedFields[colNumber - 1];
        cell.font = { name: 'Segoe UI', size: 10 };

        // Determine alignment
        let align = 'left';
        if (typeof cell.value === 'number') {
          align = 'right';
        } else if (fieldName && (fieldName.includes('code') || fieldName.includes('id') || fieldName.includes('flag') || fieldName.includes('date') || fieldName.includes('gender') || fieldName.includes('status') || fieldName === 'moo')) {
          align = 'center';
        }

        cell.alignment = {
          vertical: 'middle',
          horizontal: align,
          wrapText: fieldName === 'error_reason' || fieldName === 'raw_address' || fieldName === 'address_remark'
        };

        cell.border = {
          top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
          left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
          bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
          right: { style: 'thin', color: { argb: 'FFE2E8F0' } }
        };

        // Highlight error_reason (last column) and invalid_code
        if (fieldName === 'error_reason') {
          cell.font = { name: 'Segoe UI', size: 10, bold: true, color: { argb: 'FF991B1B' } };
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEF2F2' } };
        } else if (fieldName === 'invalid_code') {
          cell.font = { name: 'Segoe UI', size: 10, bold: true, color: { argb: 'FFC2410C' } };
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFF7ED' } };
        } else if (cell.value === '-' || cell.value === 'null') {
          cell.font = { name: 'Segoe UI', size: 10, italic: true, color: { argb: 'FF94A3B8' } };
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: isEven ? 'FFFFFFFF' : 'FFF8FAFC' } };
        } else {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: isEven ? 'FFFFFFFF' : 'FFF8FAFC' } };
        }
      });
    });
  }

  // Auto filter
  wsMain.autoFilter = {
    from: { row: 8, column: 1 },
    to: { row: 8 + Math.max(allErrors.length, 1), column: totalCols }
  };

  // =============================================================
  // Sheet 2: สรุปบันทึกรายวัน (Daily Master Log)
  // =============================================================
  const wsDaily = workbook.addWorksheet('สรุปบันทึกรายวัน', {
    pageSetup: { paperSize: 9, orientation: 'portrait' }
  });

  wsDaily.mergeCells('A1:G1');
  const sumTitle = wsDaily.getCell('A1');
  sumTitle.value = 'ตารางสรุปผลการนำเข้าข้อมูลรายวัน (Daily Import Audit Summary)';
  sumTitle.font = { name: 'TH Sarabun New', size: 16, bold: true, color: { argb: 'FFFFFFFF' } };
  sumTitle.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0F2942' } };
  sumTitle.alignment = { vertical: 'middle', horizontal: 'center' };
  wsDaily.getRow(1).height = 32;

  // Master Log Headers with Thai + (field_name) as requested!
  const masterHeaders = [
    { header: 'รหัสรายการ (id)', width: 14, align: 'center' },
    { header: 'วันที่บันทึกข้อมูล (log_date)', width: 22, align: 'center' },
    { header: 'จำนวนข้อมูลทั้งหมด (total_records)', width: 26, align: 'right' },
    { header: 'จำนวนนำเข้าสำเร็จ (valid_imported_count)', width: 28, align: 'right' },
    { header: 'จำนวนที่พบข้อผิดพลาด (error_records_count)', width: 28, align: 'right' },
    { header: 'อัตราความสำเร็จ (%)', width: 20, align: 'center' },
    { header: 'เวลาที่อัปเดตล่าสุด (last_updated_at)', width: 26, align: 'center' }
  ];

  const mHeaderRow = wsDaily.getRow(2);
  mHeaderRow.height = 28;
  masterHeaders.forEach((h, idx) => {
    const colIdx = idx + 1;
    const cell = mHeaderRow.getCell(colIdx);
    cell.value = h.header;
    cell.font = { name: 'TH Sarabun New', size: 12, bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E3A8A' } };
    cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
    cell.border = {
      top: { style: 'medium', color: { argb: 'FF0F172A' } },
      left: { style: 'thin', color: { argb: 'FF334155' } },
      bottom: { style: 'medium', color: { argb: 'FF0F172A' } },
      right: { style: 'thin', color: { argb: 'FF334155' } }
    };
    wsDaily.getColumn(colIdx).width = h.width;
  });

  logSummaries.forEach((log, idx) => {
    const successRate = log.totalRecords > 0 ? ((log.validRecords / log.totalRecords) * 100).toFixed(1) + '%' : '0.0%';

    const row = wsDaily.addRow([
      log.id,
      log.logDate,
      log.totalRecords,
      log.validRecords,
      log.errorRecords,
      successRate,
      log.lastUpdatedAt
    ]);
    row.height = 24;

    const isEven = idx % 2 === 0;
    row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
      const hConfig = masterHeaders[colNumber - 1];
      cell.font = { name: 'TH Sarabun New', size: 12 };
      cell.alignment = { vertical: 'middle', horizontal: hConfig ? hConfig.align : 'left' };
      cell.border = {
        top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        right: { style: 'thin', color: { argb: 'FFE2E8F0' } }
      };
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: isEven ? 'FFFFFFFF' : 'FFF8FAFC' }
      };
    });
  });

  return {
    workbook,
    totalRows: allErrors.length,
    totalColumns: totalCols,
    sheetNames: ['รายงานข้อผิดพลาด', 'สรุปบันทึกรายวัน'],
    stats: {
      totalRecords: totalRecordsSum,
      validRecords: validImportedSum,
      errorRecords: errorRecordsSum
    }
  };
}

/**
 * Robust JSON cleaner and parser that handles database dumps, unescaped characters, and malformed strings
 */
function cleanAndParseJson(str) {
  if (typeof str !== 'string') return str;
  try {
    return JSON.parse(str);
  } catch (err1) {
    let cleaned = str.replace(/,\s*\}$/, '}');
    try {
      return JSON.parse(cleaned);
    } catch (err2) {
      // Fix invalid backslash escapes (e.g. \+ or \. or \0 or \')
      cleaned = cleaned.replace(/\\([^"\\\/bfnrtu])/g, '$1');
      try {
        return JSON.parse(cleaned);
      } catch (err3) {
        cleaned = cleaned.replace(/[\u0000-\u001F]+/g, (match) => {
          if (match === '\n') return '\\n';
          if (match === '\r') return '\\r';
          if (match === '\t') return '\\t';
          return ' ';
        });
        try {
          return JSON.parse(cleaned);
        } catch (err4) {
          // Regex key-value extraction fallback
          const obj = {};
          const fieldMatches = str.matchAll(/"([^"]+)"\s*:\s*("(?:\\.|[^"\\])*"|null|true|false|-?\d+(?:\.\d+)?)/g);
          for (const m of fieldMatches) {
            const key = m[1];
            const rawVal = m[2];
            if (rawVal === 'null') obj[key] = null;
            else if (rawVal === 'true') obj[key] = true;
            else if (rawVal === 'false') obj[key] = false;
            else if (rawVal.startsWith('"')) obj[key] = rawVal.slice(1, -1).replace(/\\"/g, '"');
            else obj[key] = Number(rawVal);
          }
          if (Object.keys(obj).length > 0) return obj;
          throw err4;
        }
      }
    }
  }
}

/**
 * Stream JSON objects from a file or stream without loading entire file into memory as a string.
 * Uses high-performance line-based streaming with robust JSON parsing to capture 100% of records.
 */
async function streamJsonObjects(filePath, onRecord, options = {}) {
  const { maxRecords = Infinity } = options;
  const readline = require('readline');

  let count = 0;
  let inObject = false;
  let objectLines = [];

  const rl = readline.createInterface({
    input: fs.createReadStream(filePath, { encoding: 'utf8', highWaterMark: 256 * 1024 }),
    crlfDelay: Infinity
  });

  try {
    for await (const line of rl) {
      const trimmed = line.trim();

      if (!inObject) {
        if (trimmed === '{' || trimmed.startsWith('{"') || trimmed.startsWith('[{') || trimmed.startsWith('[{ "') || trimmed.startsWith('{ "')) {
          inObject = true;
          let cleanStart = line.replace(/^\s*\[\s*/, '');
          objectLines = [cleanStart];
          if ((trimmed.endsWith('}') || trimmed.endsWith('},') || trimmed.endsWith('}]')) && !trimmed.includes('": [') && !trimmed.includes('":{')) {
            inObject = false;
            const objStr = objectLines.join('\n').replace(/,$/, '').replace(/\s*\]\s*$/, '');
            objectLines = [];
            try {
              const obj = cleanAndParseJson(objStr);
              if (obj && typeof obj === 'object') {
                count++;
                await onRecord(obj, count);
                if (count >= maxRecords) {
                  rl.close();
                  return count;
                }
              }
            } catch (err) {}
          }
        }
      } else {
        objectLines.push(line);
        if (trimmed === '}' || trimmed === '},' || trimmed === '}]' || ((trimmed.endsWith('}') || trimmed.endsWith('},') || trimmed.endsWith('}]')) && !trimmed.includes('":'))) {
          inObject = false;
          const objStr = objectLines.join('\n').replace(/,$/, '').replace(/\s*\]\s*$/, '');
          objectLines = [];
          try {
            const obj = cleanAndParseJson(objStr);
            if (obj && typeof obj === 'object') {
              count++;
              await onRecord(obj, count);
              if (count >= maxRecords) {
                rl.close();
                return count;
              }
            }
          } catch (err) {}
        }
      }
    }
  } catch (err) {
    if (err.name !== 'AbortError') throw err;
  }

  // Fallback: If line-based produced 0 records (e.g. minified single-line JSON), use tokenized chunk parser
  if (count === 0) {
    const stream = fs.createReadStream(filePath, { highWaterMark: 128 * 1024, encoding: 'utf8' });
    let inString = false;
    let escapeNext = false;
    let depth = 0;
    let buffer = '';

    try {
      for await (const chunk of stream) {
        for (let i = 0; i < chunk.length; i++) {
          const char = chunk[i];

          if (escapeNext) {
            escapeNext = false;
            if (depth > 0) buffer += char;
            continue;
          }

          if (char === '\\') {
            escapeNext = true;
            if (depth > 0) buffer += char;
            continue;
          }

          if (char === '"') {
            inString = !inString;
            if (depth > 0) buffer += char;
            continue;
          }

          if (inString) {
            if (depth > 0) buffer += char;
            continue;
          }

          if (char === '{') {
            if (depth === 0) buffer = '{';
            else buffer += '{';
            depth++;
          } else if (char === '}') {
            depth--;
            if (depth > 0) {
              buffer += '}';
            } else if (depth === 0) {
              buffer += '}';
              const objStr = buffer;
              buffer = '';
              try {
                const obj = cleanAndParseJson(objStr);
                if (obj && typeof obj === 'object') {
                  count++;
                  await onRecord(obj, count);
                  if (count >= maxRecords) {
                    stream.destroy();
                    return count;
                  }
                }
              } catch (err) {}
            }
          } else {
            if (depth > 0) buffer += char;
          }
        }
      }
    } catch (err) {
      if (err.name !== 'AbortError' && !stream.destroyed) throw err;
    }
  }

  return count;
}

/**
 * Standard JSON to Excel streaming conversion for files of ANY size (including > 512MB / 1GB+)
 */
async function executeStreamingStandard(filePath, outputPath, options = {}) {
  const { flatten = true, originalName, filters, selectedColumns } = options;

  // Pass 1: Sample up to 1,000 records to discover all column headers
  const columnsSet = new Set();
  let sampleCount = 0;

  await streamJsonObjects(filePath, (record) => {
    const processed = (flatten && typeof record === 'object' && record !== null) ? flattenObject(record) : record;
    if (processed && typeof processed === 'object') {
      Object.keys(processed).forEach(k => columnsSet.add(k));
    }
    sampleCount++;
  }, { maxRecords: 1000 });

  let columnKeys = Array.from(columnsSet);
  if (Array.isArray(selectedColumns) && selectedColumns.length > 0) {
    const filtered = selectedColumns.filter(c => columnsSet.has(c));
    if (filtered.length > 0) {
      columnKeys = filtered;
    }
  }

  const workbook = new ExcelJS.stream.xlsx.WorkbookWriter({
    filename: outputPath,
    useStyles: true,
    useSharedStrings: false
  });

  const worksheet = workbook.addWorksheet('Sheet1', {
    views: [{ state: 'frozen', xSplit: 0, ySplit: 1 }]
  });

  if (columnKeys.length > 0) {
    worksheet.columns = columnKeys.map(key => ({
      header: key,
      key: key,
      width: Math.max(key.length + 4, 15)
    }));

    // Style header row
    const headerRow = worksheet.getRow(1);
    headerRow.height = 28;
    headerRow.eachCell(cell => {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E293B' } };
      cell.font = { name: 'Segoe UI', bold: true, color: { argb: 'FFFFFFFF' }, size: 11 };
      cell.alignment = { vertical: 'middle', horizontal: 'center' };
      cell.border = {
        top: { style: 'thin', color: { argb: 'FF334155' } },
        left: { style: 'thin', color: { argb: 'FF334155' } },
        bottom: { style: 'medium', color: { argb: 'FF0F172A' } },
        right: { style: 'thin', color: { argb: 'FF334155' } }
      };
    });
    headerRow.commit();
  }

  let totalRows = 0;

  // Pass 2: Stream all records and write rows directly
  await streamJsonObjects(filePath, async (record) => {
    const processed = (flatten && typeof record === 'object' && record !== null) ? flattenObject(record) : record;

    // Apply row filter if specified
    if (filters && !matchesFilter(processed, filters)) {
      return;
    }

    const rowData = {};

    columnKeys.forEach(col => {
      let val = processed[col];
      if (val === undefined || val === null) {
        rowData[col] = '';
      } else if (typeof val === 'boolean') {
        rowData[col] = val ? 'TRUE' : 'FALSE';
      } else if (typeof val === 'object') {
        rowData[col] = JSON.stringify(val);
      } else {
        rowData[col] = val;
      }
    });

    const row = worksheet.addRow(rowData);
    row.height = 20;

    const isEven = totalRows % 2 === 0;
    row.eachCell({ includeEmpty: true }, cell => {
      cell.font = { name: 'Segoe UI', size: 10 };
      cell.alignment = { vertical: 'middle', horizontal: 'left' };
      cell.border = {
        top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        right: { style: 'thin', color: { argb: 'FFE2E8F0' } }
      };
      if (isEven) {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8FAFC' } };
      }
    });

    row.commit();
    totalRows++;
  });

  // Add Summary Total Count Row at the bottom of the table
  const summaryRowData = {};
  if (columnKeys.length > 0) {
    summaryRowData[columnKeys[0]] = `รวมทั้งหมด ${totalRows.toLocaleString()} รายการ (แถวข้อมูล)`;
  }
  const summaryRow = worksheet.addRow(summaryRowData);
  summaryRow.height = 24;
  summaryRow.eachCell({ includeEmpty: true }, (cell, colNumber) => {
    cell.font = { name: 'Segoe UI', size: 10, bold: true, color: { argb: 'FF0F172A' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE2E8F0' } };
    cell.border = {
      top: { style: 'medium', color: { argb: 'FF94A3B8' } },
      bottom: { style: 'double', color: { argb: 'FF475569' } },
      left: { style: 'thin', color: { argb: 'FFCBD5E1' } },
      right: { style: 'thin', color: { argb: 'FFCBD5E1' } }
    };
    if (colNumber === 1) {
      cell.alignment = { vertical: 'middle', horizontal: 'left' };
    }
  });
  summaryRow.commit();

  worksheet.commit();
  await workbook.commit();

  return {
    totalRows,
    totalColumns: columnKeys.length,
    sheetNames: ['Sheet1']
  };
}

/**
 * Standard in-memory JSON to Excel conversion
 */
function normalizeJsonData(rawData, shouldFlatten = true, filters = null, selectedColumns = null) {
  const sheets = {};

  if (!rawData) {
    throw new Error('ไม่พบข้อมูล JSON');
  }

  const data = typeof rawData === 'string' ? safeJsonParse(rawData) : rawData;

  const processList = (arr) => {
    let list = arr.map(item => (shouldFlatten && typeof item === 'object' && item !== null ? flattenObject(item) : item));
    if (filters) {
      list = list.filter(item => matchesFilter(item, filters));
    }
    if (Array.isArray(selectedColumns) && selectedColumns.length > 0) {
      list = list.map(item => {
        if (typeof item !== 'object' || item === null) return item;
        const filteredObj = {};
        selectedColumns.forEach(col => {
          if (col in item) filteredObj[col] = item[col];
        });
        return filteredObj;
      });
    }
    return list;
  };

  if (Array.isArray(data)) {
    sheets['Sheet1'] = processList(data);
  } else if (typeof data === 'object' && data !== null) {
    const arrayKeys = Object.keys(data).filter(k => Array.isArray(data[k]));

    if (arrayKeys.length > 0) {
      arrayKeys.forEach(k => {
        const sheetName = k.substring(0, 30);
        sheets[sheetName] = processList(data[k]);
      });
    } else {
      let singleObj = shouldFlatten ? flattenObject(data) : data;
      if (!filters || matchesFilter(singleObj, filters)) {
        if (Array.isArray(selectedColumns) && selectedColumns.length > 0) {
          const filteredObj = {};
          selectedColumns.forEach(col => {
            if (col in singleObj) filteredObj[col] = singleObj[col];
          });
          singleObj = filteredObj;
        }
        sheets['Data'] = [singleObj];
      } else {
        sheets['Data'] = [];
      }
    }
  } else {
    throw new Error('โครงสร้างไฟล์ JSON ไม่ถูกต้อง');
  }

  return sheets;
}

/**
 * Execute conversion from JSON file/data to Excel (.xlsx) using ExcelJS
 * Saves files automatically in both item-excel and uploads directories.
 */
const execute = async (inputSource, options = {}) => {
  const isFileSource = typeof inputSource === 'string' && fs.existsSync(inputSource);
  let defaultBaseName = options.originalName ? path.parse(options.originalName).name : 'export_data';

  if (isFileSource && !options.originalName) {
    defaultBaseName = path.parse(inputSource).name;
  }

  // Ensure directories exist
  const uploadsDir = path.join(process.cwd(), 'uploads');
  const itemExcelDir = path.join(process.cwd(), 'item-excel');
  if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
  if (!fs.existsSync(itemExcelDir)) fs.mkdirSync(itemExcelDir, { recursive: true });

  const fileSize = isFileSource ? fs.statSync(inputSource).size : 0;
  const isLargeFile = fileSize > 50 * 1024 * 1024; // > 50MB

  // For file sources with standard mode or large files, use streaming directly
  if (isFileSource && (options.mode === 'standard' || isLargeFile)) {
    // Check if Gov mode was explicitly requested or file is moderate size
    let isGovMode = options.mode === 'gov';
    
    if (!isGovMode && !isLargeFile) {
      // Check for error log structure if file is moderate
      try {
        let sampleCheck = '';
        const fd = fs.openSync(inputSource, 'r');
        const buffer = Buffer.alloc(Math.min(fileSize, 64 * 1024));
        fs.readSync(fd, buffer, 0, buffer.length, 0);
        fs.closeSync(fd);
        sampleCheck = buffer.toString('utf8');
        if (sampleCheck.includes('error_cases') || sampleCheck.includes('error_records_count')) {
          if (options.mode !== 'standard') {
            isGovMode = true;
          }
        }
      } catch {}
    }

    if (!isGovMode) {
      // Execute streaming standard mode
      const outputFileName = `${defaultBaseName}_${Date.now()}.xlsx`;
      const outputPath = path.join(uploadsDir, outputFileName);
      const archivePath = path.join(itemExcelDir, outputFileName);

      const streamResult = await executeStreamingStandard(inputSource, outputPath, {
        flatten: options.flatten !== false,
        originalName: options.originalName,
        filters: options.filters,
        selectedColumns: options.selectedColumns
      });

      try {
        fs.copyFileSync(outputPath, archivePath);
      } catch (copyErr) {
        console.warn('Could not copy to item-excel:', copyErr.message);
      }

      return {
        outputPath,
        archivePath,
        fileName: outputFileName,
        totalRows: streamResult.totalRows,
        totalColumns: streamResult.totalColumns,
        sheetNames: streamResult.sheetNames,
        isGovFormat: false
      };
    }
  }

  // Standard in-memory conversion path for smaller files or raw in-memory JSON data
  let rawContent;
  if (isFileSource) {
    // Read safely with chunked buffer if needed to prevent string length overflow
    rawContent = fs.readFileSync(inputSource, 'utf-8');
  } else if (typeof inputSource === 'object' || typeof inputSource === 'string') {
    rawContent = inputSource;
  } else {
    throw new Error('ไม่พบแหล่งข้อมูล JSON ที่ถูกต้อง');
  }

  const parsedData = typeof rawContent === 'string' ? safeJsonParse(rawContent) : rawContent;
  const isErrorLog = detectErrorLogStructure(parsedData);
  const useGovMode = options.mode === 'gov' || options.format === 'gov' || (isErrorLog && options.mode !== 'standard');

  let workbook;
  let totalRowsCount = 0;
  let allColumnsCount = 0;
  let sheetNames = [];

  if (useGovMode && isErrorLog) {
    const govResult = await buildGovErrorReportWorkbook(parsedData, options);
    workbook = govResult.workbook;
    totalRowsCount = govResult.totalRows;
    allColumnsCount = govResult.totalColumns;
    sheetNames = govResult.sheetNames;
  } else {
    // Standard table mode
    const sheetsData = normalizeJsonData(parsedData, options.flatten !== false, options.filters, options.selectedColumns);
    workbook = new ExcelJS.Workbook();
    workbook.creator = 'DDC Data Platform';
    workbook.created = new Date();

    sheetNames = Object.keys(sheetsData);

    for (const sheetName of sheetNames) {
      const records = sheetsData[sheetName];
      const worksheet = workbook.addWorksheet(sheetName, {
        views: [{ state: 'frozen', xSplit: 0, ySplit: 1 }]
      });

      if (!records || records.length === 0) {
        worksheet.addRow(['(ไม่มีข้อมูล)']);
        continue;
      }

      const columnKeysSet = new Set();
      records.forEach(row => {
        if (row && typeof row === 'object') {
          Object.keys(row).forEach(k => columnKeysSet.add(k));
        }
      });

      const columnKeys = Array.from(columnKeysSet);
      allColumnsCount = Math.max(allColumnsCount, columnKeys.length);
      totalRowsCount += records.length;

      worksheet.columns = columnKeys.map(key => ({
        header: key,
        key: key,
        width: Math.max(key.length + 4, 15)
      }));

      const headerRow = worksheet.getRow(1);
      headerRow.height = 28;
      headerRow.eachCell((cell) => {
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FF1E293B' }
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

      // Add Summary Total Count Row at the bottom of the table
      const summaryRowData = {};
      if (columnKeys.length > 0) {
        summaryRowData[columnKeys[0]] = `รวมทั้งหมด ${records.length.toLocaleString()} รายการ (แถวข้อมูล)`;
      }
      const summaryRow = worksheet.addRow(summaryRowData);
      summaryRow.height = 24;
      summaryRow.eachCell({ includeEmpty: true }, (cell, colNumber) => {
        cell.font = { name: 'Segoe UI', size: 10, bold: true, color: { argb: 'FF0F172A' } };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE2E8F0' } };
        cell.border = {
          top: { style: 'medium', color: { argb: 'FF94A3B8' } },
          bottom: { style: 'double', color: { argb: 'FF475569' } },
          left: { style: 'thin', color: { argb: 'FFCBD5E1' } },
          right: { style: 'thin', color: { argb: 'FFCBD5E1' } }
        };
        if (colNumber === 1) {
          cell.alignment = { vertical: 'middle', horizontal: 'left' };
        }
      });

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

      worksheet.autoFilter = {
        from: { row: 1, column: 1 },
        to: { row: records.length + 1, column: columnKeys.length }
      };
    }
  }

  const prefix = useGovMode && isErrorLog ? `DDC_Error_Report_${defaultBaseName}` : defaultBaseName;
  const outputFileName = `${prefix}_${Date.now()}.xlsx`;
  const outputPath = path.join(uploadsDir, outputFileName);
  const archivePath = path.join(itemExcelDir, outputFileName);

  // Write file to uploads
  await workbook.xlsx.writeFile(outputPath);

  // Also duplicate / archive to item-excel permanently
  try {
    fs.copyFileSync(outputPath, archivePath);
  } catch (copyErr) {
    console.warn('Could not copy to item-excel:', copyErr.message);
  }

  return {
    outputPath,
    archivePath,
    fileName: outputFileName,
    totalRows: totalRowsCount,
    totalColumns: allColumnsCount,
    sheetNames,
    isGovFormat: useGovMode && isErrorLog
  };
};

module.exports = {
  execute,
  executeStreamingStandard,
  streamJsonObjects,
  normalizeJsonData,
  safeJsonParse,
  detectErrorLogStructure,
  buildGovErrorReportWorkbook
};
