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
import VerifiedUserIcon from '@mui/icons-material/VerifiedUser';
import FactCheckIcon from '@mui/icons-material/FactCheck';

export default function ValidateIdentityPage() {
  const [dataFile, setDataFile] = useState(null);
  const [schemaFile, setSchemaFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!dataFile || !schemaFile) {
      return Swal.fire('แจ้งเตือน', 'กรุณาอัปโหลดไฟล์ให้ครบทั้ง 2 ไฟล์', 'warning');
    }

    setLoading(true);
    const formData = new FormData();
    formData.append('dataFile', dataFile);
    formData.append('schemaFile', schemaFile);

    try {
      const response = await axios.post(`http://localhost:3000/api/report/validate-identity`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        responseType: 'blob'
      });

      if (response.headers['content-type'] && response.headers['content-type'].includes('application/json')) {
        const text = await response.data.text();
        const data = JSON.parse(text);
        if (!data.hasErrors) {
          Swal.fire('ผ่านเกณฑ์!', 'ข้อมูลทั้งหมดถูกต้องตามโครงสร้างที่กำหนด (ไม่พบปัญหา CID หรือ Passport)', 'success');
        }
      } else {
        const url = window.URL.createObjectURL(new Blob([response.data]));
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', 'Validation_Error_Report.xlsx');
        document.body.appendChild(link);
        link.click();
        link.remove();
        Swal.fire('พบข้อผิดพลาด', 'มีข้อมูลที่ไม่ตรงตามเงื่อนไข (ดาวน์โหลดรายงาน Error แล้ว)', 'warning');
      }
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
            background: 'linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%)',
            color: 'white',
            mb: 2,
            boxShadow: '0 8px 24px -4px rgba(14, 165, 233, 0.4)'
          }}>
            <VerifiedUserIcon sx={{ fontSize: 34 }} />
          </Box>
          <Typography variant="h3" sx={{ 
            fontWeight: 800, 
            mb: 1.5, 
            fontSize: { xs: '1.8rem', md: '2.5rem' },
            background: 'linear-gradient(135deg, #0ea5e9 0%, #38bdf8 100%)', 
            WebkitBackgroundClip: 'text', 
            WebkitTextFillColor: 'transparent' 
          }}>
            ตรวจสอบอัตลักษณ์ (CID & Passport)
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ maxWidth: '600px', mx: 'auto' }}>
            ตรวจสอบความถูกต้องและความยาวของเลข CID และ Passport ว่าถูกต้องตามเกณฑ์มาตรฐานหรือไม่
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
                    file={dataFile} 
                    setFile={setDataFile} 
                    accept=".json"
                    label="ไฟล์ข้อมูล (Data .json)"
                    helperText="ลากไฟล์มาวาง หรือคลิกเพื่อเลือก"
                  />
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <FileUploadDropzone 
                    file={schemaFile} 
                    setFile={setSchemaFile} 
                    accept=".json"
                    label="ไฟล์โครงสร้าง (Schema .json)"
                    helperText="ลากไฟล์มาวาง หรือคลิกเพื่อเลือก"
                  />
                </Grid>
              </Grid>
              <Button 
                type="submit" 
                variant="contained" 
                fullWidth 
                size="large" 
                startIcon={<FactCheckIcon />}
                disabled={loading || !dataFile || !schemaFile}
                sx={{ 
                  py: 1.8, 
                  background: 'linear-gradient(135deg, #0ea5e9 0%, #38bdf8 100%)',
                  boxShadow: '0 8px 16px -4px rgba(14, 165, 233, 0.3)',
                  color: 'white',
                  borderRadius: 3,
                  fontWeight: 700
                }}
              >
                {loading ? <CircularProgress size={26} color="inherit" /> : 'เริ่มการตรวจสอบ'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </Fade>
    </Container>
  );
}
