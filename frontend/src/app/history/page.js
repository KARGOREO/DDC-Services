"use client";
import React, { useState, useEffect } from 'react';
import { Box, Typography, Container, Card, CardContent, Fade, useTheme, List, ListItem, ListItemIcon, ListItemText, Divider, Chip } from '@mui/material';
import axios from 'axios';
import Swal from 'sweetalert2';

export default function HistoryPage() {
  const [history, setHistory] = useState([]);
  const theme = useTheme();

  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    try {
      const res = await axios.get('http://localhost:3000/api/files/history');
      if (res.data.success) {
        setHistory(res.data.history);
      }
    } catch (error) {
      Swal.fire('เกิดข้อผิดพลาด', 'ไม่สามารถดึงข้อมูลประวัติไฟล์ได้', 'error');
    }
  };

  const getIcon = (type) => {
    if (type === 'excel') {
      return (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
          <polyline points="14 2 14 8 20 8"></polyline>
          <line x1="8" y1="13" x2="16" y2="13"></line>
          <line x1="8" y1="17" x2="16" y2="17"></line>
          <polyline points="10 9 9 9 8 9"></polyline>
        </svg>
      );
    }
    return (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#f43f5e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
        <polyline points="14 2 14 8 20 8"></polyline>
        <path d="M9 15l2 2 4-4"></path>
      </svg>
    );
  };

  return (
    <Container maxWidth="md" sx={{ mt: { xs: 4, md: 8 }, pb: 8 }}>
      <Fade in={true} timeout={500}>
        <Box sx={{ mb: 4, textAlign: 'center' }}>
          <Typography variant="h3" sx={{ fontWeight: 800, mb: 2, background: 'linear-gradient(135deg, #6366f1 0%, #a855f7 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            ประวัติการนำเข้าไฟล์
          </Typography>
          <Typography variant="h6" color="text.secondary">
            ดูไฟล์ที่ถูกอัปโหลดและสร้างขึ้นในระบบ แบ่งตามวันที่
          </Typography>
        </Box>
      </Fade>

      {history.length === 0 ? (
        <Fade in={true} timeout={800}>
          <Box textAlign="center" py={10}>
            <Typography variant="h6" color="text.secondary">ไม่มีประวัติไฟล์ในระบบ</Typography>
          </Box>
        </Fade>
      ) : (
        history.map((group, index) => (
          <Fade in={true} timeout={600 + (index * 200)} key={group.date}>
            <Box sx={{ mb: 4 }}>
              <Typography variant="h5" sx={{ fontWeight: 700, mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                <Chip label={group.date} color="primary" sx={{ fontWeight: 600, fontSize: '1rem', py: 2, borderRadius: 2 }} />
                <Typography variant="body1" color="text.secondary">
                  ({group.files.length} ไฟล์)
                </Typography>
              </Typography>
              
              <Card elevation={0} sx={{ border: `1px solid ${theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'}`, borderRadius: 3, overflow: 'hidden' }}>
                <List sx={{ p: 0 }}>
                  {group.files.map((file, i) => (
                    <React.Fragment key={i}>
                      <ListItem sx={{ py: 2, px: 3, transition: 'all 0.2s', '&:hover': { bgcolor: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)' } }}>
                        <ListItemIcon sx={{ minWidth: 48 }}>
                          <Box sx={{ p: 1, bgcolor: file.type === 'excel' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(244, 63, 94, 0.1)', borderRadius: 2, display: 'flex' }}>
                            {getIcon(file.type)}
                          </Box>
                        </ListItemIcon>
                        <ListItemText 
                          primary={
                            <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>{file.name}</Typography>
                          }
                          secondary={
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mt: 0.5 }}>
                              <Typography variant="body2" color="text.secondary">
                                ขนาด: {file.size}
                              </Typography>
                              <Chip 
                                size="small" 
                                label={file.folder} 
                                sx={{ 
                                  height: 20, fontSize: '0.7rem', 
                                  bgcolor: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'
                                }} 
                              />
                            </Box>
                          }
                        />
                        <Typography variant="body2" color="text.secondary">
                          {new Date(file.createdAt).toLocaleTimeString('th-TH')}
                        </Typography>
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
