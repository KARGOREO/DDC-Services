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
  Fade
} from '@mui/material';
import axios from 'axios';
import Swal from 'sweetalert2';
import Link from 'next/link';
import FileUploadDropzone from '@/components/FileUploadDropzone';

// Exclusively use Material UI icons
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import TerminalIcon from '@mui/icons-material/Terminal';
import FileDownloadIcon from '@mui/icons-material/FileDownload';

export default function SqlGeneratePage() {
  const [excelFile, setExcelFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!excelFile) {
      return Swal.fire('แจ้งเตือน', 'กรุณาอัปโหลดไฟล์ Excel ก่อนครับ', 'warning');
    }

    setLoading(true);
    const formData = new FormData();
    formData.append('excelFile', excelFile);

    try {
      const response = await axios.post(`http://localhost:3000/api/sql/generate-delete`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        responseType: 'blob'
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      
      let filename = 'delete_records.sql';
      const disposition = response.headers['content-disposition'];
      if (disposition && disposition.indexOf('filename=') !== -1) {
        const matches = /filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/.exec(disposition);
        if (matches != null && matches[1]) { 
          filename = matches[1].replace(/['"]/g, '');
        }
      }
      
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      Swal.fire('สำเร็จ!', `ดาวน์โหลดสคริปต์ ${filename} และบันทึกไฟล์ Excel ไว้ในระบบเรียบร้อย`, 'success');
      setExcelFile(null);
    } catch (error) {
      Swal.fire('ผิดพลาด', 'เกิดข้อผิดพลาดในการประมวลผล', 'error');
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

      <Fade in={true} timeout={500}>
        <Box sx={{ mb: 4, textAlign: 'center' }}>
          <Box sx={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 64,
            height: 64,
            borderRadius: 3,
            background: 'linear-gradient(135deg, #f43f5e 0%, #e11d48 100%)',
            color: 'white',
            mb: 2,
            boxShadow: '0 8px 24px -4px rgba(244, 63, 94, 0.4)'
          }}>
            <TerminalIcon sx={{ fontSize: 34 }} />
          </Box>
          <Typography variant="h3" sx={{ 
            fontWeight: 800, 
            mb: 1.5, 
            fontSize: { xs: '1.8rem', md: '2.5rem' },
            background: 'linear-gradient(135deg, #f43f5e 0%, #fb7185 100%)', 
            WebkitBackgroundClip: 'text', 
            WebkitTextFillColor: 'transparent' 
          }}>
            สร้างคำสั่ง SQL ลบข้อมูล (Delete Query)
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ maxWidth: '600px', mx: 'auto' }}>
            แปลงไฟล์ Excel รายการเคสเป็นคำสั่ง SQL สำหรับลบข้อมูลในระบบฐานข้อมูลอย่างปลอดภัย
          </Typography>
        </Box>
      </Fade>

      <Fade in={true} timeout={800}>
        <Card elevation={0} sx={{ borderRadius: 4, overflow: 'hidden' }}>
          <CardContent sx={{ p: { xs: 3, md: 5 } }}>
            <form onSubmit={handleSubmit}>
              <FileUploadDropzone 
                file={excelFile} 
                setFile={setExcelFile} 
                accept=".xlsx, .xls"
                label="ลากไฟล์ Excel มาวางที่นี่ (.xlsx, .xls)"
                helperText="ไฟล์ Excel ที่มีรายการเคสสำหรับสร้างคำสั่ง Delete"
              />
              <Button 
                type="submit" 
                variant="contained" 
                fullWidth 
                size="large" 
                startIcon={<FileDownloadIcon />}
                disabled={loading || !excelFile}
                sx={{ 
                  py: 1.8, 
                  background: 'linear-gradient(135deg, #f43f5e 0%, #fb7185 100%)',
                  boxShadow: '0 8px 16px -4px rgba(244, 63, 94, 0.3)',
                  color: 'white',
                  borderRadius: 3,
                  fontWeight: 700
                }}
              >
                {loading ? <CircularProgress size={26} color="inherit" /> : 'สร้างและดาวน์โหลด SQL Script'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </Fade>
    </Container>
  );
}
