const fs = require('fs');
const path = require('path');

const ENUM_FILE_PATH = path.join(process.cwd(), 'src', 'config', 'addressEnumMapping.json');

// Default initial mapping from Excel standard if file does not exist
const DEFAULT_MAPPING = {
  '100003': 'ไม่นำเข้าฐาน Epinet',
  '100501': 100502,
  '100599': 100502,
  '100640': 100601,
  '100815': 100801,
  '100901': 100910,
  '100903': 100910,
  '100906': 100910,
  '101003': 101001,
  '101010': 101001,
  '101202': 101203,
  '101403': 101406,
  '101405': 101406,
  '101599': 101501,
  '102103': 102105,
  '102205': 100905,
  '102301': 102302,
  '102403': 102401,
  '102600': 102601,
  '103204': 103201,
  '103601': 103602,
  '103603': 103602,
  '103609': 103602,
  '104440': 104401,
  '104700': 104703,
  '104701': 104702,
  '105000': 105002,
  '105001': 105002,
  '150200': 150201,
  '310109': 310112,
  '332205': 332201,
  '661206': 661201,
  '000000': 'ไม่นำเข้าฐาน Epinet'
};

function ensureFileExists() {
  const dir = path.dirname(ENUM_FILE_PATH);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  if (!fs.existsSync(ENUM_FILE_PATH)) {
    fs.writeFileSync(ENUM_FILE_PATH, JSON.stringify(DEFAULT_MAPPING, null, 2), 'utf-8');
  }
}

/**
 * Get all enum mappings
 */
function getAllMappings() {
  ensureFileExists();
  try {
    const raw = fs.readFileSync(ENUM_FILE_PATH, 'utf-8');
    return JSON.parse(raw);
  } catch (err) {
    return { ...DEFAULT_MAPPING };
  }
}

/**
 * Save / Update mappings
 */
function saveMappings(newMapping) {
  ensureFileExists();
  fs.writeFileSync(ENUM_FILE_PATH, JSON.stringify(newMapping, null, 2), 'utf-8');
  return newMapping;
}

/**
 * Set single mapping or multiple mappings
 */
function updateMapping(invalidCode, suggestedValue, description = '') {
  const current = getAllMappings();
  const code = String(invalidCode).trim();
  const val = typeof suggestedValue === 'string' ? suggestedValue.trim() : suggestedValue;
  current[code] = val;
  saveMappings(current);
  return { code, value: val };
}

/**
 * Bulk update or merge mappings
 */
function mergeMappings(batchObj) {
  const current = getAllMappings();
  let addedCount = 0;
  let updatedCount = 0;

  for (const [k, v] of Object.entries(batchObj)) {
    const code = String(k).trim();
    if (!code) continue;
    if (current[code] !== undefined) {
      updatedCount++;
    } else {
      addedCount++;
    }
    current[code] = typeof v === 'string' ? v.trim() : v;
  }
  saveMappings(current);
  return { total: Object.keys(current).length, addedCount, updatedCount, mappings: current };
}

/**
 * Delete a mapping
 */
function deleteMapping(invalidCode) {
  const current = getAllMappings();
  const code = String(invalidCode).trim();
  if (current[code] !== undefined) {
    delete current[code];
    saveMappings(current);
    return true;
  }
  return false;
}

/**
 * Reset mappings to default
 */
function resetToDefault() {
  saveMappings(DEFAULT_MAPPING);
  return DEFAULT_MAPPING;
}

/**
 * Inspect a list of error cases or JSON against Enum mapping
 * Returns list of unique invalid_code with status (existing, new/missing, resolved)
 */
function analyzeErrorCasesAgainstEnum(cases) {
  const currentMapping = getAllMappings();
  const map = {};

  if (Array.isArray(cases)) {
    cases.forEach(ec => {
      const code = ec.invalid_code ? String(ec.invalid_code).trim() : '';
      if (!code) return;

      if (!map[code]) {
        const isExisting = currentMapping[code] !== undefined;
        map[code] = {
          invalid_code: code,
          suggested_code: currentMapping[code] || '',
          is_existing: isExisting,
          status: isExisting ? 'mapped' : 'unmapped',
          count: 0,
          sample_cases: []
        };
      }

      map[code].count++;
      if (map[code].sample_cases.length < 3) {
        map[code].sample_cases.push({
          uuid: ec.uuid,
          citizen_id: ec.citizen_id,
          raw_address: ec.raw_address || ec.address,
          address: ec.address,
          moo: ec.moo,
          road: ec.road,
          tmb_code: ec.tmb_code,
          amp_code: ec.amp_code,
          chw_code: ec.chw_code,
          error_reason: ec.error_reason
        });
      }
    });
  }

  const items = Object.values(map);
  return {
    total_unique_invalid_codes: items.length,
    mapped_count: items.filter(i => i.is_existing).length,
    unmapped_count: items.filter(i => !i.is_existing).length,
    codes: items
  };
}

module.exports = {
  ENUM_FILE_PATH,
  DEFAULT_MAPPING,
  getAllMappings,
  saveMappings,
  updateMapping,
  mergeMappings,
  deleteMapping,
  resetToDefault,
  analyzeErrorCasesAgainstEnum
};
