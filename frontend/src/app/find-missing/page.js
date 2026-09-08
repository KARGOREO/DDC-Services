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
import SearchOffIcon from '@mui/icons-material/SearchOff';
import FindInPageIcon from '@mui/icons-material/FindInPage';

export default function FindMissingPage() {
  const [d506File, setD506File] = useState(null);
  const [e506File, setE506File] = useState(null);
  const [loading, setLoading] = useState(false);
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!d506File || !e506File) {
      return Swal.fire('แจ้งเตือน', 'กรุณาอัปโหลดไฟล์ให้ครบทั้ง 2 ไฟล์', 'warning');
    }

    setLoading(true);
    const formData = new FormData();
    formData.append('d506File', d506File);
    formData.append('e506File', e506File);

    try {
      const response = await axios.post(`http://localhost:3000/api/report/find-missing`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      Swal.fire({
        title: 'สำเร็จ!',
        html: `พบข้อมูลตกหล่น: <strong>${response.data.missingCount}</strong> รายการ<br/><br/>
               บันทึกไฟล์ Excel ไว้ในระบบเรียบร้อย:<br/>
               <small style="word-break: break-all;">${response.data.outputPath}</small>`,
        icon: 'success'
      });
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
            background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
            color: 'white',
            mb: 2,
            boxShadow: '0 8px 24px -4px rgba(16, 185, 129, 0.4)'
          }}>
            <SearchOffIcon sx={{ fontSize: 34 }} />
          </Box>
          <Typography variant="h3" sx={{ 
            fontWeight: 800, 
            mb: 1.5, 
            fontSize: { xs: '1.8rem', md: '2.5rem' },
            background: 'linear-gradient(135deg, #10b981 0%, #34d399 100%)', 
            WebkitBackgroundClip: 'text', 
            WebkitTextFillColor: 'transparent' 
          }}>
            ค้นหาข้อมูลตกหล่น
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ maxWidth: '600px', mx: 'auto' }}>
            ค้นหาข้อมูลที่มีอยู่ในระบบ D506 แต่ไม่มีใน E506 เพื่อจัดการและติดตามผลต่อได้สะดวก
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
                    file={e506File} 
                    setFile={setE506File} 
                    accept=".json"
                    label="ไฟล์ E506 (.json)"
                    helperText="ลากไฟล์มาวาง หรือคลิกเพื่อเลือก"
                  />
                </Grid>
              </Grid>
              <Button 
                type="submit" 
                variant="contained" 
                fullWidth 
                size="large" 
                startIcon={<FindInPageIcon />}
                disabled={loading || !d506File || !e506File}
                sx={{ 
                  py: 1.8, 
                  background: 'linear-gradient(135deg, #10b981 0%, #34d399 100%)',
                  boxShadow: '0 8px 16px -4px rgba(16, 185, 129, 0.3)',
                  color: 'white',
                  borderRadius: 3,
                  fontWeight: 700
                }}
              >
                {loading ? <CircularProgress size={26} color="inherit" /> : 'ค้นหาข้อมูลตกหล่น'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </Fade>
    </Container>
  );
}
