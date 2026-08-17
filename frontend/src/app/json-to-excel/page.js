"use client";

import React, { useState, useRef } from 'react';
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
  Divider
} from '@mui/material';
import axios from 'axios';
import Swal from 'sweetalert2';
import FileUploadDropzone from '@/components/FileUploadDropzone';

export default function JsonToExcelPage() {
  const [jsonFile, setJsonFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [flatten, setFlatten] = useState(true);
  const [fileStats, setFileStats] = useState(null);
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';

  // Handle local file selection to analyze preview stats
  const handleFileChange = (file) => {
    setJsonFile(file);
    if (!file) {
      setFileStats(null);
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
          // Attempt lenient cleanup if needed
          const cleaned = text.replace(/\\'/g, "'").replace(/\\\\"/g, '\\\\"');
          parsed = JSON.parse(cleaned);
        }

        if (Array.isArray(parsed)) {
          const sampleRow = parsed[0] || {};
          const keys = Object.keys(sampleRow);
          setFileStats({
            type: 'Array of Objects (ตารางข้อมูล)',
            rows: parsed.length,
            columns: keys.length,
            sampleKeys: keys.slice(0, 8)
          });
        } else if (typeof parsed === 'object' && parsed !== null) {
          const arrayKeys = Object.keys(parsed).filter(k => Array.isArray(parsed[k]));
          if (arrayKeys.length > 0) {
            let totalRows = 0;
            arrayKeys.forEach(k => { totalRows += parsed[k].length; });
            setFileStats({
              type: `Multi-Table Data (${arrayKeys.length} ตาราง)`,
              rows: totalRows,
              sheets: arrayKeys,
              columns: arrayKeys.length
            });
          } else {
            setFileStats({
              type: 'Single Object (ข้อมูล 1 รายการ)',
              rows: 1,
              columns: Object.keys(parsed).length,
              sampleKeys: Object.keys(parsed).slice(0, 8)
            });
          }
        }
      } catch {
        setFileStats({
          type: 'ไฟล์ JSON (รอการประมวลผลบนเซิร์ฟเวอร์)',
          rows: '-',
          columns: '-'
        });
      }
    };
    reader.readAsText(file);
  };

  const handleDownloadResponse = (response, defaultName = 'export.xlsx') => {
    let filename = defaultName;
    const disposition = response.headers['content-disposition'];
    if (disposition && disposition.indexOf('filename=') !== -1) {
      const matches = /filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/.exec(disposition);
      if (matches != null && matches[1]) {
        filename = matches[1].replace(/['"]/g, '');
      }
    }

    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    link.remove();
    return filename;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!jsonFile) {
      return Swal.fire('แจ้งเตือน', 'กรุณาเลือกไฟล์ JSON ก่อนเริ่มแปลงไฟล์', 'warning');
    }

    setLoading(true);
    const formData = new FormData();
    formData.append('jsonFile', jsonFile);
    formData.append('flatten', flatten);

    try {
      const response = await axios.post(`http://localhost:3000/api/report/json-to-excel`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        responseType: 'blob'
      });

      const filename = handleDownloadResponse(response, `${jsonFile.name.replace(/\.[^/.]+$/, "")}.xlsx`);
      Swal.fire({
        title: 'แปลงไฟล์สำเร็จ!',
        text: `ดาวน์โหลดไฟล์ ${filename} เรียบร้อยแล้ว`,
        icon: 'success',
        confirmButtonColor: '#0284c7'
      });
    } catch (error) {
      Swal.fire('ผิดพลาด', 'เกิดข้อผิดพลาดในการแปลงไฟล์ JSON เป็น Excel', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleConvertSample = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`http://localhost:3000/api/report/json-to-excel/sample-bma`, {
        responseType: 'blob'
      });
      const filename = handleDownloadResponse(response, 'user_bma.xlsx');
      Swal.fire({
        title: 'สำเร็จ!',
        text: `แปลงไฟล์ตัวอย่าง ${filename} เรียบร้อยแล้ว`,
        icon: 'success',
        confirmButtonColor: '#0284c7'
      });
    } catch (error) {
      Swal.fire('ผิดพลาด', 'ไม่สามารถดึงไฟล์ตัวอย่าง user_bma.json ได้', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container maxWidth="md" sx={{ mt: { xs: 4, md: 8 }, pb: 8 }}>
      <Fade in={true} timeout={500}>
        <Box sx={{ mb: 4, textAlign: 'center' }}>
          <Typography 
            variant="h3" 
            sx={{ 
              fontWeight: 800, 
              mb: 2, 
              background: 'linear-gradient(135deg, #0284c7 0%, #38bdf8 100%)', 
              WebkitBackgroundClip: 'text', 
              WebkitTextFillColor: 'transparent' 
            }}
          >
            แปลง JSON เป็น Excel
          </Typography>
          <Typography variant="h6" color="text.secondary" sx={{ maxWidth: '650px', mx: 'auto' }}>
            แปลงไฟล์ JSON ทุกรูปแบบ (Database Export / user_bma.json) เป็นไฟล์ Excel (.xlsx) อัตโนมัติ พร้อมจัดสไตล์หัวตารางและคำนวณขนาดคอลัมน์ให้อัตโนมัติ
          </Typography>
        </Box>
      </Fade>

      <Fade in={true} timeout={700}>
        <Box sx={{ mb: 3, display: 'flex', justifyContent: 'center' }}>
          <Button
            variant="outlined"
            onClick={handleConvertSample}
            disabled={loading}
            startIcon={
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                <polyline points="7 10 12 15 17 10"></polyline>
                <line x1="12" y1="15" x2="12" y2="3"></line>
              </svg>
            }
            sx={{
              borderRadius: 3,
              borderColor: isDark ? 'rgba(56, 189, 248, 0.4)' : '#0284c7',
              color: isDark ? '#38bdf8' : '#0284c7',
              py: 1,
              px: 2.5,
              '&:hover': {
                borderColor: '#38bdf8',
                bgcolor: isDark ? 'rgba(56, 189, 248, 0.1)' : 'rgba(2, 132, 199, 0.05)'
              }
            }}
          >
            ทดสอบแปลงไฟล์ตัวอย่าง user_bma.json ทันที
          </Button>
        </Box>
      </Fade>

      <Fade in={true} timeout={900}>
        <Card 
          elevation={0} 
          sx={{ 
            border: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'}`, 
            borderRadius: 4, 
            overflow: 'hidden' 
          }}
        >
          <CardContent sx={{ p: { xs: 3, md: 5 } }}>
            <form onSubmit={handleSubmit}>
              <FileUploadDropzone 
                file={jsonFile} 
                setFile={handleFileChange} 
                accept=".json"
                label="เลือกหรือลากไฟล์ JSON มาวางที่นี่"
                helperText="รองรับไฟล์ JSON จากฐานข้อมูลทุกรูปแบบ (เช่น user_bma.json)"
                icon={
                  <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke={isDark ? '#38bdf8' : '#0284c7'} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginBottom: '16px' }}>
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                    <polyline points="14 2 14 8 20 8"></polyline>
                    <path d="M10 12l-2 2 2 2"></path>
                    <path d="M14 12l2 2-2 2"></path>
                  </svg>
                }
              />

              {fileStats && (
                <Box sx={{ 
                  mb: 3, 
                  p: 2.5, 
                  borderRadius: 3, 
                  bgcolor: isDark ? 'rgba(15, 23, 42, 0.6)' : '#f8fafc',
                  border: `1px solid ${isDark ? 'rgba(255,255,255,0.05)' : '#e2e8f0'}`
                }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1.5, color: isDark ? '#38bdf8' : '#0284c7' }}>
                    สรุปข้อมูลที่ตรวจพบ:
                  </Typography>
                  <Grid container spacing={2}>
                    <Grid size={{ xs: 12, sm: 4 }}>
                      <Typography variant="caption" color="text.secondary">โครงสร้าง:</Typography>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>{fileStats.type}</Typography>
                    </Grid>
                    <Grid size={{ xs: 6, sm: 4 }}>
                      <Typography variant="caption" color="text.secondary">จำนวนแถว (Records):</Typography>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>{fileStats.rows}</Typography>
                    </Grid>
                    <Grid size={{ xs: 6, sm: 4 }}>
                      <Typography variant="caption" color="text.secondary">จำนวนคอลัมน์:</Typography>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>{fileStats.columns}</Typography>
                    </Grid>
                  </Grid>

                  {fileStats.sampleKeys && fileStats.sampleKeys.length > 0 && (
                    <Box sx={{ mt: 2 }}>
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
                        ตัวอย่างคอลัมน์:
                      </Typography>
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.8 }}>
                        {fileStats.sampleKeys.map((k) => (
                          <Chip key={k} label={k} size="small" variant="outlined" sx={{ fontSize: '0.75rem' }} />
                        ))}
                        {fileStats.columns > fileStats.sampleKeys.length && (
                          <Chip label={`+ อีก ${fileStats.columns - fileStats.sampleKeys.length} คอลัมน์`} size="small" />
                        )}
                      </Box>
                    </Box>
                  )}
                </Box>
              )}

              <Box sx={{ mb: 3, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={flatten}
                      onChange={(e) => setFlatten(e.target.checked)}
                      color="primary"
                    />
                  }
                  label={
                    <Box>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        แตกโครงสร้าง Nested Object เป็นคอลัมน์อัตโนมัติ (Flatten JSON)
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        เช่นแปลง &apos;user.name&apos; ให้เป็นคอลัมน์อัตโนมัติ ไม่ให้ติดเป็น [Object]
                      </Typography>
                    </Box>
                  }
                />
              </Box>

              <Button 
                type="submit" 
                variant="contained" 
                fullWidth 
                size="large" 
                disabled={loading || !jsonFile}
                sx={{ 
                  py: 2, 
                  background: 'linear-gradient(135deg, #0284c7 0%, #38bdf8 100%)',
                  boxShadow: '0 8px 16px -4px rgba(2, 132, 199, 0.3)',
                  color: 'white',
                  fontWeight: 700,
                  fontSize: '1.05rem'
                }}
              >
                {loading ? <CircularProgress size={28} color="inherit" /> : 'แปลงไฟล์และดาวน์โหลด Excel (.xlsx)'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </Fade>
    </Container>
  );
}
