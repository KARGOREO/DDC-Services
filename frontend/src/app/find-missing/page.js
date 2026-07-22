"use client";
import React, { useState } from 'react';
import { Box, Typography, Button, Container, CircularProgress, Card, CardContent, Fade, useTheme, Grid } from '@mui/material';
import axios from 'axios';
import Swal from 'sweetalert2';
import FileUploadDropzone from '@/components/FileUploadDropzone';

export default function FindMissingPage() {
  const [d506File, setD506File] = useState(null);
  const [e506File, setE506File] = useState(null);
  const [loading, setLoading] = useState(false);
  const theme = useTheme();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!d506File || !e506File) return Swal.fire('แจ้งเตือน', 'กรุณาอัปโหลดไฟล์ให้ครบทั้ง 2 ไฟล์', 'warning');

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
               <small>${response.data.outputPath}</small>`,
        icon: 'success'
      });
    } catch (error) {
      Swal.fire('ผิดพลาด', 'เกิดข้อผิดพลาดในการประมวลผล', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container maxWidth="md" sx={{ mt: { xs: 4, md: 8 } }}>
      <Fade in={true} timeout={500}>
        <Box sx={{ mb: 4, textAlign: 'center' }}>
          <Typography variant="h3" sx={{ fontWeight: 800, mb: 2, background: 'linear-gradient(135deg, #10b981 0%, #34d399 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            ข้อมูลตกหล่น
          </Typography>
          <Typography variant="h6" color="text.secondary">
            ค้นหาข้อมูลที่มีใน D506 แต่ไม่มีใน E506 เพื่อจัดการต่อได้ง่ายขึ้น
          </Typography>
        </Box>
      </Fade>

      <Fade in={true} timeout={800}>
        <Card elevation={0} sx={{ border: `1px solid ${theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'}`, borderRadius: 4, overflow: 'hidden' }}>
          <CardContent sx={{ p: { xs: 3, md: 6 } }}>
            <form onSubmit={handleSubmit}>
              <Grid container spacing={3}>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <FileUploadDropzone 
                    file={d506File} 
                    setFile={setD506File} 
                    accept=".json"
                    label="ไฟล์ D506 (.json)"
                    helperText="ลากไฟล์มาวาง หรือคลิก"
                  />
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <FileUploadDropzone 
                    file={e506File} 
                    setFile={setE506File} 
                    accept=".json"
                    label="ไฟล์ E506 (.json)"
                    helperText="ลากไฟล์มาวาง หรือคลิก"
                  />
                </Grid>
              </Grid>
              <Button 
                type="submit" 
                variant="contained" 
                fullWidth 
                size="large" 
                disabled={loading || !d506File || !e506File}
                sx={{ 
                  py: 2, 
                  background: 'linear-gradient(135deg, #10b981 0%, #34d399 100%)',
                  boxShadow: '0 8px 16px -4px rgba(16, 185, 129, 0.3)',
                  color: 'white'
                }}
              >
                {loading ? <CircularProgress size={28} color="inherit" /> : 'ค้นหาข้อมูลตกหล่น'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </Fade>
    </Container>
  );
}
