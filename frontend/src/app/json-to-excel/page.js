"use client";

import React, { useState, useMemo } from 'react';
import {
  Box,
  Typography,
  Button,
  Container,
  CircularProgress,
  Card,
  CardContent,
  Fade,
  useTheme,
  Grid,
  Chip,
  FormControlLabel,
  Switch,
  Alert,
  Divider,
  Stack,
  IconButton,
  Tooltip,
  TextField,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  ToggleButton,
  ToggleButtonGroup,
  Checkbox,
  InputAdornment,
  Collapse,
  Paper
} from '@mui/material';
import axios from 'axios';
import Swal from 'sweetalert2';
import Link from 'next/link';
import FileUploadDropzone from '@/components/FileUploadDropzone';

// Exclusively use Material UI icons
import TableChartIcon from '@mui/icons-material/TableChart';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import AccountBalanceIcon from '@mui/icons-material/AccountBalance';
import DescriptionIcon from '@mui/icons-material/Description';
import CheckCircleOutlinedIcon from '@mui/icons-material/CheckCircleOutlined';
import ErrorOutlinedIcon from '@mui/icons-material/ErrorOutlined';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import PlayCircleFilledWhiteIcon from '@mui/icons-material/PlayCircleFilledWhite';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import LayersIcon from '@mui/icons-material/Layers';
import FilterAltIcon from '@mui/icons-material/FilterAlt';
import TuneIcon from '@mui/icons-material/Tune';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import SearchIcon from '@mui/icons-material/Search';
import ViewColumnIcon from '@mui/icons-material/ViewColumn';
import CheckBoxIcon from '@mui/icons-material/CheckBox';
import CheckBoxOutlineBlankIcon from '@mui/icons-material/CheckBoxOutlineBlank';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';

// Operator definitions with friendly Thai labels
const FILTER_OPERATORS = [
  { value: 'contains', label: 'ประกอบด้วย (Contains)' },
  { value: 'year_equals', label: '📅 กรองเฉพาะปี (Year is: ค.ศ./พ.ศ.)' },
  { value: 'equals', label: 'เท่ากับ (==)' },
  { value: 'not_equals', label: 'ไม่เท่ากับ (!=)' },
  { value: 'starts_with', label: 'ขึ้นต้นด้วย' },
  { value: 'ends_with', label: 'ลงท้ายด้วย' },
  { value: 'not_contains', label: 'ไม่มีคำว่า (Not Contains)' },
  { value: 'gt', label: 'มากกว่า (>)' },
  { value: 'gte', label: 'มากกว่าหรือเท่ากับ (>=)' },
  { value: 'lt', label: 'น้อยกว่า (<)' },
  { value: 'lte', label: 'น้อยกว่าหรือเท่ากับ (<=)' },
  { value: 'is_empty', label: 'เป็นค่าว่าง (Null / Empty)' },
  { value: 'is_not_empty', label: 'ไม่เป็นค่าว่าง (Not Empty)' }
];

// Client-side flatten helper
function flattenObjectClient(obj, prefix = '', res = {}) {
  for (const key in obj) {
    if (!Object.prototype.hasOwnProperty.call(obj, key)) continue;
    const propName = prefix ? `${prefix}.${key}` : key;
    const val = obj[key];

    if (val !== null && typeof val === 'object' && !Array.isArray(val) && !(val instanceof Date)) {
      flattenObjectClient(val, propName, res);
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

// Client-side rule tester
function testClientRule(item, rule) {
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

export default function JsonToExcelPage() {
  const [jsonFile, setJsonFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [flatten, setFlatten] = useState(true);
  const [exportMode, setExportMode] = useState('gov'); // 'gov' or 'standard'
  const [fileStats, setFileStats] = useState(null);
  const [isErrorLogDetected, setIsErrorLogDetected] = useState(false);
  
  // Filter & Column Selection State
  const [availableFields, setAvailableFields] = useState([]);
  const [parsedItems, setParsedItems] = useState([]);
  const [filterLogic, setFilterLogic] = useState('AND'); // 'AND' | 'OR'
  const [filterRules, setFilterRules] = useState([]);
  const [selectedColumns, setSelectedColumns] = useState([]);
  const [columnSearch, setColumnSearch] = useState('');
  const [showFilterSettings, setShowFilterSettings] = useState(true);
  const [activeTab, setActiveTab] = useState('filter'); // 'filter' | 'columns'

  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';

  // Handle local file selection to analyze preview stats safely without memory overflow
  const handleFileChange = (file) => {
    setJsonFile(file);
    setFilterRules([]);
    setColumnSearch('');
    
    if (!file) {
      setFileStats(null);
      setIsErrorLogDetected(false);
      setAvailableFields([]);
      setParsedItems([]);
      setSelectedColumns([]);
      return;
    }

    const fileSizeMB = (file.size / (1024 * 1024)).toFixed(2);
    const isLarge = file.size > 2 * 1024 * 1024; // > 2MB

    const reader = new FileReader();
    reader.onerror = () => {
      setFileStats({
        type: `ไฟล์ JSON (${fileSizeMB} MB)`,
        rows: 'พร้อมสำหรับการแปลง (Streaming)',
        columns: '-',
        hasErrorCases: false,
        sampleKeys: []
      });
    };

    reader.onload = (e) => {
      try {
        let text = e.target.result;
        if (typeof text === 'string' && text.charCodeAt(0) === 0xFEFF) {
          text = text.slice(1);
        }

        if (isLarge) {
          // Quick detection for large files using sample chunk
          const hasErrorCases = text.includes('error_cases') || (text.includes('error_records_count') && text.includes('total_records'));
          setIsErrorLogDetected(hasErrorCases);
          if (hasErrorCases) {
            setExportMode('gov');
          }

          // Extract sample keys using regex or partial object parse
          const sampleKeys = [];
          const matchFirstObj = text.match(/\{[\s\S]*?\}/);
          if (matchFirstObj) {
            try {
              const cleaned = matchFirstObj[0].replace(/\\'/g, "'").replace(/\\\\"/g, '\\"');
              const parsedSample = JSON.parse(cleaned);
              const flattened = flatten ? flattenObjectClient(parsedSample) : parsedSample;
              Object.keys(flattened).forEach(k => {
                if (!sampleKeys.includes(k)) sampleKeys.push(k);
              });
            } catch {
              const keyMatches = text.matchAll(/"([^"]+)":/g);
              for (const m of keyMatches) {
                if (!sampleKeys.includes(m[1])) sampleKeys.push(m[1]);
                if (sampleKeys.length >= 30) break;
              }
            }
          }

          setAvailableFields(sampleKeys);
          setSelectedColumns(sampleKeys);
          setParsedItems([]);

          setFileStats({
            type: hasErrorCases ? `บันทึกข้อผิดพลาดขนาดใหญ่ (${fileSizeMB} MB)` : `ตารางข้อมูลขนาดใหญ่ (${fileSizeMB} MB)`,
            rows: 'ประมวลผลขณะแปลงไฟล์ (Streaming Mode)',
            columns: sampleKeys.length > 0 ? `${sampleKeys.length}+ คอลัมน์` : '-',
            hasErrorCases: false,
            sampleKeys: sampleKeys.slice(0, 10)
          });
          return;
        }

        let parsed;
        try {
          parsed = JSON.parse(text);
        } catch {
          try {
            const cleaned = text.replace(/\\'/g, "'").replace(/\\\\"/g, '\\"');
            parsed = JSON.parse(cleaned);
          } catch {
            const doubleCleaned = text.replace(/\\"/g, '"');
            parsed = JSON.parse(doubleCleaned);
          }
        }

        const rawList = Array.isArray(parsed) ? parsed : (typeof parsed === 'object' && parsed !== null ? [parsed] : []);
        const sample = rawList[0] || {};
        
        // Detect Error Log structure (like test.json)
        const hasErrorCases = 'error_cases' in sample || ('error_records_count' in sample && 'total_records' in sample);
        setIsErrorLogDetected(hasErrorCases);
        if (hasErrorCases) {
          setExportMode('gov');
        }

        // Collect all distinct fields across records
        const allKeysSet = new Set();
        let flatItems = [];

        if (hasErrorCases) {
          // Flatten error_cases if present
          let allErrors = [];
          rawList.forEach(item => {
            let cases = item.error_cases;
            if (typeof cases === 'string') {
              try { cases = JSON.parse(cases); } catch { cases = []; }
            }
            if (Array.isArray(cases)) {
              cases.forEach(c => allErrors.push(c));
            }
          });
          flatItems = allErrors.map(it => flatten ? flattenObjectClient(it) : it);
        } else {
          flatItems = rawList.map(it => flatten ? flattenObjectClient(it) : it);
        }

        flatItems.forEach(it => {
          if (it && typeof it === 'object') {
            Object.keys(it).forEach(k => allKeysSet.add(k));
          }
        });

        const extractedFields = Array.from(allKeysSet);
        setAvailableFields(extractedFields);
        setSelectedColumns(extractedFields);
        setParsedItems(flatItems);

        if (Array.isArray(parsed)) {
          let errorCasesCount = 0;
          let totalRecordsSum = 0;
          let validImportedSum = 0;

          if (hasErrorCases) {
            rawList.forEach(item => {
              totalRecordsSum += Number(item.total_records) || 0;
              validImportedSum += Number(item.valid_imported_count) || 0;
              let cases = item.error_cases;
              if (typeof cases === 'string') {
                try {
                  cases = JSON.parse(cases);
                } catch {
                  try {
                    cases = JSON.parse(cases.replace(/\\\\"/g, '\\"'));
                  } catch {
                    cases = [];
                  }
                }
              }
              if (Array.isArray(cases)) errorCasesCount += cases.length;
              else if (item.error_records_count) errorCasesCount += Number(item.error_records_count);
            });
          }

          setFileStats({
            type: hasErrorCases ? 'บันทึกสรุปข้อผิดพลาด (Error Cases Log)' : 'ตารางข้อมูล (Array of Objects)',
            rows: parsed.length,
            columns: extractedFields.length,
            hasErrorCases,
            totalRecordsSum,
            validImportedSum,
            errorCasesCount,
            sampleKeys: extractedFields.slice(0, 10)
          });
        } else if (typeof parsed === 'object') {
          setFileStats({
            type: 'Single JSON Object / Dictionary',
            rows: 1,
            columns: extractedFields.length,
            hasErrorCases: false,
            sampleKeys: extractedFields.slice(0, 10)
          });
        }
      } catch (err) {
        setFileStats({
          type: `ไฟล์ JSON (${fileSizeMB} MB)`,
          rows: 'พร้อมสำหรับการแปลง',
          columns: '-',
          hasErrorCases: false,
          sampleKeys: []
        });
      }
    };

    // For files > 2MB, read only a 128KB sample slice to avoid memory spikes and V8 string limits
    if (isLarge) {
      const sliceBlob = file.slice(0, 128 * 1024);
      reader.readAsText(sliceBlob);
    } else {
      reader.readAsText(file);
    }
  };

  // Rule management helpers
  const handleAddRule = () => {
    const defaultField = availableFields[0] || '';
    setFilterRules(prev => [
      ...prev,
      {
        id: `rule_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
        field: defaultField,
        operator: 'contains',
        value: ''
      }
    ]);
  };

  const handleRemoveRule = (id) => {
    setFilterRules(prev => prev.filter(r => r.id !== id));
  };

  const handleUpdateRule = (id, key, val) => {
    setFilterRules(prev => prev.map(r => {
      if (r.id === id) {
        return { ...r, [key]: val };
      }
      return r;
    }));
  };

  const handleClearFilters = () => {
    setFilterRules([]);
  };

  // Column selection helpers
  const handleSelectAllColumns = () => {
    setSelectedColumns([...availableFields]);
  };

  const handleDeselectAllColumns = () => {
    setSelectedColumns([]);
  };

  const handleToggleColumn = (col) => {
    setSelectedColumns(prev => {
      if (prev.includes(col)) {
        return prev.filter(c => c !== col);
      } else {
        return [...prev, col];
      }
    });
  };

  // Filtered preview row count
  const activeRules = useMemo(() => {
    return filterRules.filter(r => r && r.field && r.field.trim() !== '');
  }, [filterRules]);

  const filteredPreviewCount = useMemo(() => {
    if (parsedItems.length === 0 || activeRules.length === 0) {
      return parsedItems.length;
    }
    return parsedItems.filter(item => {
      if (filterLogic === 'OR') {
        return activeRules.some(rule => testClientRule(item, rule));
      } else {
        return activeRules.every(rule => testClientRule(item, rule));
      }
    }).length;
  }, [parsedItems, activeRules, filterLogic]);

  const filteredColumnsList = useMemo(() => {
    if (!columnSearch.trim()) return availableFields;
    const q = columnSearch.toLowerCase();
    return availableFields.filter(f => f.toLowerCase().includes(q));
  }, [availableFields, columnSearch]);

  const handleSubmit = async (overrideMode) => {
    if (!jsonFile) {
      return Swal.fire({
        title: 'แจ้งเตือน',
        text: 'กรุณาเลือกไฟล์ JSON ก่อนเริ่มการแปลงไฟล์',
        icon: 'warning',
        confirmButtonColor: '#4f46e5'
      });
    }

    const currentMode = overrideMode || exportMode;
    setLoading(true);

    const formData = new FormData();
    formData.append('jsonFile', jsonFile);
    formData.append('flatten', flatten ? 'true' : 'false');
    formData.append('mode', currentMode);

    // Append Filter Rules if configured
    if (activeRules.length > 0) {
      formData.append('filters', JSON.stringify({
        logic: filterLogic,
        rules: activeRules
      }));
    }

    // Append Selected Columns if configured
    if (selectedColumns.length > 0 && selectedColumns.length !== availableFields.length) {
      formData.append('selectedColumns', JSON.stringify(selectedColumns));
    }

    try {
      const response = await axios.post('http://localhost:3000/api/report/json-to-excel', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        responseType: 'blob'
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;

      // Extract filename from response header or create default
      let filename = 'DDC_Report.xlsx';
      const disposition = response.headers['content-disposition'];
      if (disposition && disposition.indexOf('filename=') !== -1) {
        const matches = /filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/.exec(disposition);
        if (matches != null && matches[1]) {
          filename = decodeURIComponent(matches[1].replace(/['"]/g, ''));
        }
      } else {
        const baseName = jsonFile.name.replace(/\.[^/.]+$/, "");
        filename = `${currentMode === 'gov' ? 'DDC_Gov_Report_' : 'Excel_Export_'}${baseName}.xlsx`;
      }

      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.remove();

      Swal.fire({
        title: 'แปลงไฟล์สำเร็จ!',
        html: `ระบบได้แปลงไฟล์เป็น <strong>${filename}</strong> ${activeRules.length > 0 ? `<br/><span style="color:#059669">กรองตาม ${activeRules.length} เงื่อนไขเรียบร้อย</span>` : ''} และจัดเก็บสำเนาไว้ในโฟลเดอร์ <code>item-excel</code> เรียบร้อยแล้ว`,
        icon: 'success',
        confirmButtonColor: '#10b981'
      });
    } catch (error) {
      console.error('Error converting JSON to Excel:', error);
      let errorMsg = 'ไม่สามารถแปลงไฟล์ JSON ได้ กรุณาตรวจสอบความถูกต้องของโครงสร้างไฟล์';
      if (error.response && error.response.data) {
        if (error.response.data instanceof Blob) {
          try {
            const text = await error.response.data.text();
            const parsed = JSON.parse(text);
            if (parsed.error) errorMsg = parsed.error;
          } catch {}
        } else if (typeof error.response.data.error === 'string') {
          errorMsg = error.response.data.error;
        }
      }
      Swal.fire({
        title: 'เกิดข้อผิดพลาด',
        text: errorMsg,
        icon: 'error',
        confirmButtonColor: '#f43f5e'
      });
    } finally {
      setLoading(false);
    }
  };

  // Quick convert test.json (Gov format)
  const handleConvertSampleGov = async () => {
    setLoading(true);
    try {
      const response = await axios.get('http://localhost:3000/api/report/json-to-excel/sample-gov-test', {
        responseType: 'blob'
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'DDC_Error_Report_test.xlsx');
      document.body.appendChild(link);
      link.click();
      link.remove();

      Swal.fire({
        title: 'ส่งออกรูปแบบราชการสำเร็จ!',
        html: 'ดาวน์โหลดไฟล์ <strong>DDC_Error_Report_test.xlsx</strong> พร้อมบันทึกในระบบเรียบร้อยแล้ว',
        icon: 'success',
        confirmButtonColor: '#059669'
      });
    } catch (error) {
      Swal.fire('ข้อผิดพลาด', 'ไม่สามารถสร้างไฟล์ตัวอย่างได้', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Quick convert user_bma.json
  const handleConvertSampleBma = async () => {
    setLoading(true);
    try {
      const response = await axios.get('http://localhost:3000/api/report/json-to-excel/sample-bma', {
        responseType: 'blob'
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'user_bma.xlsx');
      document.body.appendChild(link);
      link.click();
      link.remove();

      Swal.fire({
        title: 'แปลงตัวอย่างสำเร็จ!',
        html: 'ดาวน์โหลดไฟล์ <strong>user_bma.xlsx</strong> สำเร็จ',
        icon: 'success',
        confirmButtonColor: '#0284c7'
      });
    } catch (error) {
      Swal.fire('ข้อผิดพลาด', 'ไม่สามารถสร้างไฟล์ตัวอย่างได้', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container maxWidth="md" sx={{ py: { xs: 4, md: 7 }, pb: 10 }}>
      {/* Back button */}
      <Box sx={{ mb: 3 }}>
        <Button
          component={Link}
          href="/"
          startIcon={<ArrowBackIcon />}
          sx={{
            color: 'text.secondary',
            borderRadius: 2,
            '&:hover': { color: 'primary.main', bgcolor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)' }
          }}
        >
          กลับหน้าหลัก
        </Button>
      </Box>

      {/* Header */}
      <Fade in={true} timeout={500}>
        <Box sx={{ mb: 4, textAlign: 'center' }}>
          <Box sx={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 64,
            height: 64,
            borderRadius: 3,
            background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
            color: 'white',
            mb: 2,
            boxShadow: '0 8px 24px -4px rgba(2, 132, 199, 0.4)'
          }}>
            <TableChartIcon sx={{ fontSize: 34 }} />
          </Box>
          <Typography
            variant="h3"
            sx={{
              fontWeight: 800,
              mb: 1.5,
              fontSize: { xs: '1.8rem', md: '2.5rem' },
              background: 'linear-gradient(135deg, #0284c7 0%, #38bdf8 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent'
            }}
          >
            แปลง JSON เป็น Excel
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ maxWidth: '680px', mx: 'auto', lineHeight: 1.6 }}>
            แปลงไฟล์ JSON ทุกรูปแบบ พร้อมตัวกรองข้อมูลหลายเงื่อนไข (Filter Rules) เลือกฟิลด์/คอลัมน์ และโหมดราชการ (DDC Error Log Report)
          </Typography>
        </Box>
      </Fade>

      {/* Quick Sample Buttons */}
      <Fade in={true} timeout={700}>
        <Box sx={{ mb: 4, display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 2 }}>
          <Button
            variant="contained"
            onClick={handleConvertSampleGov}
            disabled={loading}
            startIcon={<AccountBalanceIcon />}
            sx={{
              borderRadius: 3,
              bgcolor: '#0f2942',
              color: 'white',
              py: 1.2,
              px: 3,
              fontWeight: 700,
              boxShadow: '0 4px 14px rgba(15, 41, 66, 0.3)',
              '&:hover': {
                bgcolor: '#1e3a8a'
              }
            }}
          >
            ทดสอบแปลง test.json (รูปแบบราชการ DDC)
          </Button>

          <Button
            variant="outlined"
            onClick={handleConvertSampleBma}
            disabled={loading}
            startIcon={<DescriptionIcon />}
            sx={{
              borderRadius: 3,
              borderColor: isDark ? 'rgba(56, 189, 248, 0.4)' : '#0284c7',
              color: isDark ? '#38bdf8' : '#0284c7',
              py: 1.2,
              px: 2.5,
              fontWeight: 600,
              '&:hover': {
                borderColor: '#38bdf8',
                bgcolor: isDark ? 'rgba(56, 189, 248, 0.1)' : 'rgba(2, 132, 199, 0.05)'
              }
            }}
          >
            แปลงตัวอย่างทั่วไป (user_bma.json)
          </Button>
        </Box>
      </Fade>

      {/* Main Form Card */}
      <Fade in={true} timeout={900}>
        <Card 
          elevation={0} 
          sx={{ 
            borderRadius: 4, 
            overflow: 'hidden' 
          }}
        >
          <CardContent sx={{ p: { xs: 3, md: 5 } }}>
            <Box component="form" onSubmit={(e) => { e.preventDefault(); handleSubmit(); }}>
              <FileUploadDropzone 
                file={jsonFile} 
                setFile={handleFileChange} 
                accept=".json"
                label="เลือกหรือลากไฟล์ JSON มาวางที่นี่ (เช่น user_bma.json หรือ test.json)"
                helperText="รองรับทั้งไฟล์ตารางข้อมูลทั่วไป (General Array/Object) หรือบันทึก Error Log"
                icon={
                  <Box sx={{
                    width: 56,
                    height: 56,
                    borderRadius: '50%',
                    bgcolor: isDark ? 'rgba(2, 132, 199, 0.15)' : 'rgba(2, 132, 199, 0.1)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: isDark ? '#38bdf8' : '#0284c7',
                    mb: 1.5
                  }}>
                    <CloudUploadIcon sx={{ fontSize: 32 }} />
                  </Box>
                }
              />

              {/* File Stats Preview */}
              {fileStats && (
                <Box sx={{ 
                  my: 3, 
                  p: 3, 
                  borderRadius: 3, 
                  bgcolor: isDark ? 'rgba(15, 23, 42, 0.6)' : '#f8fafc',
                  border: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : '#e2e8f0'}`
                }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 700, color: isDark ? '#38bdf8' : '#0284c7' }}>
                      ผลการวิเคราะห์ไฟล์ JSON:
                    </Typography>
                    {isErrorLogDetected && (
                      <Chip 
                        icon={<CheckCircleOutlinedIcon sx={{ fontSize: 16 }} />}
                        label="ตรวจพบ Error Cases Log (แนะนำรูปแบบราชการ)" 
                        color="success" 
                        size="small" 
                        sx={{ fontWeight: 700 }} 
                      />
                    )}
                  </Box>

                  <Grid container spacing={2}>
                    <Grid size={{ xs: 12, sm: 6 }}>
                      <Typography variant="caption" color="text.secondary">ประเภทโครงสร้าง:</Typography>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>{fileStats.type}</Typography>
                    </Grid>
                    {fileStats.hasErrorCases ? (
                      <>
                        <Grid size={{ xs: 6, sm: 3 }}>
                          <Typography variant="caption" color="text.secondary">ข้อมูลทั้งหมด:</Typography>
                          <Typography variant="body2" sx={{ fontWeight: 700, color: '#0284c7' }}>{fileStats.totalRecordsSum} รายการ</Typography>
                        </Grid>
                        <Grid size={{ xs: 6, sm: 3 }}>
                          <Typography variant="caption" color="text.secondary">พบข้อผิดพลาด:</Typography>
                          <Typography variant="body2" sx={{ fontWeight: 700, color: '#dc2626' }}>{fileStats.errorCasesCount} รายการ</Typography>
                        </Grid>
                      </>
                    ) : (
                      <>
                        <Grid size={{ xs: 6, sm: 3 }}>
                          <Typography variant="caption" color="text.secondary">จำนวนแถว (Rows):</Typography>
                          <Typography variant="body2" sx={{ fontWeight: 600 }}>{fileStats.rows}</Typography>
                        </Grid>
                        <Grid size={{ xs: 6, sm: 3 }}>
                          <Typography variant="caption" color="text.secondary">จำนวนคอลัมน์:</Typography>
                          <Typography variant="body2" sx={{ fontWeight: 600 }}>{fileStats.columns}</Typography>
                        </Grid>
                      </>
                    )}
                  </Grid>

                  {fileStats.sampleKeys && fileStats.sampleKeys.length > 0 && (
                    <Box sx={{ mt: 2 }}>
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
                        ตัวอย่างฟิลด์ที่ตรวจพบ:
                      </Typography>
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.8 }}>
                        {fileStats.sampleKeys.map((k) => (
                          <Chip key={k} label={k} size="small" variant="outlined" sx={{ fontSize: '0.75rem' }} />
                        ))}
                      </Box>
                    </Box>
                  )}
                </Box>
              )}

              {/* DYNAMIC FILTER & COLUMN SELECTION PANEL */}
              {availableFields.length > 0 && (
                <Box sx={{ 
                  mb: 3.5, 
                  p: 2.5, 
                  borderRadius: 3, 
                  bgcolor: isDark ? 'rgba(30, 41, 59, 0.7)' : '#f8fafc',
                  border: `1.5px solid ${isDark ? 'rgba(56, 189, 248, 0.3)' : '#bae6fd'}`,
                  boxShadow: '0 4px 16px rgba(2, 132, 199, 0.08)'
                }}>
                  {/* Panel Header with Toggle */}
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.2 }}>
                      <Box sx={{ 
                        p: 0.8, 
                        borderRadius: 2, 
                        bgcolor: isDark ? 'rgba(2, 132, 199, 0.25)' : '#e0f2fe',
                        color: isDark ? '#38bdf8' : '#0284c7' 
                      }}>
                        <FilterAltIcon sx={{ fontSize: 20 }} />
                      </Box>
                      <Box>
                        <Typography variant="subtitle1" sx={{ fontWeight: 700, color: isDark ? '#f1f5f9' : '#0f172a' }}>
                          ตัวกรองข้อมูลและเลือกคอลัมน์ (Filter & Field Selection)
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          กำหนดเงื่อนไขกรองแถวข้อมูล หรือเลือกเฉพาะคอลัมน์ที่ต้องการ Export
                        </Typography>
                      </Box>
                    </Box>

                    <IconButton 
                      size="small" 
                      onClick={() => setShowFilterSettings(prev => !prev)}
                      sx={{ color: 'text.secondary' }}
                    >
                      {showFilterSettings ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                    </IconButton>
                  </Box>

                  <Collapse in={showFilterSettings}>
                    {/* Mode Tabs (Filter Rules / Column Picker) */}
                    <Box sx={{ display: 'flex', gap: 1, mb: 2.5, borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : '#e2e8f0'}`, pb: 1 }}>
                      <Button
                        size="small"
                        onClick={() => setActiveTab('filter')}
                        startIcon={<TuneIcon />}
                        variant={activeTab === 'filter' ? 'contained' : 'text'}
                        sx={{
                          borderRadius: 2,
                          textTransform: 'none',
                          fontWeight: 700,
                          bgcolor: activeTab === 'filter' ? '#0284c7' : 'transparent',
                          color: activeTab === 'filter' ? 'white' : 'text.secondary'
                        }}
                      >
                        เงื่อนไขการกรอง ({activeRules.length})
                      </Button>

                      <Button
                        size="small"
                        onClick={() => setActiveTab('columns')}
                        startIcon={<ViewColumnIcon />}
                        variant={activeTab === 'columns' ? 'contained' : 'text'}
                        sx={{
                          borderRadius: 2,
                          textTransform: 'none',
                          fontWeight: 700,
                          bgcolor: activeTab === 'columns' ? '#0284c7' : 'transparent',
                          color: activeTab === 'columns' ? 'white' : 'text.secondary'
                        }}
                      >
                        เลือกคอลัมน์ ({selectedColumns.length}/{availableFields.length})
                      </Button>
                    </Box>

                    {/* TAB 1: FILTER RULES */}
                    {activeTab === 'filter' && (
                      <Box>
                        {/* Filter Logic & Controls */}
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 1.5, mb: 2 }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                            <Typography variant="caption" sx={{ fontWeight: 600, color: 'text.secondary' }}>
                              รูปแบบเงื่อนไข:
                            </Typography>
                            <ToggleButtonGroup
                              size="small"
                              value={filterLogic}
                              exclusive
                              onChange={(e, val) => val && setFilterLogic(val)}
                              sx={{
                                height: 32,
                                '& .MuiToggleButton-root': {
                                  px: 1.5,
                                  fontSize: '0.75rem',
                                  fontWeight: 600,
                                  borderRadius: 1.5
                                }
                              }}
                            >
                              <ToggleButton value="AND" color="primary">ตรงทุกเงื่อนไข (AND)</ToggleButton>
                              <ToggleButton value="OR" color="secondary">ตรงเงื่อนไขใดเงื่อนไขหนึ่ง (OR)</ToggleButton>
                            </ToggleButtonGroup>
                          </Box>

                          <Box sx={{ display: 'flex', gap: 1 }}>
                            {filterRules.length > 0 && (
                              <Button
                                size="small"
                                color="error"
                                onClick={handleClearFilters}
                                startIcon={<RestartAltIcon sx={{ fontSize: 16 }} />}
                                sx={{ fontSize: '0.75rem', textTransform: 'none' }}
                              >
                                ล้างตัวกรองทั้งหมด
                              </Button>
                            )}
                            <Button
                              size="small"
                              variant="contained"
                              onClick={handleAddRule}
                              startIcon={<AddIcon sx={{ fontSize: 16 }} />}
                              sx={{
                                fontSize: '0.75rem',
                                textTransform: 'none',
                                fontWeight: 700,
                                borderRadius: 2,
                                bgcolor: '#0284c7',
                                '&:hover': { bgcolor: '#0369a1' }
                              }}
                            >
                              เพิ่มเงื่อนไข
                            </Button>
                          </Box>
                        </Box>

                        {/* Rules List */}
                        {filterRules.length === 0 ? (
                          <Box sx={{ 
                            p: 3, 
                            textAlign: 'center', 
                            borderRadius: 2, 
                            border: `1px dashed ${isDark ? 'rgba(255,255,255,0.15)' : '#cbd5e1'}`,
                            bgcolor: isDark ? 'rgba(15,23,42,0.3)' : 'rgba(241,245,249,0.5)'
                          }}>
                            <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
                              ยังไม่ได้กำหนดเงื่อนไขการกรอง (จะแปลงและส่งออกข้อมูลทั้งหมด)
                            </Typography>
                            <Button
                              size="small"
                              variant="outlined"
                              onClick={handleAddRule}
                              startIcon={<AddIcon />}
                              sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 600 }}
                            >
                              กดเพิ่มเงื่อนไขการกรองแรก
                            </Button>
                          </Box>
                        ) : (
                          <Stack spacing={1.5} sx={{ mb: 2 }}>
                            {filterRules.map((rule, idx) => {
                              const noValueNeeded = rule.operator === 'is_empty' || rule.operator === 'is_not_empty';

                              return (
                                <Paper
                                  key={rule.id}
                                  elevation={0}
                                  sx={{
                                    p: 1.5,
                                    borderRadius: 2,
                                    bgcolor: isDark ? 'rgba(15, 23, 42, 0.6)' : '#ffffff',
                                    border: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : '#e2e8f0'}`,
                                    display: 'flex',
                                    flexWrap: { xs: 'wrap', md: 'nowrap' },
                                    alignItems: 'center',
                                    gap: 1.5
                                  }}
                                >
                                  <Chip 
                                    label={`#${idx + 1}`} 
                                    size="small" 
                                    sx={{ fontWeight: 700, bgcolor: isDark ? 'rgba(255,255,255,0.1)' : '#f1f5f9' }} 
                                  />

                                  {/* Field Selector */}
                                  <FormControl size="small" sx={{ minWidth: 160, flex: { xs: '1 1 100%', sm: '1 1 auto' } }}>
                                    <InputLabel>เลือกฟิลด์ (Field)</InputLabel>
                                    <Select
                                      value={rule.field}
                                      label="เลือกฟิลด์ (Field)"
                                      onChange={(e) => handleUpdateRule(rule.id, 'field', e.target.value)}
                                    >
                                      {availableFields.map(field => (
                                        <MenuItem key={field} value={field}>
                                          <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>{field}</Typography>
                                        </MenuItem>
                                      ))}
                                    </Select>
                                  </FormControl>

                                  {/* Operator Selector */}
                                  <FormControl size="small" sx={{ minWidth: 170, flex: { xs: '1 1 100%', sm: '1 1 auto' } }}>
                                    <InputLabel>เงื่อนไข (Operator)</InputLabel>
                                    <Select
                                      value={rule.operator}
                                      label="เงื่อนไข (Operator)"
                                      onChange={(e) => handleUpdateRule(rule.id, 'operator', e.target.value)}
                                    >
                                      {FILTER_OPERATORS.map(op => (
                                        <MenuItem key={op.value} value={op.value}>
                                          <Typography variant="body2">{op.label}</Typography>
                                        </MenuItem>
                                      ))}
                                    </Select>
                                  </FormControl>

                                  {/* Value Input */}
                                  <TextField
                                    size="small"
                                    placeholder={noValueNeeded ? '(ไม่ต้องระบุค่า)' : 'ใส่ค่าที่ต้องการกรอง...'}
                                    disabled={noValueNeeded}
                                    value={rule.value}
                                    onChange={(e) => handleUpdateRule(rule.id, 'value', e.target.value)}
                                    sx={{ flex: { xs: '1 1 100%', md: 2 } }}
                                  />

                                  {/* Delete Button */}
                                  <IconButton
                                    size="small"
                                    color="error"
                                    onClick={() => handleRemoveRule(rule.id)}
                                    sx={{
                                      p: 0.8,
                                      borderRadius: 1.5,
                                      '&:hover': { bgcolor: isDark ? 'rgba(239, 68, 68, 0.15)' : 'rgba(239, 68, 68, 0.1)' }
                                    }}
                                  >
                                    <DeleteIcon sx={{ fontSize: 20 }} />
                                  </IconButton>
                                </Paper>
                              );
                            })}
                          </Stack>
                        )}

                        {/* Live Filter Result Status */}
                        {parsedItems.length > 0 && activeRules.length > 0 && (
                          <Box sx={{ 
                            p: 1.5, 
                            borderRadius: 2, 
                            bgcolor: isDark ? 'rgba(2, 132, 199, 0.15)' : '#e0f2fe',
                            display: 'flex', 
                            alignItems: 'center', 
                            justifyContent: 'space-between'
                          }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <CheckCircleOutlinedIcon sx={{ color: '#0284c7', fontSize: 18 }} />
                              <Typography variant="body2" sx={{ fontWeight: 600, color: isDark ? '#38bdf8' : '#0369a1' }}>
                                ข้อมูลที่ตรงตามเงื่อนไข: <strong>{filteredPreviewCount.toLocaleString()}</strong> / {parsedItems.length.toLocaleString()} แถว
                              </Typography>
                            </Box>
                            <Chip 
                              label={`${((filteredPreviewCount / Math.max(parsedItems.length, 1)) * 100).toFixed(1)}% ของทั้งหมด`} 
                              size="small" 
                              color="primary" 
                              sx={{ fontWeight: 700, fontSize: '0.7rem' }} 
                            />
                          </Box>
                        )}
                      </Box>
                    )}

                    {/* TAB 2: COLUMN SELECTION */}
                    {activeTab === 'columns' && (
                      <Box>
                        {/* Search and Quick Select Actions */}
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 1.5, mb: 2 }}>
                          <TextField
                            size="small"
                            placeholder="ค้นหาชื่อคอลัมน์/ฟิลด์..."
                            value={columnSearch}
                            onChange={(e) => setColumnSearch(e.target.value)}
                            InputProps={{
                              startAdornment: (
                                <InputAdornment position="start">
                                  <SearchIcon sx={{ fontSize: 18, color: 'text.secondary' }} />
                                </InputAdornment>
                              )
                            }}
                            sx={{ minWidth: 220, flex: 1 }}
                          />

                          <Box sx={{ display: 'flex', gap: 1 }}>
                            <Button
                              size="small"
                              variant="outlined"
                              onClick={handleSelectAllColumns}
                              sx={{ fontSize: '0.75rem', borderRadius: 2, textTransform: 'none' }}
                            >
                              เลือกทั้งหมด ({availableFields.length})
                            </Button>
                            <Button
                              size="small"
                              variant="outlined"
                              color="secondary"
                              onClick={handleDeselectAllColumns}
                              sx={{ fontSize: '0.75rem', borderRadius: 2, textTransform: 'none' }}
                            >
                              ล้างทั้งหมด
                            </Button>
                          </Box>
                        </Box>

                        {/* Column Checkboxes Grid */}
                        <Box sx={{ 
                          maxHeight: 260, 
                          overflowY: 'auto', 
                          p: 1.5, 
                          borderRadius: 2, 
                          bgcolor: isDark ? 'rgba(15,23,42,0.4)' : '#ffffff',
                          border: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : '#e2e8f0'}`
                        }}>
                          {filteredColumnsList.length === 0 ? (
                            <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 2 }}>
                              ไม่พบคอลัมน์ที่ตรงกับคำค้นหา
                            </Typography>
                          ) : (
                            <Grid container spacing={1}>
                              {filteredColumnsList.map(col => {
                                const isChecked = selectedColumns.includes(col);
                                return (
                                  <Grid size={{ xs: 12, sm: 6, md: 4 }} key={col}>
                                    <Box
                                      onClick={() => handleToggleColumn(col)}
                                      sx={{
                                        p: 0.8,
                                        px: 1.2,
                                        borderRadius: 1.5,
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 1,
                                        cursor: 'pointer',
                                        bgcolor: isChecked 
                                          ? (isDark ? 'rgba(2, 132, 199, 0.2)' : '#e0f2fe')
                                          : 'transparent',
                                        border: `1px solid ${isChecked ? (isDark ? 'rgba(56, 189, 248, 0.4)' : '#bae6fd') : (isDark ? 'rgba(255,255,255,0.05)' : '#f1f5f9')}`,
                                        transition: 'all 0.15s',
                                        '&:hover': {
                                          bgcolor: isDark ? 'rgba(255,255,255,0.06)' : '#f1f5f9'
                                        }
                                      }}
                                    >
                                      <Checkbox
                                        size="small"
                                        checked={isChecked}
                                        icon={<CheckBoxOutlineBlankIcon sx={{ fontSize: 18 }} />}
                                        checkedIcon={<CheckBoxIcon sx={{ fontSize: 18 }} />}
                                        sx={{ p: 0 }}
                                      />
                                      <Typography 
                                        variant="caption" 
                                        sx={{ 
                                          fontWeight: isChecked ? 700 : 500, 
                                          fontFamily: 'monospace',
                                          color: isChecked ? (isDark ? '#38bdf8' : '#0369a1') : 'text.primary',
                                          overflow: 'hidden',
                                          textOverflow: 'ellipsis',
                                          whiteSpace: 'nowrap'
                                        }}
                                      >
                                        {col}
                                      </Typography>
                                    </Box>
                                  </Grid>
                                );
                              })}
                            </Grid>
                          )}
                        </Box>

                        <Box sx={{ mt: 1.5, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <Typography variant="caption" color="text.secondary">
                            * คอลัมน์ที่ไม่ได้เลือกจะถูกตัดออกจากการสร้างไฟล์ Excel
                          </Typography>
                          <Typography variant="caption" sx={{ fontWeight: 700, color: '#0284c7' }}>
                            เลือกแล้ว {selectedColumns.length} จาก {availableFields.length} คอลัมน์
                          </Typography>
                        </Box>
                      </Box>
                    )}
                  </Collapse>
                </Box>
              )}

              {/* Format Selection Cards */}
              <Box sx={{ mb: 3.5, p: 2.5, borderRadius: 3, bgcolor: isDark ? 'rgba(30, 41, 59, 0.5)' : '#f1f5f9' }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1.5, display: 'flex', alignItems: 'center', gap: 1 }}>
                  <LayersIcon sx={{ fontSize: 18 }} />
                  <span>เลือกรูปแบบรายงาน Excel ที่ต้องการ:</span>
                </Typography>

                <Grid container spacing={2}>
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <Card 
                      onClick={() => setExportMode('gov')}
                      sx={{ 
                        p: 2, 
                        cursor: 'pointer', 
                        borderRadius: 2.5, 
                        border: exportMode === 'gov' ? '2px solid #059669' : '1px solid rgba(0,0,0,0.1)',
                        bgcolor: exportMode === 'gov' ? (isDark ? 'rgba(5, 150, 105, 0.15)' : 'rgba(5, 150, 105, 0.06)') : 'transparent',
                        transition: 'all 0.2s'
                      }}
                    >
                      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 0.5 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <AccountBalanceIcon sx={{ color: exportMode === 'gov' ? '#059669' : 'inherit', fontSize: 20 }} />
                          <Typography variant="subtitle2" sx={{ fontWeight: 700, color: exportMode === 'gov' ? '#059669' : 'inherit' }}>
                            รูปแบบราชการ (DDC Report)
                          </Typography>
                        </Box>
                        {exportMode === 'gov' && <Chip label="เลือกอยู่" size="small" color="success" sx={{ height: 20, fontSize: '0.7rem' }} />}
                      </Box>
                      <Typography variant="caption" color="text.secondary">
                        มีหัวหนังสือทางการ, กล่องสรุปสถิติ, แสดง Field ครบทั้งหมด และคอลัมน์สาเหตุข้อผิดพลาดอยู่ขวาสุด
                      </Typography>
                    </Card>
                  </Grid>

                  <Grid size={{ xs: 12, sm: 6 }}>
                    <Card 
                      onClick={() => setExportMode('standard')}
                      sx={{ 
                        p: 2, 
                        cursor: 'pointer', 
                        borderRadius: 2.5, 
                        border: exportMode === 'standard' ? '2px solid #0284c7' : '1px solid rgba(0,0,0,0.1)',
                        bgcolor: exportMode === 'standard' ? (isDark ? 'rgba(2, 132, 199, 0.15)' : 'rgba(2, 132, 199, 0.06)') : 'transparent',
                        transition: 'all 0.2s'
                      }}
                    >
                      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 0.5 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <TableChartIcon sx={{ color: exportMode === 'standard' ? '#0284c7' : 'inherit', fontSize: 20 }} />
                          <Typography variant="subtitle2" sx={{ fontWeight: 700, color: exportMode === 'standard' ? '#0284c7' : 'inherit' }}>
                            รูปแบบตารางมาตรฐาน (Raw Data)
                          </Typography>
                        </Box>
                        {exportMode === 'standard' && <Chip label="เลือกอยู่" size="small" color="primary" sx={{ height: 20, fontSize: '0.7rem' }} />}
                      </Box>
                      <Typography variant="caption" color="text.secondary">
                        ตารางข้อมูลแบบ Raw Grid ปกติ เหมาะสำหรับนำเข้าต่อในระบบฐานข้อมูลหรือ Pivot Table
                      </Typography>
                    </Card>
                  </Grid>
                </Grid>

                <Box sx={{ mt: 2, pt: 1 }}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={flatten}
                        onChange={(e) => setFlatten(e.target.checked)}
                        color="primary"
                      />
                    }
                    label={
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        แตกโครงสร้าง Nested Object เป็นคอลัมน์อัตโนมัติ (Flatten JSON)
                      </Typography>
                    }
                  />
                </Box>
              </Box>

              {/* Action Buttons */}
              <Stack spacing={2}>
                <Button 
                  onClick={() => handleSubmit('gov')}
                  variant="contained" 
                  fullWidth 
                  size="large" 
                  disabled={loading || !jsonFile}
                  startIcon={<AccountBalanceIcon />}
                  sx={{ 
                    py: 1.8, 
                    background: 'linear-gradient(135deg, #0F2942 0%, #065F46 100%)',
                    boxShadow: '0 8px 20px -4px rgba(6, 95, 70, 0.4)',
                    color: 'white',
                    fontWeight: 700,
                    fontSize: '1rem',
                    borderRadius: 3
                  }}
                >
                  {loading ? <CircularProgress size={26} color="inherit" /> : 'แปลงเป็นรายงานรูปแบบราชการ (DDC Report)'}
                </Button>

                <Button 
                  onClick={() => handleSubmit('standard')}
                  variant="outlined" 
                  fullWidth 
                  size="large" 
                  disabled={loading || !jsonFile}
                  startIcon={<FileDownloadIcon />}
                  sx={{ 
                    py: 1.5, 
                    borderColor: isDark ? 'rgba(255,255,255,0.2)' : '#cbd5e1',
                    color: isDark ? '#e2e8f0' : '#475569',
                    fontWeight: 600,
                    borderRadius: 3,
                    '&:hover': {
                      borderColor: '#0284c7',
                      bgcolor: isDark ? 'rgba(2, 132, 199, 0.1)' : 'rgba(2, 132, 199, 0.05)'
                    }
                  }}
                >
                  แปลงเป็นตาราง Excel ทั่วไป (Standard Grid)
                </Button>
              </Stack>
            </Box>
          </CardContent>
        </Card>
      </Fade>
    </Container>
  );
}

