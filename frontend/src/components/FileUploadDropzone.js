"use client";

import React, { useRef, useState } from 'react';
import { Box, Typography, useTheme, Chip, Stack } from '@mui/material';

// Material UI Icons exclusively
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import InsertDriveFileIcon from '@mui/icons-material/InsertDriveFile';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';

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
        mb: 3, 
        p: { xs: 3, sm: 4 },
        border: `2px dashed ${
          dragActive 
            ? theme.palette.primary.main 
            : file 
            ? (isDark ? '#059669' : '#10b981')
            : isDark ? 'rgba(255,255,255,0.18)' : 'rgba(0,0,0,0.15)'
        }`,
        borderRadius: 4,
        bgcolor: dragActive 
          ? (isDark ? 'rgba(79, 70, 229, 0.12)' : 'rgba(79, 70, 229, 0.05)') 
          : file 
          ? (isDark ? 'rgba(16, 185, 129, 0.08)' : 'rgba(16, 185, 129, 0.04)')
          : (isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.01)'),
        display: 'flex', 
        flexDirection: 'column', 
        alignItems: 'center', 
        justifyContent: 'center',
        cursor: 'pointer',
        textAlign: 'center',
        transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
        '&:hover': {
          border: `2px dashed ${theme.palette.primary.main}`,
          bgcolor: isDark ? 'rgba(79, 70, 229, 0.08)' : 'rgba(79, 70, 229, 0.03)',
          transform: 'translateY(-2px)'
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

      {file ? (
        <Box sx={{
          width: 54,
          height: 54,
          borderRadius: '50%',
          bgcolor: isDark ? 'rgba(16, 185, 129, 0.2)' : 'rgba(16, 185, 129, 0.15)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: isDark ? '#34d399' : '#059669',
          mb: 1.5
        }}>
          <CheckCircleIcon sx={{ fontSize: 32 }} />
        </Box>
      ) : (
        icon || (
          <Box sx={{
            width: 54,
            height: 54,
            borderRadius: '50%',
            bgcolor: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(79, 70, 229, 0.08)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: isDark ? '#818cf8' : '#4f46e5',
            mb: 1.5
          }}>
            <CloudUploadIcon sx={{ fontSize: 30 }} />
          </Box>
        )
      )}

      <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 0.5, wordBreak: 'break-word', maxWidth: '100%' }}>
        {file ? file.name : label}
      </Typography>

      {file ? (
        <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 0.5 }}>
          <Chip 
            icon={<InsertDriveFileIcon sx={{ fontSize: 14 }} />}
            label={`${(file.size / 1024).toFixed(1)} KB`} 
            size="small" 
            color="success" 
            variant="outlined" 
            sx={{ fontWeight: 600, fontSize: '0.75rem' }}
          />
          <Typography variant="caption" color="text.secondary">
            (คลิกเพื่อเปลี่ยนไฟล์)
          </Typography>
        </Stack>
      ) : (
        <Typography variant="body2" color="text.secondary" sx={{ maxWidth: '380px' }}>
          {helperText || "ลากและวางไฟล์ หรือคลิกเพื่อเลือกไฟล์จากคอมพิวเตอร์"}
        </Typography>
      )}
    </Box>
  );
}
