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
  useTheme,
  Fade,
  TextField,
  Tabs,
  Tab,
  Alert,
  Paper,
  IconButton,
  Tooltip,
  Divider,
  Stack,
  Chip
} from '@mui/material';
import axios from 'axios';
import Swal from 'sweetalert2';
import Link from 'next/link';
import FileUploadDropzone from '@/components/FileUploadDropzone';

import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import EditLocationAltIcon from '@mui/icons-material/EditLocationAlt';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ClearIcon from '@mui/icons-material/Clear';

export default function UpdateAddressSqlPage() {
  const [tabValue, setTabValue] = useState(0);
  const [jsonText, setJsonText] = useState('');
  const [jsonFile, setJsonFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';

  const handleCopySql = () => {
    if (!result?.sqlContent) return;
    navigator.clipboard.writeText(result.sqlContent);
    Swal.fire({
      icon: 'success',
      title: 'คัดลอกคำสั่ง SQL แล้ว',
      toast: true,
      position: 'top-end',
      showConfirmButton: false,
      timer: 2000
    });
  };

  const handleDownloadSql = () => {
    if (!result?.sqlContent) return;
    const blob = new Blob([result.sqlContent], { type: 'text/plain;charset=utf-8' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', result.outputFileName || 'update_address_fallback.sql');
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setResult(null);

    try {
      let payloadData;

      if (tabValue === 0) {
        // วาง JSON Text
        if (!jsonText.trim()) {
          setLoading(false);
          return Swal.fire('แจ้งเตือน', 'กรุณากรอกหรือวางข้อมูล JSON ก่อนครับ', 'warning');
        }
        try {
          payloadData = JSON.parse(jsonText);
        } catch (err) {
          setLoading(false);
          return Swal.fire('JSON ผิดรูปแบบ', 'กรุณาตรวจสอบโครงสร้าง JSON ให้ถูกต้อง', 'error');
        }
      }

      let response;
      if (tabValue === 0) {
        response = await axios.post('http://localhost:3000/api/sql/generate-update-address', payloadData, {
          headers: { 'Content-Type': 'application/json' }
        });
      } else {
        // อัปโหลดไฟล์ JSON
        if (!jsonFile) {
          setLoading(false);
          return Swal.fire('แจ้งเตือน', 'กรุณาเลือกไฟล์ JSON ก่อนครับ', 'warning');
        }
        const formData = new FormData();
        formData.append('jsonFile', jsonFile);
        response = await axios.post('http://localhost:3000/api/sql/generate-update-address', formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
      }

      if (response.data?.success) {
        setResult(response.data);
        Swal.fire({
          icon: 'success',
          title: 'สร้างคำสั่ง SQL สำเร็จ!',
          text: `พบ ${response.data.count} รายการ (รายการที่เติมข้อมูลที่อยู่ว่าง: ${response.data.updatedEpidemCount} รายการ)`,
          timer: 3000
        });
      } else {
        Swal.fire('เกิดข้อผิดพลาด', response.data?.message || 'ไม่สามารถสร้าง SQL ได้', 'warning');
      }
    } catch (error) {
      console.error(error);
      Swal.fire('ผิดพลาด', error.response?.data?.error || 'เกิดข้อผิดพลาดในการประมวลผล', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container maxWidth="lg" sx={{ py: { xs: 4, md: 7 }, pb: 10 }}>
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
          <Box
            sx={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 64,
              height: 64,
              borderRadius: 3,
              background: 'linear-gradient(135deg, #0284c7 0%, #0284c7 50%, #0369a1 100%)',
              color: 'white',
              boxShadow: '0 8px 24px rgba(2, 132, 199, 0.35)',
              mb: 2
            }}
          >
            <EditLocationAltIcon sx={{ fontSize: 36 }} />
          </Box>
          <Typography variant="h4" fontWeight={800} gutterBottom sx={{ letterSpacing: '-0.5px' }}>
            สร้างคำสั่ง SQL Update ที่อยู่ขณะป่วย
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ maxWidth: 650, mx: 'auto' }}>
            แปลงชุดข้อมูล JSON ที่ได้จากผล Query แล้วสร้างคำสั่ง SQL UPDATE แทนที่ช่องว่าง <code>epidem_...</code> ด้วยที่อยู่ปัจจุบันอัตโนมัติ
          </Typography>
        </Box>
      </Fade>

      {/* Main Input Form */}
      <Card
        sx={{
          borderRadius: 4,
          border: '1px solid',
          borderColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)',
          boxShadow: isDark ? '0 12px 32px rgba(0,0,0,0.4)' : '0 12px 32px rgba(0,0,0,0.04)',
          overflow: 'hidden',
          mb: 4
        }}
      >
        <Box sx={{ borderBottom: 1, borderColor: 'divider', bgcolor: isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)' }}>
          <Tabs value={tabValue} onChange={(e, val) => setTabValue(val)} centered>
            <Tab label="วางข้อมูล JSON (Raw JSON)" sx={{ fontWeight: 600, py: 2 }} />
            <Tab label="อัปโหลดไฟล์ .json" sx={{ fontWeight: 600, py: 2 }} />
          </Tabs>
        </Box>

        <CardContent sx={{ p: { xs: 3, md: 4 } }}>
          <form onSubmit={handleSubmit}>
            {tabValue === 0 ? (
              <Box>
                <Typography variant="subtitle2" fontWeight={600} gutterBottom color="text.secondary">
                  วางข้อมูล JSON Array (จากผล Query หรือ Export):
                </Typography>
                <TextField
                  multiline
                  rows={10}
                  fullWidth
                  placeholder='[&#10;  {&#10;    "epidem_report_guid": "xxxx-xxxx",&#10;    "address": "12/3",&#10;    "chw_code": "10",&#10;    "epidem_address": null,&#10;    "epidem_chw_code": ""&#10;  }&#10;]'
                  value={jsonText}
                  onChange={(e) => setJsonText(e.target.value)}
                  sx={{
                    fontFamily: 'monospace',
                    bgcolor: isDark ? 'rgba(0,0,0,0.2)' : 'rgba(0,0,0,0.01)',
                    '& .MuiInputBase-input': {
                      fontFamily: 'Consolas, Monaco, "Courier New", monospace',
                      fontSize: '0.875rem'
                    }
                  }}
                />
              </Box>
            ) : (
              <Box>
                <Typography variant="subtitle2" fontWeight={600} gutterBottom color="text.secondary" sx={{ mb: 2 }}>
                  เลือกไฟล์ JSON ที่ต้องการประมวลผล:
                </Typography>
                <FileUploadDropzone
                  accept={{ 'application/json': ['.json'] }}
                  onFileSelect={(file) => setJsonFile(file)}
                  selectedFile={jsonFile}
                  title="ลากไฟล์ JSON มาวางที่นี่ หรือคลิกเลือกไฟล์"
                  subtitle="รองรับไฟล์ .json"
                />
              </Box>
            )}

            <Stack direction="row" spacing={2} sx={{ mt: 3 }} justifyContent="flex-end">
              {tabValue === 0 && jsonText && (
                <Button
                  variant="outlined"
                  color="inherit"
                  startIcon={<ClearIcon />}
                  onClick={() => setJsonText('')}
                >
                  ล้างข้อมูล
                </Button>
              )}
              <Button
                type="submit"
                variant="contained"
                disabled={loading}
                startIcon={loading ? <CircularProgress size={20} color="inherit" /> : <PlayArrowIcon />}
                sx={{
                  px: 4,
                  py: 1.2,
                  borderRadius: 2.5,
                  fontWeight: 700,
                  background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
                  boxShadow: '0 4px 14px rgba(2, 132, 199, 0.4)'
                }}
              >
                {loading ? 'กำลังประมวลผล...' : 'สร้างคำสั่ง SQL UPDATE'}
              </Button>
            </Stack>
          </form>
        </CardContent>
      </Card>

      {/* Result Section */}
      {result && (
        <Fade in={true} timeout={600}>
          <Card
            sx={{
              borderRadius: 4,
              border: '1px solid',
              borderColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)',
              boxShadow: isDark ? '0 12px 32px rgba(0,0,0,0.4)' : '0 12px 32px rgba(0,0,0,0.04)'
            }}
          >
            <CardContent sx={{ p: { xs: 3, md: 4 } }}>
              <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ xs: 'flex-start', sm: 'center' }} spacing={2} sx={{ mb: 2 }}>
                <Box>
                  <Typography variant="h6" fontWeight={700} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <CheckCircleIcon color="success" /> ผลลัพธ์คำสั่ง SQL UPDATE
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    สร้างสำเร็จทั้งหมด {result.count} รายการ (ปรับปรุงเคสที่อยู่ว่าง {result.updatedEpidemCount} รายการ)
                  </Typography>
                </Box>
                <Stack direction="row" spacing={1.5}>
                  <Button
                    variant="outlined"
                    startIcon={<ContentCopyIcon />}
                    onClick={handleCopySql}
                    sx={{ borderRadius: 2 }}
                  >
                    คัดลอก SQL
                  </Button>
                  <Button
                    variant="contained"
                    color="success"
                    startIcon={<FileDownloadIcon />}
                    onClick={handleDownloadSql}
                    sx={{ borderRadius: 2, fontWeight: 600 }}
                  >
                    ดาวน์โหลด .sql
                  </Button>
                </Stack>
              </Stack>

              <Paper
                elevation={0}
                sx={{
                  p: 2.5,
                  borderRadius: 2.5,
                  bgcolor: isDark ? '#0f172a' : '#f8fafc',
                  border: '1px solid',
                  borderColor: isDark ? 'rgba(255,255,255,0.08)' : '#e2e8f0',
                  maxHeight: 400,
                  overflowY: 'auto'
                }}
              >
                <Typography
                  component="pre"
                  sx={{
                    fontFamily: 'Consolas, Monaco, "Courier New", monospace',
                    fontSize: '0.85rem',
                    m: 0,
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-all',
                    color: isDark ? '#38bdf8' : '#0369a1'
                  }}
                >
                  {result.sqlContent}
                </Typography>
              </Paper>
            </CardContent>
          </Card>
        </Fade>
      )}
    </Container>
  );
}
