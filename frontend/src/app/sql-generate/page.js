"use client";
import React, { useState, useRef } from 'react';
import { Box, Typography, Button, Container, CircularProgress, Card, CardContent, useTheme, Fade } from '@mui/material';
import axios from 'axios';
import Swal from 'sweetalert2';

export default function SqlGeneratePage() {
  const [excelFile, setExcelFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef(null);
  const theme = useTheme();

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setExcelFile(e.dataTransfer.files[0]);
    }
  };

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
      
      // Parse Content-Disposition to get the exact filename like delete_bma_report_xxx.sql
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
      setExcelFile(null); // Reset after success
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
          <Typography variant="h3" sx={{ fontWeight: 800, mb: 2, background: 'linear-gradient(135deg, #f43f5e 0%, #fb7185 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            สร้างคำสั่ง SQL ลบข้อมูล
          </Typography>
          <Typography variant="h6" color="text.secondary">
            ระบบจะนำไฟล์ไปเก็บที่ <strong style={{ color: theme.palette.mode === 'dark' ? '#fb7185' : '#e11d48' }}>delete-e506-by-sql</strong> และสร้าง Query ให้อัตโนมัติ
          </Typography>
        </Box>
      </Fade>

      <Fade in={true} timeout={800}>
        <Card elevation={0} sx={{ border: `1px solid ${theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'}`, borderRadius: 4, overflow: 'hidden' }}>
          <CardContent sx={{ p: { xs: 3, md: 6 } }}>
            <form onSubmit={handleSubmit}>
              <Box 
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current.click()}
                sx={{ 
                  mb: 4, p: 6,
                  border: `2px dashed ${dragActive ? '#f43f5e' : theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.2)'}`,
                  borderRadius: 4,
                  bgcolor: dragActive ? (theme.palette.mode === 'dark' ? 'rgba(244, 63, 94, 0.1)' : 'rgba(244, 63, 94, 0.05)') : 'transparent',
                  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
              >
                <input 
                  ref={fileInputRef}
                  type="file" 
                  accept=".xlsx, .xls" 
                  onChange={e => setExcelFile(e.target.files[0])} 
                  style={{ display: 'none' }}
                />
                <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke={theme.palette.mode === 'dark' ? '#fb7185' : '#f43f5e'} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginBottom: '16px' }}>
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                  <polyline points="14 2 14 8 20 8"></polyline>
                  <line x1="12" y1="18" x2="12" y2="12"></line>
                  <line x1="9" y1="15" x2="15" y2="15"></line>
                </svg>
                <Typography variant="h6" sx={{ fontWeight: 600, mb: 1 }}>
                  {excelFile ? excelFile.name : 'ลากไฟล์ Excel มาวางที่นี่'}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {excelFile ? `ขนาด: ${(excelFile.size / 1024).toFixed(2)} KB` : 'หรือคลิกเพื่อเลือกไฟล์ .xlsx, .xls'}
                </Typography>
              </Box>
              <Button 
                type="submit" 
                variant="contained" 
                fullWidth 
                size="large" 
                disabled={loading || !excelFile}
                sx={{ 
                  py: 2, 
                  background: 'linear-gradient(135deg, #f43f5e 0%, #fb7185 100%)',
                  boxShadow: '0 8px 16px -4px rgba(244, 63, 94, 0.3)',
                  color: 'white'
                }}
              >
                {loading ? <CircularProgress size={28} color="inherit" /> : 'สร้างและดาวน์โหลด SQL'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </Fade>
    </Container>
  );
}
