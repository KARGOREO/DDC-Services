"use client";
import React, { useState } from 'react';
import { Box, Typography, Button, Container, CircularProgress, Card, CardContent, Fade, useTheme, Grid } from '@mui/material';
import axios from 'axios';
import Swal from 'sweetalert2';
import FileUploadDropzone from '@/components/FileUploadDropzone';

export default function AnalyzeDelayPage() {
  const [d506File, setD506File] = useState(null);
  const [eFormFile, setEformFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const theme = useTheme();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!d506File || !eFormFile) return Swal.fire('แจ้งเตือน', 'กรุณาอัปโหลดไฟล์ให้ครบทั้ง 2 ไฟล์', 'warning');

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
    <Container maxWidth="md" sx={{ mt: { xs: 4, md: 8 } }}>
      <Fade in={true} timeout={500}>
        <Box sx={{ mb: 4, textAlign: 'center' }}>
          <Typography variant="h3" sx={{ fontWeight: 800, mb: 2, background: 'linear-gradient(135deg, #4f46e5 0%, #6366f1 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            วิเคราะห์ความล่าช้า
          </Typography>
          <Typography variant="h6" color="text.secondary">
            เปรียบเทียบข้อมูล D506 และ EPI-Net เพื่อหาความล่าช้าในการส่งข้อมูล
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
                    file={eFormFile} 
                    setFile={setEformFile} 
                    accept=".json"
                    label="ไฟล์ EPI-Net (.json)"
                    helperText="ลากไฟล์มาวาง หรือคลิก"
                  />
                </Grid>
              </Grid>
              <Button 
                type="submit" 
                variant="contained" 
                fullWidth 
                size="large" 
                disabled={loading || !d506File || !eFormFile}
                sx={{ 
                  py: 2, 
                  background: 'linear-gradient(135deg, #4f46e5 0%, #6366f1 100%)',
                  boxShadow: '0 8px 16px -4px rgba(79, 70, 229, 0.3)',
                  color: 'white'
                }}
              >
                {loading ? <CircularProgress size={28} color="inherit" /> : 'เริ่มการวิเคราะห์'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </Fade>
    </Container>
  );
}
