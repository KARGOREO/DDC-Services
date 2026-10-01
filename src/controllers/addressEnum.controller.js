const fs = require('fs');
const xlsx = require('xlsx');
const addressEnumService = require('../services/addressEnum.service');
const jsonToExcelService = require('../services/jsonToExcel.service');

// 1. Get all enum mappings
exports.getMappingsHandler = async (req, res, next) => {
  try {
    const mappings = addressEnumService.getAllMappings();
    return res.json({
      success: true,
      total: Object.keys(mappings).length,
      mappings
    });
  } catch (error) {
    next(error);
  }
};

// 2. Add or update a single enum mapping
exports.updateMappingHandler = async (req, res, next) => {
  try {
    const { invalid_code, suggested_code } = req.body;
    if (!invalid_code || suggested_code === undefined) {
      return res.status(400).json({ error: 'กรุณาระบุ invalid_code และ suggested_code' });
    }

    const result = addressEnumService.updateMapping(invalid_code, suggested_code);
    return res.json({
      success: true,
      message: `บันทึกรหัส ${invalid_code} -> ${suggested_code} สำเร็จ`,
      data: result,
      mappings: addressEnumService.getAllMappings()
    });
  } catch (error) {
    next(error);
  }
};

// 3. Batch merge mappings
exports.mergeMappingsHandler = async (req, res, next) => {
  try {
    const { mappings } = req.body;
    if (!mappings || typeof mappings !== 'object') {
      return res.status(400).json({ error: 'กรุณาระบุ Object mappings' });
    }

    const result = addressEnumService.mergeMappings(mappings);
    return res.json({
      success: true,
      message: `อัปเดต Mapping สำเร็จ (เพิ่มใหม่ ${result.addedCount} รายการ, แก้ไข ${result.updatedCount} รายการ)`,
      ...result
    });
  } catch (error) {
    next(error);
  }
};

// 4. Delete a mapping
exports.deleteMappingHandler = async (req, res, next) => {
  try {
    const { code } = req.params;
    if (!code) {
      return res.status(400).json({ error: 'กรุณาระบุรหัสที่ต้องการลบ' });
    }

    const deleted = addressEnumService.deleteMapping(code);
    if (!deleted) {
      return res.status(404).json({ error: `ไม่พบรหัส ${code} ใน Enum Mapping` });
    }

    return res.json({
      success: true,
      message: `ลบรหัส ${code} เรียบร้อยแล้ว`,
      mappings: addressEnumService.getAllMappings()
    });
  } catch (error) {
    next(error);
  }
};

// 5. Reset to default mappings
exports.resetMappingsHandler = async (req, res, next) => {
  try {
    const mappings = addressEnumService.resetToDefault();
    return res.json({
      success: true,
      message: 'รีเซ็ต Enum Mapping เป็นค่าเริ่มต้นเรียบร้อยแล้ว',
      total: Object.keys(mappings).length,
      mappings
    });
  } catch (error) {
    next(error);
  }
};

// 6. Import mapping from Excel file (e.g. DDC_Error_Report)
exports.importFromExcelHandler = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'กรุณาอัปโหลดไฟล์ Excel' });
    }

    const workbook = xlsx.readFile(req.file.path);
    const firstSheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[firstSheetName];
    const rows = xlsx.utils.sheet_to_json(sheet, { header: 1 });

    // Clean temp file
    if (fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }

    // Find header row containing 'invalid_code' and 'ใช้รหัสแขวง'
    let headerRowIdx = -1;
    let invIdx = -1;
    let sugIdx = -1;

    for (let r = 0; r < Math.min(rows.length, 30); r++) {
      const row = rows[r];
      if (Array.isArray(row)) {
        const i1 = row.indexOf('invalid_code');
        const i2 = row.indexOf('ใช้รหัสแขวง');
        if (i1 !== -1 && i2 !== -1) {
          headerRowIdx = r;
          invIdx = i1;
          sugIdx = i2;
          break;
        }
      }
    }

    if (headerRowIdx === -1) {
      return res.status(400).json({ error: 'ไม่พบคอลัมน์ invalid_code และ ใช้รหัสแขวง ในไฟล์ Excel' });
    }

    const extracted = {};
    for (let r = headerRowIdx + 1; r < rows.length; r++) {
      const row = rows[r];
      if (!row || row.length === 0) continue;
      const inv = row[invIdx];
      const sug = row[sugIdx];
      if (inv !== undefined && inv !== null && String(inv).trim() !== '') {
        const cleanInv = String(inv).trim();
        extracted[cleanInv] = (sug !== undefined && sug !== null) ? sug : '';
      }
    }

    const mergeRes = addressEnumService.mergeMappings(extracted);
    return res.json({
      success: true,
      message: `นำเข้า Enum จาก Excel สำเร็จ พบทั้งหมด ${Object.keys(extracted).length} รายการ (เพิ่มใหม่ ${mergeRes.addedCount} รายการ, ปรับปรุง ${mergeRes.updatedCount} รายการ)`,
      ...mergeRes
    });
  } catch (error) {
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    next(error);
  }
};

// 7. Analyze JSON Data vs Enum Mappings (Pre-check)
exports.analyzeJsonEnumHandler = async (req, res, next) => {
  try {
    let rawData = req.body.jsonData || req.body;

    if (req.file) {
      const content = fs.readFileSync(req.file.path, 'utf-8');
      rawData = jsonToExcelService.safeJsonParse(content);
      if (fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }
    }

    if (typeof rawData === 'string') {
      rawData = jsonToExcelService.safeJsonParse(rawData);
    }

    const items = Array.isArray(rawData) ? rawData : [rawData];
    const allCases = [];

    items.forEach(item => {
      let cases = item.error_cases;
      if (typeof cases === 'string') {
        try {
          cases = jsonToExcelService.safeJsonParse(cases);
        } catch {
          cases = [];
        }
      }
      if (Array.isArray(cases)) {
        allCases.push(...cases);
      } else if (item.invalid_code) {
        allCases.push(item);
      }
    });

    const analysis = addressEnumService.analyzeErrorCasesAgainstEnum(allCases);
    return res.json({
      success: true,
      total_cases: allCases.length,
      ...analysis
    });
  } catch (error) {
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    next(error);
  }
};
