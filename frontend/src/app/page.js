"use client";

import React from 'react';
import { Box, Typography, Card, CardActionArea, Container, Grid, useTheme, Fade } from '@mui/material';
import Link from 'next/link';

// Custom icons using basic SVGs for a highly polished look
const ModernIcons = [
  <svg key="1" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>,
  <svg key="2" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path><path d="m9 12 2 2 4-4"></path></svg>,
  <svg key="3" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line><line x1="11" y1="8" x2="11" y2="14"></line><line x1="8" y1="11" x2="14" y2="11"></line></svg>,
  <svg key="4" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><ellipse cx="12" cy="5" rx="9" ry="3"></ellipse><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"></path><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"></path></svg>
];

export default function Dashboard() {
  const theme = useTheme();

  const actions = [
    {
      title: 'วิเคราะห์ความล่าช้า',
      description: 'วิเคราะห์เวลา D506 เทียบกับ EPI-Net พร้อมส่งออกเป็น Excel อัตโนมัติ',
      route: '/analyze-delay',
      gradient: 'linear-gradient(135deg, #4f46e5 0%, #6366f1 100%)',
      shadow: 'rgba(79, 70, 229, 0.25)',
      icon: ModernIcons[0]
    },
    {
      title: 'ตรวจสอบอัตลักษณ์',
      description: 'ตรวจสอบความยาว CID และ Passport ที่เกินกำหนด',
      route: '/validate-identity',
      gradient: 'linear-gradient(135deg, #0ea5e9 0%, #38bdf8 100%)',
      shadow: 'rgba(14, 165, 233, 0.25)',
      icon: ModernIcons[1]
    },
    {
      title: 'ข้อมูลตกหล่น',
      description: 'ค้นหาข้อมูลที่มีใน D506 แต่ไม่มีใน E506 เพื่อจัดการต่อได้ง่ายขึ้น',
      route: '/find-missing',
      gradient: 'linear-gradient(135deg, #10b981 0%, #34d399 100%)',
      shadow: 'rgba(16, 185, 129, 0.25)',
      icon: ModernIcons[2]
    },
    {
      title: 'สร้างคำสั่ง SQL',
      description: 'แปลงไฟล์ Excel เป็นสคริปต์ SQL ลบข้อมูล (Delete Query) พร้อมใช้งาน',
      route: '/sql-generate',
      gradient: 'linear-gradient(135deg, #f43f5e 0%, #fb7185 100%)',
      shadow: 'rgba(244, 63, 94, 0.25)',
      icon: ModernIcons[3]
    },
    {
      title: 'ประวัติไฟล์ในระบบ',
      description: 'ตรวจสอบรายชื่อไฟล์ทั้งหมดที่ถูกอัปโหลด แบ่งกลุ่มตามวันที่',
      route: '/history',
      gradient: 'linear-gradient(135deg, #8b5cf6 0%, #a855f7 100%)',
      shadow: 'rgba(139, 92, 246, 0.25)',
      icon: <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
    }
  ];

  return (
    <Container maxWidth="lg" sx={{ py: { xs: 6, md: 12 } }}>
      <Fade in={true} timeout={800}>
        <Box sx={{ textAlign: 'center', mb: 10 }}>
          <Typography 
            variant="h2" 
            component="h1" 
            gutterBottom 
            sx={{ 
              fontWeight: 800, 
              background: 'linear-gradient(135deg, #0f172a 0%, #334155 100%)',
              ...(theme.palette.mode === 'dark' && {
                background: 'linear-gradient(135deg, #f8fafc 0%, #cbd5e1 100%)',
              }),
              WebkitBackgroundClip: 'text', 
              WebkitTextFillColor: 'transparent',
              mb: 2
            }}
          >
            Central Processing Unit
          </Typography>
          <Typography variant="h6" sx={{ color: 'text.secondary', fontWeight: 400, maxWidth: '650px', mx: 'auto', lineHeight: 1.6 }}>
            แพลตฟอร์มวิเคราะห์ข้อมูลและสร้างรายงานอัจฉริยะ (D506, E506) ด้วยระบบจัดการไฟล์อัตโนมัติ
          </Typography>
        </Box>
      </Fade>

      <Grid container spacing={4}>
        {actions.map((action, index) => (
          <Grid size={{ xs: 12, sm: 6 }} key={index}>
            <Fade in={true} timeout={800 + (index * 200)}>
              <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                <CardActionArea 
                  component={Link}
                  href={action.route}
                  sx={{ 
                    flexGrow: 1, 
                    p: 4, 
                    display: 'flex', 
                    flexDirection: 'column', 
                    alignItems: 'flex-start',
                    '&:hover .icon-box': {
                      transform: 'scale(1.05) rotate(3deg)',
                      boxShadow: `0 12px 24px -8px ${action.shadow}`
                    }
                  }}
                >
                  <Box 
                    className="icon-box"
                    sx={{ 
                      width: 56, 
                      height: 56, 
                      borderRadius: '16px', 
                      background: action.gradient, 
                      mb: 3, 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'center', 
                      color: 'white',
                      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                      boxShadow: `0 4px 12px -2px ${action.shadow}`
                    }}
                  >
                    {action.icon}
                  </Box>
                  <Typography variant="h5" component="h2" gutterBottom sx={{ fontWeight: 700 }}>
                    {action.title}
                  </Typography>
                  <Typography variant="body1" sx={{ color: 'text.secondary', lineHeight: 1.6 }}>
                    {action.description}
                  </Typography>
                </CardActionArea>
              </Card>
            </Fade>
          </Grid>
        ))}
      </Grid>
    </Container>
  );
}
