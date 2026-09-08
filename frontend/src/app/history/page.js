"use client";

import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Container,
  Card,
  Fade,
  useTheme,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Divider,
  Chip,
  Button,
  CircularProgress
} from '@mui/material';
import axios from 'axios';
import Swal from 'sweetalert2';
import Link from 'next/link';

// Exclusively use Material UI icons
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import ManageHistoryIcon from '@mui/icons-material/ManageHistory';
import TableChartIcon from '@mui/icons-material/TableChart';
import CodeIcon from '@mui/icons-material/Code';
import DescriptionIcon from '@mui/icons-material/Description';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import FolderZipIcon from '@mui/icons-material/FolderZip';

export default function HistoryPage() {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';

  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    try {
      setLoading(true);
      const res = await axios.get('http://localhost:3000/api/files/history');
      if (res.data.success) {
        setHistory(res.data.history);
      }
    } catch (error) {
      Swal.fire('เกิดข้อผิดพลาด', 'ไม่สามารถดึงข้อมูลประวัติไฟล์ได้', 'error');
    } finally {
      setLoading(false);
    }
  };

  const getFileIcon = (type) => {
    if (type === 'excel') {
      return <TableChartIcon sx={{ color: isDark ? '#34d399' : '#059669', fontSize: 24 }} />;
    }
    if (type === 'sql') {
      return <CodeIcon sx={{ color: isDark ? '#fb7185' : '#e11d48', fontSize: 24 }} />;
    }
    return <DescriptionIcon sx={{ color: isDark ? '#818cf8' : '#4f46e5', fontSize: 24 }} />;
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
            background: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)',
            color: 'white',
            mb: 2,
            boxShadow: '0 8px 24px -4px rgba(139, 92, 246, 0.4)'
          }}>
            <ManageHistoryIcon sx={{ fontSize: 34 }} />
          </Box>
          <Typography variant="h3" sx={{ 
            fontWeight: 800, 
            mb: 1.5, 
            fontSize: { xs: '1.8rem', md: '2.5rem' },
            background: 'linear-gradient(135deg, #8b5cf6 0%, #a855f7 100%)', 
            WebkitBackgroundClip: 'text', 
            WebkitTextFillColor: 'transparent' 
          }}>
            ประวัติการนำเข้าและประมวลผลไฟล์
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ maxWidth: '600px', mx: 'auto' }}>
            รายการไฟล์ที่ถูกอัปโหลดและสร้างขึ้นในระบบ แบ่งกลุ่มตามวันที่บันทึก
          </Typography>
        </Box>
      </Fade>

      {loading ? (
        <Box sx={{ textAlign: 'center', py: 8 }}>
          <CircularProgress color="primary" />
        </Box>
      ) : history.length === 0 ? (
        <Fade in={true} timeout={800}>
          <Box sx={{ 
            textAlign: 'center', 
            py: 8, 
            bgcolor: isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)',
            borderRadius: 4,
            border: `1px dashed ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'}`
          }}>
            <FolderZipIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 1, opacity: 0.5 }} />
            <Typography variant="h6" color="text.secondary">ยังไม่มีประวัติไฟล์ในระบบ</Typography>
          </Box>
        </Fade>
      ) : (
        history.map((group, index) => (
          <Fade in={true} timeout={600 + (index * 150)} key={group.date}>
            <Box sx={{ mb: 4 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
                <Chip 
                  icon={<CalendarTodayIcon sx={{ fontSize: 16 }} />}
                  label={group.date} 
                  color="primary" 
                  sx={{ fontWeight: 700, fontSize: '0.9rem', py: 2, borderRadius: 2 }} 
                />
                <Typography variant="body2" color="text.secondary">
                  ({group.files.length} ไฟล์)
                </Typography>
              </Box>
              
              <Card elevation={0} sx={{ borderRadius: 3, overflow: 'hidden' }}>
                <List sx={{ p: 0 }}>
                  {group.files.map((file, i) => (
                    <React.Fragment key={i}>
                      <ListItem sx={{ 
                        py: 2, 
                        px: { xs: 2, sm: 3 }, 
                        transition: 'all 0.2s', 
                        '&:hover': { bgcolor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)' } 
                      }}>
                        <ListItemIcon sx={{ minWidth: 48 }}>
                          <Box sx={{ 
                            p: 1.2, 
                            bgcolor: file.type === 'excel' 
                              ? (isDark ? 'rgba(16, 185, 129, 0.15)' : 'rgba(16, 185, 129, 0.1)') 
                              : (isDark ? 'rgba(244, 63, 94, 0.15)' : 'rgba(244, 63, 94, 0.1)'), 
                            borderRadius: 2, 
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                          }}>
                            {getFileIcon(file.type)}
                          </Box>
                        </ListItemIcon>
                        <ListItemText 
                          primary={
                            <Typography variant="subtitle1" sx={{ fontWeight: 600, wordBreak: 'break-word' }}>
                              {file.name}
                            </Typography>
                          }
                          secondary={
                            <Box sx={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 1.5, mt: 0.5 }}>
                              <Typography variant="caption" color="text.secondary">
                                ขนาด: {file.size}
                              </Typography>
                              <Chip 
                                size="small" 
                                label={file.folder} 
                                variant="outlined"
                                sx={{ 
                                  height: 20, 
                                  fontSize: '0.7rem', 
                                  bgcolor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)' 
                                }} 
                              />
                            </Box>
                          }
                        />
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, ml: 1 }}>
                          <Typography variant="caption" color="text.secondary" sx={{ display: { xs: 'none', sm: 'block' } }}>
                            {new Date(file.createdAt).toLocaleTimeString('th-TH')}
                          </Typography>
                          <Button
                            size="small"
                            variant="outlined"
                            component="a"
                            startIcon={<FileDownloadIcon />}
                            href={`http://localhost:3000/api/files/download?folder=${file.folder}&name=${encodeURIComponent(file.name)}`}
                            download={file.name}
                            sx={{ borderRadius: 2, textTransform: 'none' }}
                          >
                            ดาวน์โหลด
                          </Button>
                        </Box>
                      </ListItem>
                      {i < group.files.length - 1 && <Divider />}
                    </React.Fragment>
                  ))}
                </List>
              </Card>
            </Box>
          </Fade>
        ))
      )}
    </Container>
  );
}
