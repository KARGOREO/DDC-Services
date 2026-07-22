"use client";
import React, { useRef, useState } from 'react';
import { Box, Typography, useTheme } from '@mui/material';

export default function FileUploadDropzone({ file, setFile, accept, label, helperText, icon }) {
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef(null);
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';

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
      setFile(e.dataTransfer.files[0]);
    }
  };

  return (
    <Box 
      onDragEnter={handleDrag}
      onDragLeave={handleDrag}
      onDragOver={handleDrag}
      onDrop={handleDrop}
      onClick={() => fileInputRef.current.click()}
      sx={{ 
        mb: 4, p: 4,
        border: `2px dashed ${dragActive ? theme.palette.primary.main : isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.2)'}`,
        borderRadius: 4,
        bgcolor: dragActive ? (isDark ? 'rgba(79, 70, 229, 0.1)' : 'rgba(79, 70, 229, 0.05)') : 'transparent',
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        cursor: 'pointer',
        transition: 'all 0.2s ease',
        '&:hover': {
          border: `2px dashed ${theme.palette.primary.main}`,
          bgcolor: isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.01)'
        }
      }}
    >
      <input 
        ref={fileInputRef}
        type="file" 
        accept={accept} 
        onChange={e => setFile(e.target.files[0])} 
        style={{ display: 'none' }}
      />
      {icon || (
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke={isDark ? '#94a3b8' : '#64748b'} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginBottom: '16px' }}>
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
          <polyline points="14 2 14 8 20 8"></polyline>
          <line x1="12" y1="18" x2="12" y2="12"></line>
          <line x1="9" y1="15" x2="15" y2="15"></line>
        </svg>
      )}
      <Typography variant="h6" sx={{ fontWeight: 600, mb: 1, textAlign: 'center' }}>
        {file ? file.name : label}
      </Typography>
      <Typography variant="body2" color="text.secondary" textAlign="center">
        {file ? `ขนาด: ${(file.size / 1024).toFixed(2)} KB` : helperText}
      </Typography>
    </Box>
  );
}
