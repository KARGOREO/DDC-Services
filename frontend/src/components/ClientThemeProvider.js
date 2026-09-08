"use client";

import React, { useState, useMemo, useEffect } from 'react';
import {
  ThemeProvider,
  createTheme,
  CssBaseline,
  Box,
  AppBar,
  Toolbar,
  Typography,
  IconButton,
  Button,
  Tooltip,
  Container,
  Chip,
  useMediaQuery
} from '@mui/material';
import Link from 'next/link';
import { Outfit } from 'next/font/google';

// Exclusively use Material UI icons
import DarkModeIcon from '@mui/icons-material/DarkMode';
import LightModeIcon from '@mui/icons-material/LightMode';
import ApiIcon from '@mui/icons-material/Api';
import TableChartIcon from '@mui/icons-material/TableChart';
import ManageHistoryIcon from '@mui/icons-material/ManageHistory';
import HealthAndSafetyIcon from '@mui/icons-material/HealthAndSafety';
import HomeIcon from '@mui/icons-material/Home';

const outfit = Outfit({ subsets: ['latin'], display: 'swap' });

export default function ClientThemeProvider({ children }) {
  const [mode, setMode] = useState('light');
  const prefersDarkMode = useMediaQuery('(prefers-color-scheme: dark)');

  useEffect(() => {
    const savedMode = localStorage.getItem('themeMode');
    if (savedMode) {
      setMode(savedMode);
    } else if (prefersDarkMode) {
      setMode('dark');
    }
  }, [prefersDarkMode]);

  const toggleMode = () => {
    const newMode = mode === 'light' ? 'dark' : 'light';
    setMode(newMode);
    localStorage.setItem('themeMode', newMode);
  };

  const theme = useMemo(() => createTheme({
    palette: {
      mode,
      primary: {
        main: '#4f46e5',
        light: '#818cf8',
        dark: '#3730a3',
      },
      secondary: {
        main: '#10b981',
        light: '#34d399',
        dark: '#059669',
      },
      info: {
        main: '#0284c7',
        light: '#38bdf8',
        dark: '#0369a1',
      },
      background: {
        default: mode === 'light' ? '#f8fafc' : '#0b0f19',
        paper: mode === 'light' ? '#ffffff' : '#111827',
      },
      text: {
        primary: mode === 'light' ? '#0f172a' : '#f9fafb',
        secondary: mode === 'light' ? '#475569' : '#9ca3af',
      }
    },
    typography: {
      fontFamily: outfit.style.fontFamily,
      h1: { fontWeight: 800, letterSpacing: '-0.025em' },
      h2: { fontWeight: 700, letterSpacing: '-0.025em' },
      h3: { fontWeight: 700, letterSpacing: '-0.02em' },
      h4: { fontWeight: 700 },
      h5: { fontWeight: 600 },
      h6: { fontWeight: 600 },
      button: { textTransform: 'none', fontWeight: 600 }
    },
    shape: {
      borderRadius: 16,
    },
    components: {
      MuiCard: {
        styleOverrides: {
          root: {
            backgroundImage: 'none',
            backdropFilter: 'blur(16px)',
            backgroundColor: mode === 'light' ? 'rgba(255, 255, 255, 0.85)' : 'rgba(17, 24, 39, 0.75)',
            boxShadow: mode === 'light' 
              ? '0 10px 30px -10px rgba(0,0,0,0.06), 0 1px 3px rgba(0,0,0,0.03)'
              : '0 10px 30px -10px rgba(0,0,0,0.4), 0 1px 3px rgba(0,0,0,0.2)',
            border: `1px solid ${mode === 'light' ? 'rgba(226, 232, 240, 0.8)' : 'rgba(255,255,255,0.07)'}`,
            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          }
        }
      },
      MuiButton: {
        styleOverrides: {
          root: {
            borderRadius: 12,
            padding: '8px 20px',
            boxShadow: 'none',
            '&:hover': {
              boxShadow: '0 8px 16px -4px rgba(79, 70, 229, 0.2)',
              transform: 'translateY(-1px)'
            },
            transition: 'all 0.2s ease-in-out'
          }
        }
      },
      MuiCssBaseline: {
        styleOverrides: {
          html: {
            overflowX: 'hidden',
            overflowY: 'auto',
          },
          body: {
            overflowX: 'hidden',
            overflowY: 'visible',
            minHeight: '100vh',
          }
        }
      },
      MuiChip: {
        styleOverrides: {
          root: {
            fontWeight: 600,
            borderRadius: 8
          }
        }
      }
    }
  }), [mode]);

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Box sx={{ 
        minHeight: '100vh', 
        display: 'flex', 
        flexDirection: 'column',
        background: mode === 'light' 
          ? 'radial-gradient(at 0% 0%, rgba(241, 245, 249, 1) 0, transparent 50%), radial-gradient(at 100% 100%, rgba(238, 242, 255, 1) 0, transparent 50%), #f8fafc'
          : 'radial-gradient(at 0% 0%, rgba(15, 23, 42, 1) 0, transparent 50%), radial-gradient(at 100% 100%, rgba(17, 24, 39, 1) 0, transparent 50%), #0b0f19',
        position: 'relative',
        overflowX: 'hidden'
      }}>
        {/* Subtle decorative glow blobs */}
        <Box sx={{
          position: 'absolute', top: '-10%', left: '-5%', width: '45vw', height: '45vw',
          borderRadius: '50%',
          background: mode === 'light' ? 'radial-gradient(circle, rgba(79,70,229,0.08) 0%, transparent 70%)' : 'radial-gradient(circle, rgba(79,70,229,0.15) 0%, transparent 70%)',
          zIndex: 0, pointerEvents: 'none'
        }} />
        <Box sx={{
          position: 'absolute', bottom: '-10%', right: '-5%', width: '40vw', height: '40vw',
          borderRadius: '50%',
          background: mode === 'light' ? 'radial-gradient(circle, rgba(16,185,129,0.06) 0%, transparent 70%)' : 'radial-gradient(circle, rgba(16,185,129,0.12) 0%, transparent 70%)',
          zIndex: 0, pointerEvents: 'none'
        }} />

        {/* Material Glassmorphism AppBar */}
        <AppBar position="sticky" elevation={0} sx={{ 
          background: mode === 'light' ? 'rgba(255, 255, 255, 0.8)' : 'rgba(11, 15, 25, 0.8)',
          backdropFilter: 'blur(20px)',
          borderBottom: `1px solid ${mode === 'light' ? 'rgba(226, 232, 240, 0.8)' : 'rgba(255,255,255,0.06)'}`,
          zIndex: 1100
        }}>
          <Container maxWidth="xl">
            <Toolbar disableGutters sx={{ justifyContent: 'space-between', minHeight: 70 }}>
              {/* Brand Logo & Title */}
              <Box 
                component={Link} 
                href="/" 
                sx={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: 1.5,
                  textDecoration: 'none',
                  color: 'inherit'
                }}
              >
                <Box sx={{ 
                  width: 40, 
                  height: 40, 
                  borderRadius: '12px', 
                  background: 'linear-gradient(135deg, #4f46e5 0%, #3b82f6 100%)',
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center', 
                  color: 'white',
                  boxShadow: '0 4px 12px rgba(79, 70, 229, 0.3)'
                }}>
                  <HealthAndSafetyIcon sx={{ fontSize: 24 }} />
                </Box>
                <Box>
                  <Typography variant="h6" sx={{ 
                    fontWeight: 800, 
                    lineHeight: 1.1,
                    background: 'linear-gradient(90deg, #4f46e5, #0284c7)', 
                    WebkitBackgroundClip: 'text', 
                    WebkitTextFillColor: 'transparent' 
                  }}>
                    DDC Platform
                  </Typography>
                  <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 500 }}>
                    กองระบาดวิทยา กรมควบคุมโรค
                  </Typography>
                </Box>
              </Box>

              {/* Navigation Actions */}
              <Box sx={{ display: 'flex', alignItems: 'center', gap: { xs: 1, sm: 1.5 } }}>
                <Button 
                  component={Link}
                  href="/"
                  startIcon={<HomeIcon />}
                  sx={{ 
                    color: 'text.secondary',
                    display: { xs: 'none', md: 'inline-flex' },
                    '&:hover': { color: 'primary.main', bgcolor: 'transparent' }
                  }}
                >
                  หน้าหลัก
                </Button>

                <Button 
                  component={Link}
                  href="/json-to-excel"
                  startIcon={<TableChartIcon />}
                  sx={{ 
                    color: 'text.secondary',
                    display: { xs: 'none', md: 'inline-flex' },
                    '&:hover': { color: 'primary.main', bgcolor: 'transparent' }
                  }}
                >
                  JSON to Excel
                </Button>

                <Button 
                  component={Link}
                  href="/history"
                  startIcon={<ManageHistoryIcon />}
                  sx={{ 
                    color: 'text.secondary',
                    display: { xs: 'none', md: 'inline-flex' },
                    '&:hover': { color: 'primary.main', bgcolor: 'transparent' }
                  }}
                >
                  ประวัติไฟล์
                </Button>

                <Button 
                  variant="outlined" 
                  color="inherit" 
                  startIcon={<ApiIcon />} 
                  onClick={() => window.open('http://localhost:3000/api-docs', '_blank')}
                  sx={{ 
                    borderRadius: '20px', 
                    borderColor: mode === 'light' ? 'rgba(0,0,0,0.12)' : 'rgba(255,255,255,0.15)',
                    color: 'text.secondary',
                    display: { xs: 'none', sm: 'inline-flex' },
                    '&:hover': { borderColor: 'primary.main', color: 'primary.main', bgcolor: 'transparent' }
                  }}
                >
                  Swagger API
                </Button>

                {/* Theme Mode Toggle */}
                <Tooltip title={mode === 'light' ? "โหมดกลางคืน (Dark Mode)" : "โหมดกลางวัน (Light Mode)"}>
                  <IconButton 
                    onClick={toggleMode} 
                    sx={{ 
                      bgcolor: mode === 'light' ? 'rgba(0,0,0,0.04)' : 'rgba(255,255,255,0.06)',
                      '&:hover': { bgcolor: mode === 'light' ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.12)' }
                    }}
                  >
                    {mode === 'light' ? <DarkModeIcon sx={{ color: '#475569' }} /> : <LightModeIcon sx={{ color: '#fbbf24' }} />}
                  </IconButton>
                </Tooltip>
              </Box>
            </Toolbar>
          </Container>
        </AppBar>

        {/* Main Content Area */}
        <Box sx={{ flexGrow: 1, zIndex: 1, position: 'relative' }}>
          {children}
        </Box>
      </Box>
    </ThemeProvider>
  );
}
