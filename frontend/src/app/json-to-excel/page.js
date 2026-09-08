"use client";

import React, { useState } from 'react';
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
  Tooltip
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

export default function JsonToExcelPage() {
  const [jsonFile, setJsonFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [flatten, setFlatten] = useState(true);
  const [exportMode, setExportMode] = useState('gov'); // 'gov' or 'standard'
  const [fileStats, setFileStats] = useState(null);
  const [isErrorLogDetected, setIsErrorLogDetected] = useState(false);
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';

  // Handle local file selection to analyze preview stats
  const handleFileChange = (file) => {
    setJsonFile(file);
    if (!file) {
      setFileStats(null);
      setIsErrorLogDetected(false);
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target.result;
        let parsed;
        try {
          parsed = JSON.parse(text);
        } catch {
          const cleaned = text.replace(/\\'/g, "'").replace(/\\\\"/g, '\\"');
          parsed = JSON.parse(cleaned);
        }

        const items = Array.isArray(parsed) ? parsed : [parsed];
        const sample = items[0] || {};
        
        // Detect Error Log structure (like test.json)
        const hasErrorCases = 'error_cases' in sample || ('error_records_count' in sample && 'total_records' in sample);
        setIsErrorLogDetected(hasErrorCases);
        if (hasErrorCases) {
          setExportMode('gov');
        }

        if (Array.isArray(parsed)) {
          let errorCasesCount = 0;
          let totalRecordsSum = 0;
          let validImportedSum = 0;

          if (hasErrorCases) {
            items.forEach(item => {
              totalRecordsSum += Number(item.total_records) || 0;
              validImportedSum += Number(item.valid_imported_count) || 0;
              let cases = item.error_cases;
              if (typeof cases === 'string') {
                try {
                  cases = JSON.parse(cases.replace(/\\\\"/g, '\\"'));
                } catch {
                  cases = [];
                }
              }
              if (Array.isArray(cases)) errorCasesCount += cases.length;
              else if (item.error_records_count) errorCasesCount += Number(item.error_records_count);
            });
          }

          setFileStats({
            type: hasErrorCases ? 'บันทึกสรุปข้อผิดพลาด (Error Cases Log)' : 'ตารางข้อมูล (Array of Objects)',
            rows: parsed.length,
            columns: Object.keys(sample).length,
            hasErrorCases,
            totalRecordsSum,
            validImportedSum,
            errorCasesCount,
            sampleKeys: Object.keys(sample).slice(0, 10)
          });
        } else if (typeof parsed === 'object') {
          const keys = Object.keys(parsed);
          setFileStats({
            type: 'Single JSON Object / Dictionary',
            rows: 1,
            columns: keys.length,
            hasErrorCases: false,
            sampleKeys: keys.slice(0, 10)
          });
        }
      } catch (err) {
        setFileStats({
          type: 'ไฟล์ JSON รูปแบบกำหนดเอง (Raw JSON)',
          rows: '-',
          columns: '-',
          hasErrorCases: false,
          sampleKeys: []
        });
      }
    };
    reader.readAsText(file);
  };

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

    try {
      const response = await axios.post('http://localhost:3000/api/files/json-to-excel', formData, {
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
        html: `ระบบได้แปลงไฟล์เป็น <strong>${filename}</strong> และจัดเก็บสำเนาไว้ในโฟลเดอร์ <code>json-to-excel</code> เรียบร้อยแล้ว`,
        icon: 'success',
        confirmButtonColor: '#10b981'
      });
    } catch (error) {
      console.error('Error converting JSON to Excel:', error);
      Swal.fire({
        title: 'เกิดข้อผิดพลาด',
        text: 'ไม่สามารถแปลงไฟล์ JSON ได้ กรุณาตรวจสอบความถูกต้องของโครงสร้างไฟล์',
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
      const response = await axios.get('http://localhost:3000/api/files/sample/test-json-excel?mode=gov', {
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
      const response = await axios.get('http://localhost:3000/api/files/sample/bma-excel', {
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
            แปลงไฟล์ JSON ทุกรูปแบบ พร้อมโหมดราชการ (DDC Error Log Report) สรุปแจกแจงกรณีข้อผิดพลาด และจัดเก็บไฟล์สำเนาในระบบอัตโนมัติ
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
                label="เลือกหรือลากไฟล์ JSON มาวางที่นี่ (เช่น test.json)"
                helperText="รองรับทั้งไฟล์ Array, Single Object, หรือ บันทึก Error Cases Log"
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
                        ตัวอย่าง Keys ที่ตรวจพบ:
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
