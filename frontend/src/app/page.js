"use client";

import React from 'react';
import {
  Box,
  Typography,
  Card,
  CardActionArea,
  Container,
  Grid,
  useTheme,
  Fade,
  Chip,
  Stack
} from '@mui/material';
import Link from 'next/link';

// Use exclusively Material UI icons
import HourglassTopIcon from '@mui/icons-material/HourglassTop';
import VerifiedUserIcon from '@mui/icons-material/VerifiedUser';
import SearchOffIcon from '@mui/icons-material/SearchOff';
import TerminalIcon from '@mui/icons-material/Terminal';
import TableChartIcon from '@mui/icons-material/TableChart';
import ManageHistoryIcon from '@mui/icons-material/ManageHistory';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import ShieldIcon from '@mui/icons-material/Shield';

export default function Dashboard() {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';

  const services = [
    {
      title: 'แปลง JSON เป็น Excel (DDC Report)',
      description: 'แปลงไฟล์ JSON ทุกรูปแบบ พร้อมโหมดราชการ (DDC Report) สรุป Error Cases Log และจัดคอลัมน์อัตโนมัติ',
      route: '/json-to-excel',
      gradient: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
      shadow: 'rgba(2, 132, 199, 0.3)',
      icon: <TableChartIcon sx={{ fontSize: 32 }} />,
      tag: 'ยอดนิยม (Recommended)',
      tagColor: 'primary'
    },
    {
      title: 'วิเคราะห์ความล่าช้า (Delay Analysis)',
      description: 'เปรียบเทียบช่วงเวลาข้อมูล D506 เทียบกับ EPI-Net และออกรายงานสรุปความล่าช้าเป็น Excel',
      route: '/analyze-delay',
      gradient: 'linear-gradient(135deg, #4f46e5 0%, #6366f1 100%)',
      shadow: 'rgba(79, 70, 229, 0.3)',
      icon: <HourglassTopIcon sx={{ fontSize: 32 }} />,
      tag: 'D506 vs EPI-Net',
      tagColor: 'secondary'
    },
    {
      title: 'ตรวจสอบอัตลักษณ์ (Identity Validation)',
      description: 'ตรวจสอบความถูกต้องและความยาวของเลข CID และ Passport ที่เกินเกณฑ์มาตรฐาน',
      route: '/validate-identity',
      gradient: 'linear-gradient(135deg, #0ea5e9 0%, #38bdf8 100%)',
      shadow: 'rgba(14, 165, 233, 0.3)',
      icon: <VerifiedUserIcon sx={{ fontSize: 32 }} />,
      tag: 'CID & Passport',
      tagColor: 'info'
    },
    {
      title: 'ข้อมูลตกหล่น (Missing Records)',
      description: 'ค้นหาและเปรียบเทียบรายการที่มีในระบบ D506 แต่ไม่พบใน E506 เพื่อติดตามเคสผู้ป่วย',
      route: '/find-missing',
      gradient: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
      shadow: 'rgba(16, 185, 129, 0.3)',
      icon: <SearchOffIcon sx={{ fontSize: 32 }} />,
      tag: 'D506 vs E506',
      tagColor: 'success'
    },
    {
      title: 'สร้างคำสั่ง SQL ลบข้อมูล (Delete Generator)',
      description: 'แปลงไฟล์ Excel รหัสเคสเป็นสคริปต์ SQL Delete Query สำหรับจัดการลบข้อมูลซ้ำซ้อนในฐานข้อมูล',
      route: '/sql-generate',
      gradient: 'linear-gradient(135deg, #f43f5e 0%, #e11d48 100%)',
      shadow: 'rgba(244, 63, 94, 0.3)',
      icon: <TerminalIcon sx={{ fontSize: 32 }} />,
      tag: 'SQL Script',
      tagColor: 'error'
    },
    {
      title: 'ประวัติไฟล์ในระบบ (File History)',
      description: 'ตรวจสอบรายการไฟล์ที่อัปโหลดและไฟล์ที่ระบบประมวลผล จัดหมวดหมู่แยกตามวันและเวลา',
      route: '/history',
      gradient: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)',
      shadow: 'rgba(139, 92, 246, 0.3)',
      icon: <ManageHistoryIcon sx={{ fontSize: 32 }} />,
      tag: 'Audit Log',
      tagColor: 'secondary'
    }
  ];

  return (
    <Container maxWidth="lg" sx={{ py: { xs: 4, md: 8 }, pb: 10 }}>
      {/* Hero Header */}
      <Fade in={true} timeout={700}>
        <Box sx={{ textAlign: 'center', mb: { xs: 5, md: 8 } }}>
          <Stack direction="row" spacing={1} justifyContent="center" sx={{ mb: 2 }}>
            <Chip 
              icon={<ShieldIcon sx={{ fontSize: 16 }} />} 
              label="กองระบาดวิทยา กรมควบคุมโรค (DDC)" 
              color="primary" 
              variant="outlined" 
              sx={{ fontWeight: 600, px: 1, py: 2, borderRadius: 3 }}
            />
            <Chip 
              icon={<AutoAwesomeIcon sx={{ fontSize: 16 }} />} 
              label="Central Data Processing Services" 
              sx={{ fontWeight: 600, py: 2, borderRadius: 3, bgcolor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)' }}
            />
          </Stack>

          <Typography 
            variant="h2" 
            component="h1" 
            gutterBottom 
            sx={{ 
              fontWeight: 800, 
              fontSize: { xs: '2.2rem', sm: '3rem', md: '3.6rem' },
              background: isDark 
                ? 'linear-gradient(135deg, #ffffff 0%, #cbd5e1 100%)' 
                : 'linear-gradient(135deg, #0f172a 0%, #334155 100%)',
              WebkitBackgroundClip: 'text', 
              WebkitTextFillColor: 'transparent',
              mb: 2,
              letterSpacing: '-0.03em'
            }}
          >
            ศูนย์บริการข้อมูลและรายงานระบาดวิทยา
          </Typography>

          <Typography 
            variant="h6" 
            sx={{ 
              color: 'text.secondary', 
              fontWeight: 400, 
              maxWidth: '720px', 
              mx: 'auto', 
              lineHeight: 1.6,
              fontSize: { xs: '0.95rem', md: '1.15rem' }
            }}
          >
            แพลตฟอร์มจัดการและแปลงโครงสร้างข้อมูลสารสนเทศ (D506, E506, EPI-Net, Error Logs) พร้อมระบบแปลง Excel รูปแบบราชการที่อ่านง่ายและแม่นยำ
          </Typography>
        </Box>
      </Fade>

      {/* Service Cards Grid */}
      <Grid container spacing={3.5}>
        {services.map((service, index) => (
          <Grid size={{ xs: 12, sm: 6, lg: 4 }} key={index}>
            <Fade in={true} timeout={600 + (index * 150)}>
              <Card 
                sx={{ 
                  height: '100%', 
                  display: 'flex', 
                  flexDirection: 'column',
                  position: 'relative',
                  overflow: 'hidden',
                  borderRadius: 4,
                  '&:hover': {
                    transform: 'translateY(-4px)',
                    borderColor: 'primary.main',
                    boxShadow: `0 16px 32px -10px ${service.shadow}`
                  }
                }}
              >
                <CardActionArea 
                  component={Link}
                  href={service.route}
                  sx={{ 
                    flexGrow: 1, 
                    p: 3.5, 
                    display: 'flex', 
                    flexDirection: 'column', 
                    alignItems: 'flex-start',
                    justifyContent: 'space-between',
                    height: '100%'
                  }}
                >
                  <Box sx={{ width: '100%' }}>
                    {/* Header with Icon and Tag */}
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', mb: 2.5 }}>
                      <Box 
                        sx={{ 
                          width: 58, 
                          height: 58, 
                          borderRadius: '16px', 
                          background: service.gradient, 
                          display: 'flex', 
                          alignItems: 'center', 
                          justifyContent: 'center', 
                          color: 'white',
                          boxShadow: `0 8px 20px -4px ${service.shadow}`,
                          transition: 'transform 0.3s ease',
                          '&:hover': { transform: 'scale(1.05)' }
                        }}
                      >
                        {service.icon}
                      </Box>
                      {service.tag && (
                        <Chip 
                          label={service.tag} 
                          color={service.tagColor || 'default'} 
                          size="small" 
                          variant="outlined"
                          sx={{ fontSize: '0.72rem', height: 24, fontWeight: 700 }}
                        />
                      )}
                    </Box>

                    {/* Title */}
                    <Typography variant="h6" component="h2" gutterBottom sx={{ fontWeight: 700, lineHeight: 1.3 }}>
                      {service.title}
                    </Typography>

                    {/* Description */}
                    <Typography variant="body2" sx={{ color: 'text.secondary', lineHeight: 1.6, mb: 3 }}>
                      {service.description}
                    </Typography>
                  </Box>

                  {/* Footer Action Link */}
                  <Box sx={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: 0.8, 
                    color: 'primary.main', 
                    fontWeight: 700, 
                    fontSize: '0.875rem' 
                  }}>
                    <span>เปิดใช้งานเครื่องมือ</span>
                    <ArrowForwardIcon sx={{ fontSize: 16 }} />
                  </Box>
                </CardActionArea>
              </Card>
            </Fade>
          </Grid>
        ))}
      </Grid>
    </Container>
  );
}
