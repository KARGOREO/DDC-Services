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
  Grid
} from '@mui/material';
import axios from 'axios';
import Swal from 'sweetalert2';
import Link from 'next/link';
import FileUploadDropzone from '@/components/FileUploadDropzone';

// Exclusively use Material UI icons
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import HourglassTopIcon from '@mui/icons-material/HourglassTop';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';

export default function AnalyzeDelayPage() {
  const [d506File, setD506File] = useState(null);
  const [eFormFile, setEformFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!d506File || !eFormFile) {
      return Swal.fire('แจ้งเตือน', 'กรุณาอัปโหลดไฟล์ให้ครบทั้ง 2 ไฟล์', 'warning');
    }

    setLoading(true);
    const formData = new FormData();
    formData.append('d506File', d506File);
    formData.append('eFormFile', eFormFile);

    try {
      const response = await axios.post(`http://localhost:3000/api/report/analyze-delay`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        responseType: 'blob'
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'delay_report.xlsx');
      document.body.appendChild(link);
      link.click();
      link.remove();
      Swal.fire('สำเร็จ!', 'ดาวน์โหลดไฟล์ผลการวิเคราะห์เรียบร้อย', 'success');
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
            background: 'linear-gradient(135deg, #4f46e5 0%, #6366f1 100%)',
            color: 'white',
            mb: 2,
            boxShadow: '0 8px 24px -4px rgba(79, 70, 229, 0.4)'
          }}>
            <HourglassTopIcon sx={{ fontSize: 34 }} />
          </Box>
          <Typography variant="h3" sx={{ 
            fontWeight: 800, 
            mb: 1.5, 
            fontSize: { xs: '1.8rem', md: '2.5rem' },
            background: 'linear-gradient(135deg, #4f46e5 0%, #818cf8 100%)', 
            WebkitBackgroundClip: 'text', 
            WebkitTextFillColor: 'transparent' 
          }}>
            วิเคราะห์ความล่าช้า
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ maxWidth: '600px', mx: 'auto' }}>
            เปรียบเทียบข้อมูล D506 และ EPI-Net เพื่อหาความล่าช้าในการส่งข้อมูลและจัดทำรายงาน Excel
          </Typography>
        </Box>
      </Fade>

      <Fade in={true} timeout={800}>
        <Card elevation={0} sx={{ borderRadius: 4, overflow: 'hidden' }}>
          <CardContent sx={{ p: { xs: 3, md: 5 } }}>
            <form onSubmit={handleSubmit}>
              <Grid container spacing={3}>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <FileUploadDropzone 
                    file={d506File} 
                    setFile={setD506File} 
                    accept=".json"
                    label="ไฟล์ D506 (.json)"
                    helperText="ลากไฟล์มาวาง หรือคลิกเพื่อเลือก"
                  />
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <FileUploadDropzone 
                    file={eFormFile} 
                    setFile={setEformFile} 
                    accept=".json"
                    label="ไฟล์ EPI-Net (.json)"
                    helperText="ลากไฟล์มาวาง หรือคลิกเพื่อเลือก"
                  />
                </Grid>
              </Grid>
              <Button 
                type="submit" 
                variant="contained" 
                fullWidth 
                size="large" 
                startIcon={<PlayArrowIcon />}
                disabled={loading || !d506File || !eFormFile}
                sx={{ 
                  py: 1.8, 
                  background: 'linear-gradient(135deg, #4f46e5 0%, #6366f1 100%)',
                  boxShadow: '0 8px 16px -4px rgba(79, 70, 229, 0.3)',
                  color: 'white',
                  borderRadius: 3,
                  fontWeight: 700
                }}
              >
                {loading ? <CircularProgress size={26} color="inherit" /> : 'เริ่มการวิเคราะห์'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </Fade>
    </Container>
  );
}
