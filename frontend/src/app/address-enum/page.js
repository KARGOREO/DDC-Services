"use client";

import React, { useState, useEffect, useMemo } from 'react';
import {
  Box,
  Typography,
  Button,
  Container,
  CircularProgress,
  Card,
  CardContent,
  useTheme,
  Fade,
  TextField,
  Tabs,
  Tab,
  Alert,
  Paper,
  IconButton,
  Tooltip,
  Divider,
  Stack,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  InputAdornment,
  TablePagination
} from '@mui/material';
import axios from 'axios';
import Swal from 'sweetalert2';
import Link from 'next/link';
import FileUploadDropzone from '@/components/FileUploadDropzone';

// Material UI icons
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import EditLocationAltIcon from '@mui/icons-material/EditLocationAlt';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ClearIcon from '@mui/icons-material/Clear';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import SearchIcon from '@mui/icons-material/Search';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import CheckCircleOutlinedIcon from '@mui/icons-material/CheckCircleOutlined';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import LayersIcon from '@mui/icons-material/Layers';
import FactCheckIcon from '@mui/icons-material/FactCheck';
import TableChartIcon from '@mui/icons-material/TableChart';

export default function AddressEnumPage() {
  const [activeTab, setActiveTab] = useState(0); // 0: Enum Manager, 1: JSON Audit & Convert, 2: Import Excel
  const [mappings, setMappings] = useState({});
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Pagination for Enum Table
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(15);

  // Dialog for Add / Edit
  const [openDialog, setOpenDialog] = useState(false);
  const [editingCode, setEditingCode] = useState('');
  const [editingValue, setEditingValue] = useState('');
  const [isEditMode, setIsEditMode] = useState(false);

  // JSON Audit & Convert State
  const [jsonFile, setJsonFile] = useState(null);
  const [auditLoading, setAuditLoading] = useState(false);
  const [auditResult, setAuditResult] = useState(null);
  const [exportLoading, setExportLoading] = useState(false);

  // Excel Import State
  const [excelFile, setExcelFile] = useState(null);
  const [excelLoading, setExcelLoading] = useState(false);

  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';

  // Load Enum mappings on mount
  useEffect(() => {
    fetchMappings();
  }, []);

  const fetchMappings = async () => {
    try {
      setLoading(true);
      const res = await axios.get('http://localhost:3000/api/address-enum');
      if (res.data && res.data.mappings) {
        setMappings(res.data.mappings);
      }
    } catch (err) {
      console.error(err);
      Swal.fire('ข้อผิดพลาด', 'ไม่สามารถโหลดข้อมูล Enum Mapping ได้', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenAddDialog = () => {
    setEditingCode('');
    setEditingValue('');
    setIsEditMode(false);
    setOpenDialog(true);
  };

  const handleOpenEditDialog = (code, val) => {
    setEditingCode(code);
    setEditingValue(val !== null && val !== undefined ? String(val) : '');
    setIsEditMode(true);
    setOpenDialog(true);
  };

  const handleSaveMapping = async () => {
    if (!editingCode.trim()) {
      return Swal.fire('แจ้งเตือน', 'กรุณาระบุรหัสข้อผิดพลาด (invalid_code)', 'warning');
    }
    try {
      setLoading(true);
      await axios.post('http://localhost:3000/api/address-enum', {
        invalid_code: editingCode.trim(),
        suggested_code: editingValue.trim()
      });
      setOpenDialog(false);
      await fetchMappings();
      Swal.fire({
        icon: 'success',
        title: 'บันทึกสำเร็จ',
        text: `รหัส ${editingCode} -> ${editingValue}`,
        toast: true,
        position: 'top-end',
        showConfirmButton: false,
        timer: 2500
      });
    } catch (err) {
      console.error(err);
      Swal.fire('ข้อผิดพลาด', 'ไม่สามารถบันทึกข้อมูลได้', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (code) => {
    const confirm = await Swal.fire({
      title: `ลบรหัส ${code}?`,
      text: 'คุณต้องการลบรหัสนี้ออกจาก Enum Mapping หรือไม่?',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'ใช่, ลบเลย',
      cancelButtonText: 'ยกเลิก',
      confirmButtonColor: '#ef4444'
    });

    if (confirm.isConfirmed) {
      try {
        setLoading(true);
        await axios.delete(`http://localhost:3000/api/address-enum/${code}`);
        await fetchMappings();
        Swal.fire('สำเร็จ', `ลบรหัส ${code} เรียบร้อยแล้ว`, 'success');
      } catch (err) {
        console.error(err);
        Swal.fire('ข้อผิดพลาด', 'ไม่สามารถลบข้อมูลได้', 'error');
      } finally {
        setLoading(false);
      }
    }
  };

  const handleResetToDefault = async () => {
    const confirm = await Swal.fire({
      title: 'รีเซ็ตเป็นค่าเริ่มต้น?',
      text: 'การดำเนินการนี้จะลบการแก้ไขทั้งหมดและตั้งค่ากลับเป็นชุดมาตรฐานของ Excel สรุปผล',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'ใช่, รีเซ็ต',
      cancelButtonText: 'ยกเลิก',
      confirmButtonColor: '#f59e0b'
    });

    if (confirm.isConfirmed) {
      try {
        setLoading(true);
        await axios.post('http://localhost:3000/api/address-enum/reset');
        await fetchMappings();
        Swal.fire('สำเร็จ', 'รีเซ็ต Enum Mapping เรียบร้อยแล้ว', 'success');
      } catch (err) {
        console.error(err);
        Swal.fire('ข้อผิดพลาด', 'ไม่สามารถรีเซ็ตได้', 'error');
      } finally {
        setLoading(false);
      }
    }
  };

  // Filtered mapping items
  const filteredMappingEntries = useMemo(() => {
    const entries = Object.entries(mappings);
    if (!searchQuery.trim()) return entries;
    const q = searchQuery.toLowerCase().trim();
    return entries.filter(([k, v]) => {
      return k.toLowerCase().includes(q) || String(v).toLowerCase().includes(q);
    });
  }, [mappings, searchQuery]);

  // Handle JSON Audit
  const handleAnalyzeJson = async () => {
    if (!jsonFile) {
      return Swal.fire('แจ้งเตือน', 'กรุณาเลือกไฟล์ JSON ก่อนตรวจสอบ', 'warning');
    }
    try {
      setAuditLoading(true);
      setAuditResult(null);

      const formData = new FormData();
      formData.append('jsonFile', jsonFile);

      const res = await axios.post('http://localhost:3000/api/address-enum/analyze-json', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      setAuditResult(res.data);
    } catch (err) {
      console.error(err);
      Swal.fire('ข้อผิดพลาด', 'ไม่สามารถตรวจสอบไฟล์ JSON ได้', 'error');
    } finally {
      setAuditLoading(false);
    }
  };

  // Convert JSON to Excel Official Report
  const handleExportExcel = async () => {
    if (!jsonFile) {
      return Swal.fire('แจ้งเตือน', 'กรุณาเลือกไฟล์ JSON ก่อนส่งออก Excel', 'warning');
    }
    try {
      setExportLoading(true);
      const formData = new FormData();
      formData.append('jsonFile', jsonFile);
      formData.append('mode', 'gov');

      const response = await axios.post('http://localhost:3000/api/report/json-to-excel', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        responseType: 'blob'
      });

      let fileName = 'DDC_Error_Report_Address_Fixed.xlsx';
      const disposition = response.headers['content-disposition'];
      if (disposition && disposition.indexOf('filename=') !== -1) {
        const matches = /filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/.exec(disposition);
        if (matches != null && matches[1]) {
          fileName = matches[1].replace(/['"]/g, '');
        }
      }

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', fileName);
      document.body.appendChild(link);
      link.click();
      link.remove();

      Swal.fire({
        icon: 'success',
        title: 'ส่งออก Excel สำเร็จ',
        text: `ดาวน์โหลดไฟล์ ${fileName} เรียบร้อยแล้ว`,
        timer: 3000
      });
    } catch (err) {
      console.error(err);
      Swal.fire('ข้อผิดพลาด', 'ไม่สามารถแปลงไฟล์เป็น Excel ได้', 'error');
    } finally {
      setExportLoading(false);
    }
  };

  // Quick Map Missing Code directly from Audit Table
  const handleQuickMap = async (code, defaultVal = '') => {
    const { value: suggestedVal } = await Swal.fire({
      title: `เพิ่มค่า Mapping สำหรับ ${code}`,
      input: 'text',
      inputLabel: 'รหัสแขวงที่ถูกต้อง (ใช้รหัสแขวง)',
      inputValue: defaultVal || '',
      placeholder: 'เช่น 105002 หรือ ไม่นำเข้าฐาน Epinet',
      showCancelButton: true,
      confirmButtonText: 'บันทึกเข้า Enum',
      cancelButtonText: 'ยกเลิก',
      inputValidator: (value) => {
        if (!value || !value.trim()) {
          return 'กรุณากรอกรหัสแขวง!';
        }
      }
    });

    if (suggestedVal) {
      try {
        await axios.post('http://localhost:3000/api/address-enum', {
          invalid_code: code,
          suggested_code: suggestedVal.trim()
        });
        await fetchMappings();
        // Update local audit result
        if (auditResult) {
          setAuditResult(prev => ({
            ...prev,
            mapped_count: prev.mapped_count + 1,
            unmapped_count: Math.max(0, prev.unmapped_count - 1),
            codes: prev.codes.map(c => c.invalid_code === code ? { ...c, is_existing: true, status: 'mapped', suggested_code: suggestedVal.trim() } : c)
          }));
        }
        Swal.fire({
          icon: 'success',
          title: 'เพิ่มเข้า Enum เรียบร้อย',
          text: `${code} -> ${suggestedVal.trim()}`,
          toast: true,
          position: 'top-end',
          showConfirmButton: false,
          timer: 2000
        });
      } catch (err) {
        Swal.fire('ข้อผิดพลาด', 'ไม่สามารถบันทึก Mapping ได้', 'error');
      }
    }
  };

  // Handle Import Excel
  const handleImportExcel = async () => {
    if (!excelFile) {
      return Swal.fire('แจ้งเตือน', 'กรุณาเลือกไฟล์ Excel เพื่อนำเข้า', 'warning');
    }
    try {
      setExcelLoading(true);
      const formData = new FormData();
      formData.append('excelFile', excelFile);

      const res = await axios.post('http://localhost:3000/api/address-enum/import-excel', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      await fetchMappings();
      setExcelFile(null);
      Swal.fire('สำเร็จ', res.data.message || 'นำเข้าข้อมูล Enum สำเร็จ', 'success');
    } catch (err) {
      console.error(err);
      Swal.fire('ข้อผิดพลาด', err.response?.data?.error || 'เกิดข้อผิดพลาดในการนำเข้า Excel', 'error');
    } finally {
      setExcelLoading(false);
    }
  };

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default', py: 5 }}>
      <Container maxWidth="xl">
        {/* Top Navigation */}
        <Box sx={{ mb: 4, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2 }}>
          <Button
            component={Link}
            href="/"
            variant="outlined"
            startIcon={<ArrowBackIcon />}
            sx={{
              borderRadius: '12px',
              textTransform: 'none',
              px: 2.5,
              py: 1,
              borderColor: isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.15)',
              color: 'text.primary',
              '&:hover': {
                borderColor: 'primary.main',
                bgcolor: isDark ? 'rgba(56, 189, 248, 0.08)' : 'rgba(14, 165, 233, 0.08)'
              }
            }}
          >
            กลับสู่หน้าหลัก
          </Button>

          <Stack direction="row" spacing={1.5}>
            <Chip
              icon={<FactCheckIcon sx={{ fontSize: '18px !important' }} />}
              label={`Enum ทั้งหมด: ${Object.keys(mappings).length} รายการ`}
              color="primary"
              variant="outlined"
              sx={{ fontWeight: 600, px: 1, py: 2, borderRadius: '10px' }}
            />
            <Button
              variant="outlined"
              color="warning"
              size="small"
              startIcon={<RestartAltIcon />}
              onClick={handleResetToDefault}
              sx={{ borderRadius: '10px', textTransform: 'none', fontWeight: 600 }}
            >
              รีเซ็ตค่าเริ่มต้น
            </Button>
          </Stack>
        </Box>

        {/* Hero Header */}
        <Fade in timeout={600}>
          <Box sx={{ mb: 4, textAlign: 'center' }}>
            <Box sx={{ display: 'inline-flex', p: 1.5, borderRadius: '20px', bgcolor: 'rgba(14, 165, 233, 0.1)', color: '#0ea5e9', mb: 2 }}>
              <EditLocationAltIcon sx={{ fontSize: 42 }} />
            </Box>
            <Typography variant="h4" component="h1" fontWeight="800" sx={{ mb: 1, letterSpacing: '-0.5px' }}>
              จัดการ Enum รหัสที่อยู่ & แขวง (Address Enum Manager)
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ maxWidth: 800, mx: 'auto', lineHeight: 1.6 }}>
              จับคู่รหัสตำบล/แขวงที่ไม่ถูกต้อง (<code>invalid_code</code>) เป็นรหัสแขวงที่ถูกต้อง (<code>ใช้รหัสแขวง</code>) 
              พร้อมตรวจสอบไฟล์ JSON รายงานข้อผิดพลาด และแปลงออกเป็นไฟล์ Excel รูปแบบราชการอัตโนมัติ
            </Typography>
          </Box>
        </Fade>

        {/* Tab Selection */}
        <Paper
          elevation={0}
          sx={{
            mb: 4,
            borderRadius: '16px',
            border: '1px solid',
            borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)',
            bgcolor: isDark ? 'rgba(30, 41, 59, 0.5)' : '#ffffff',
            p: 1
          }}
        >
          <Tabs
            value={activeTab}
            onChange={(e, val) => setActiveTab(val)}
            variant="fullWidth"
            textColor="primary"
            indicatorColor="primary"
            sx={{
              '& .MuiTab-root': {
                py: 2,
                borderRadius: '12px',
                fontWeight: 700,
                fontSize: '0.95rem',
                textTransform: 'none',
                gap: 1.5
              }
            }}
          >
            <Tab icon={<FactCheckIcon />} iconPosition="start" label={`1. คลังรหัส Enum Mapping (${Object.keys(mappings).length})`} />
            <Tab icon={<TableChartIcon />} iconPosition="start" label="2. ตรวจสอบ JSON & แปลงเป็น Excel (Audit & Convert)" />
            <Tab icon={<UploadFileIcon />} iconPosition="start" label="3. นำเข้า Enum จาก Excel เพิ่มเติม" />
          </Tabs>
        </Paper>

        {/* TAB 1: Enum Manager */}
        {activeTab === 0 && (
          <Fade in timeout={400}>
            <Box>
              <Card
                elevation={0}
                sx={{
                  borderRadius: '20px',
                  border: '1px solid',
                  borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)',
                  bgcolor: isDark ? 'rgba(30, 41, 59, 0.6)' : '#ffffff',
                  backdropFilter: 'blur(10px)',
                  overflow: 'hidden'
                }}
              >
                <CardContent sx={{ p: 3 }}>
                  <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems="center" spacing={2} sx={{ mb: 3 }}>
                    <TextField
                      placeholder="ค้นหารหัส หรือ ค่าแขวง..."
                      value={searchQuery}
                      onChange={(e) => {
                        setSearchQuery(e.target.value);
                        setPage(0);
                      }}
                      size="small"
                      InputProps={{
                        startAdornment: (
                          <InputAdornment position="start">
                            <SearchIcon sx={{ color: 'text.secondary' }} />
                          </InputAdornment>
                        ),
                        endAdornment: searchQuery ? (
                          <InputAdornment position="end">
                            <IconButton size="small" onClick={() => setSearchQuery('')}>
                              <ClearIcon fontSize="small" />
                            </IconButton>
                          </InputAdornment>
                        ) : null
                      }}
                      sx={{ width: { xs: '100%', sm: 360 } }}
                    />

                    <Button
                      variant="contained"
                      startIcon={<AddIcon />}
                      onClick={handleOpenAddDialog}
                      sx={{
                        borderRadius: '12px',
                        textTransform: 'none',
                        fontWeight: 700,
                        px: 3,
                        py: 1,
                        background: 'linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%)',
                        boxShadow: '0 4px 14px rgba(14, 165, 233, 0.3)'
                      }}
                    >
                      เพิ่มรหัส Enum ใหม่
                    </Button>
                  </Stack>

                  {/* Mapping Table */}
                  <TableContainer component={Paper} elevation={0} sx={{ border: '1px solid', borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)', borderRadius: '14px' }}>
                    <Table>
                      <TableHead sx={{ bgcolor: isDark ? 'rgba(15, 23, 42, 0.6)' : 'rgba(241, 245, 249, 0.8)' }}>
                        <TableRow>
                          <TableCell sx={{ fontWeight: 700, width: '80px' }}>ลำดับ</TableCell>
                          <TableCell sx={{ fontWeight: 700 }}>รหัสที่ไม่ถูกต้อง (invalid_code)</TableCell>
                          <TableCell sx={{ fontWeight: 700 }}>รหัสแขวงที่ถูกต้อง (ใช้รหัสแขวง)</TableCell>
                          <TableCell sx={{ fontWeight: 700 }}>สถานะ</TableCell>
                          <TableCell align="right" sx={{ fontWeight: 700, width: '140px' }}>จัดการ</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {loading ? (
                          <TableRow>
                            <TableCell colSpan={5} align="center" sx={{ py: 6 }}>
                              <CircularProgress size={36} />
                              <Typography variant="body2" sx={{ mt: 1.5, color: 'text.secondary' }}>
                                กำลังโหลดข้อมูล Enum...
                              </Typography>
                            </TableCell>
                          </TableRow>
                        ) : filteredMappingEntries.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={5} align="center" sx={{ py: 6 }}>
                              <Typography variant="body1" color="text.secondary">
                                ไม่พบรายการ Enum ที่ตรงกับการค้นหา
                              </Typography>
                            </TableCell>
                          </TableRow>
                        ) : (
                          filteredMappingEntries
                            .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                            .map(([invCode, sugCode], idx) => {
                              const isSpecialAction = sugCode === 'ไม่นำเข้าฐาน Epinet';
                              return (
                                <TableRow key={invCode} hover sx={{ '&:last-child td, &:last-child th': { border: 0 } }}>
                                  <TableCell sx={{ color: 'text.secondary', fontWeight: 600 }}>
                                    {page * rowsPerPage + idx + 1}
                                  </TableCell>
                                  <TableCell>
                                    <Chip
                                      label={invCode}
                                      size="small"
                                      sx={{
                                        fontWeight: 700,
                                        bgcolor: isDark ? 'rgba(239, 68, 68, 0.15)' : '#fee2e2',
                                        color: '#ef4444',
                                        fontFamily: 'monospace'
                                      }}
                                    />
                                  </TableCell>
                                  <TableCell>
                                    <Chip
                                      label={String(sugCode)}
                                      size="small"
                                      sx={{
                                        fontWeight: 700,
                                        bgcolor: isSpecialAction 
                                          ? (isDark ? 'rgba(245, 158, 11, 0.15)' : '#fef3c7')
                                          : (isDark ? 'rgba(16, 185, 129, 0.15)' : '#d1fae5'),
                                        color: isSpecialAction ? '#f59e0b' : '#10b981',
                                        fontFamily: isSpecialAction ? 'inherit' : 'monospace'
                                      }}
                                    />
                                  </TableCell>
                                  <TableCell>
                                    <Stack direction="row" spacing={1} alignItems="center">
                                      <CheckCircleIcon sx={{ fontSize: 16, color: '#10b981' }} />
                                      <Typography variant="caption" sx={{ fontWeight: 600, color: 'text.secondary' }}>
                                        พร้อมใช้งาน
                                      </Typography>
                                    </Stack>
                                  </TableCell>
                                  <TableCell align="right">
                                    <Stack direction="row" spacing={1} justifyContent="flex-end">
                                      <Tooltip title="แก้ไข">
                                        <IconButton size="small" onClick={() => handleOpenEditDialog(invCode, sugCode)} color="primary">
                                          <EditIcon fontSize="small" />
                                        </IconButton>
                                      </Tooltip>
                                      <Tooltip title="ลบ">
                                        <IconButton size="small" onClick={() => handleDelete(invCode)} color="error">
                                          <DeleteIcon fontSize="small" />
                                        </IconButton>
                                      </Tooltip>
                                    </Stack>
                                  </TableCell>
                                </TableRow>
                              );
                            })
                        )}
                      </TableBody>
                    </Table>
                  </TableContainer>

                  <TablePagination
                    component="div"
                    count={filteredMappingEntries.length}
                    page={page}
                    onPageChange={(e, newPage) => setPage(newPage)}
                    rowsPerPage={rowsPerPage}
                    onRowsPerPageChange={(e) => {
                      setRowsPerPage(parseInt(e.target.value, 10));
                      setPage(0);
                    }}
                    rowsPerPageOptions={[10, 15, 25, 50]}
                    labelRowsPerPage="แสดงต่อหน้า:"
                    sx={{ mt: 1 }}
                  />
                </CardContent>
              </Card>
            </Box>
          </Fade>
        )}

        {/* TAB 2: JSON Audit & Convert */}
        {activeTab === 1 && (
          <Fade in timeout={400}>
            <Box>
              <Card
                elevation={0}
                sx={{
                  mb: 4,
                  borderRadius: '20px',
                  border: '1px solid',
                  borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)',
                  bgcolor: isDark ? 'rgba(30, 41, 59, 0.6)' : '#ffffff',
                  backdropFilter: 'blur(10px)'
                }}
              >
                <CardContent sx={{ p: 4 }}>
                  <Typography variant="h6" fontWeight="700" sx={{ mb: 1 }}>
                    อัปโหลดไฟล์ JSON ข้อมูล Error เพื่อตรวจสอบ Enum และออกรายงาน Excel
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                    รองรับไฟล์ JSON เช่น <code>d506_address_error_26092026_to_30092026.json</code> หรือไฟล์ที่มีโครงสร้าง <code>error_cases</code>
                  </Typography>

                  <FileUploadDropzone
                    file={jsonFile}
                    onFileSelect={(file) => {
                      setJsonFile(file);
                      setAuditResult(null);
                    }}
                    onClear={() => {
                      setJsonFile(null);
                      setAuditResult(null);
                    }}
                    accept={{ 'application/json': ['.json'] }}
                    title="ลากไฟล์ JSON มาวางที่นี่ หรือคลิกเพื่อเลือกไฟล์"
                    subtitle="รองรับไฟล์ .json (ขนาดสูงสุด 50MB)"
                  />

                  <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mt: 3 }}>
                    <Button
                      variant="contained"
                      color="primary"
                      disabled={!jsonFile || auditLoading}
                      onClick={handleAnalyzeJson}
                      startIcon={auditLoading ? <CircularProgress size={20} color="inherit" /> : <FactCheckIcon />}
                      sx={{
                        py: 1.5,
                        px: 3,
                        borderRadius: '12px',
                        fontWeight: 700,
                        textTransform: 'none'
                      }}
                    >
                      {auditLoading ? 'กำลังตรวจสอบ...' : 'ตรวจสอบ Enum ในไฟล์ JSON'}
                    </Button>

                    <Button
                      variant="contained"
                      color="success"
                      disabled={!jsonFile || exportLoading}
                      onClick={handleExportExcel}
                      startIcon={exportLoading ? <CircularProgress size={20} color="inherit" /> : <FileDownloadIcon />}
                      sx={{
                        py: 1.5,
                        px: 3,
                        borderRadius: '12px',
                        fontWeight: 700,
                        textTransform: 'none',
                        background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                        boxShadow: '0 4px 14px rgba(16, 185, 129, 0.3)'
                      }}
                    >
                      {exportLoading ? 'กำลังแปลงเป็น Excel...' : 'แปลงเป็น Excel ทันที (พร้อมเติมคอลัมน์ ใช้รหัสแขวง)'}
                    </Button>
                  </Stack>
                </CardContent>
              </Card>

              {/* Audit Summary Results */}
              {auditResult && (
                <Fade in timeout={400}>
                  <Card
                    elevation={0}
                    sx={{
                      borderRadius: '20px',
                      border: '1px solid',
                      borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)',
                      bgcolor: isDark ? 'rgba(30, 41, 59, 0.6)' : '#ffffff',
                      backdropFilter: 'blur(10px)'
                    }}
                  >
                    <CardContent sx={{ p: 4 }}>
                      <Typography variant="h6" fontWeight="700" sx={{ mb: 2 }}>
                        ผลการตรวจสอบ Enum กับไฟล์ JSON
                      </Typography>

                      <Grid container spacing={2} sx={{ mb: 3 }}>
                        <Grid item xs={12} sm={4}>
                          <Paper sx={{ p: 2, borderRadius: '14px', bgcolor: isDark ? 'rgba(15, 23, 42, 0.6)' : '#f8fafc', border: '1px solid', borderColor: isDark ? 'rgba(255,255,255,0.05)' : '#e2e8f0' }}>
                            <Typography variant="caption" color="text.secondary" fontWeight={600}>
                              เคสทั้งหมดในไฟล์
                            </Typography>
                            <Typography variant="h5" fontWeight={800} color="primary.main">
                              {auditResult.total_cases?.toLocaleString()} เคส
                            </Typography>
                          </Paper>
                        </Grid>

                        <Grid item xs={12} sm={4}>
                          <Paper sx={{ p: 2, borderRadius: '14px', bgcolor: isDark ? 'rgba(16, 185, 129, 0.1)' : '#ecfdf5', border: '1px solid', borderColor: isDark ? 'rgba(16, 185, 129, 0.2)' : '#a7f3d0' }}>
                            <Typography variant="caption" sx={{ color: '#059669', fontWeight: 600 }}>
                              มีใน Enum แล้ว (พร้อมแปลง)
                            </Typography>
                            <Typography variant="h5" fontWeight={800} sx={{ color: '#059669' }}>
                              {auditResult.mapped_count} รหัส
                            </Typography>
                          </Paper>
                        </Grid>

                        <Grid item xs={12} sm={4}>
                          <Paper sx={{ p: 2, borderRadius: '14px', bgcolor: isDark ? 'rgba(245, 158, 11, 0.1)' : '#fffbeb', border: '1px solid', borderColor: isDark ? 'rgba(245, 158, 11, 0.2)' : '#fde68a' }}>
                            <Typography variant="caption" sx={{ color: '#d97706', fontWeight: 600 }}>
                              รหัสใหม่ (ยังไม่ถูก Map)
                            </Typography>
                            <Typography variant="h5" fontWeight={800} sx={{ color: '#d97706' }}>
                              {auditResult.unmapped_count} รหัส
                            </Typography>
                          </Paper>
                        </Grid>
                      </Grid>

                      {auditResult.unmapped_count > 0 && (
                        <Alert severity="warning" sx={{ mb: 3, borderRadius: '12px' }}>
                          พบรหัส <code>invalid_code</code> ใหม่ {auditResult.unmapped_count} รหัสที่ยังไม่มีใน Enum! คุณสามารถคลิก <b>"เพิ่มเข้า Enum"</b> ในตารางด้านล่างเพื่อให้ระบบจำค่าและเติมลงใน Excel อัตโนมัติได้ทันที
                        </Alert>
                      )}

                      {/* Audit Details Table */}
                      <TableContainer component={Paper} elevation={0} sx={{ border: '1px solid', borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)', borderRadius: '14px' }}>
                        <Table>
                          <TableHead sx={{ bgcolor: isDark ? 'rgba(15, 23, 42, 0.6)' : 'rgba(241, 245, 249, 0.8)' }}>
                            <TableRow>
                              <TableCell sx={{ fontWeight: 700 }}>รหัสที่ไม่ถูกต้อง (invalid_code)</TableCell>
                              <TableCell sx={{ fontWeight: 700 }}>จำนวนเคสที่พบ</TableCell>
                              <TableCell sx={{ fontWeight: 700 }}>สถานะใน Enum</TableCell>
                              <TableCell sx={{ fontWeight: 700 }}>รหัสแขวงที่จะใช้ (ใช้รหัสแขวง)</TableCell>
                              <TableCell sx={{ fontWeight: 700 }}>ตัวอย่างข้อความ Error</TableCell>
                              <TableCell align="right" sx={{ fontWeight: 700 }}>การจัดการ</TableCell>
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            {auditResult.codes?.map((row) => (
                              <TableRow key={row.invalid_code} hover>
                                <TableCell>
                                  <Chip
                                    label={row.invalid_code}
                                    size="small"
                                    sx={{ fontWeight: 700, fontFamily: 'monospace' }}
                                  />
                                </TableCell>
                                <TableCell sx={{ fontWeight: 600 }}>
                                  {row.count} เคส
                                </TableCell>
                                <TableCell>
                                  {row.is_existing ? (
                                    <Chip
                                      icon={<CheckCircleOutlinedIcon sx={{ fontSize: '16px !important' }} />}
                                      label="Enum เดิม (พร้อมใช้)"
                                      color="success"
                                      size="small"
                                      sx={{ fontWeight: 600 }}
                                    />
                                  ) : (
                                    <Chip
                                      icon={<WarningAmberIcon sx={{ fontSize: '16px !important' }} />}
                                      label="ยังไม่มีใน Enum (รหัสใหม่)"
                                      color="warning"
                                      size="small"
                                      sx={{ fontWeight: 600 }}
                                    />
                                  )}
                                </TableCell>
                                <TableCell>
                                  {row.suggested_code ? (
                                    <Chip
                                      label={String(row.suggested_code)}
                                      size="small"
                                      sx={{ fontWeight: 700, bgcolor: '#d1fae5', color: '#065f46' }}
                                    />
                                  ) : (
                                    <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic' }}>
                                      (ยังไม่ได้กำหนด)
                                    </Typography>
                                  )}
                                </TableCell>
                                <TableCell sx={{ maxWidth: 300 }}>
                                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                                    {row.sample_cases?.[0]?.error_reason || '-'}
                                  </Typography>
                                </TableCell>
                                <TableCell align="right">
                                  {row.is_existing ? (
                                    <Button
                                      size="small"
                                      variant="text"
                                      onClick={() => handleQuickMap(row.invalid_code, String(row.suggested_code))}
                                      sx={{ textTransform: 'none', fontWeight: 600 }}
                                    >
                                      แก้ไข
                                    </Button>
                                  ) : (
                                    <Button
                                      size="small"
                                      variant="contained"
                                      color="warning"
                                      onClick={() => handleQuickMap(row.invalid_code, '')}
                                      sx={{ textTransform: 'none', fontWeight: 700, borderRadius: '8px' }}
                                    >
                                      เพิ่มเข้า Enum
                                    </Button>
                                  )}
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </TableContainer>
                    </CardContent>
                  </Card>
                </Fade>
              )}
            </Box>
          </Fade>
        )}

        {/* TAB 3: Import Excel */}
        {activeTab === 2 && (
          <Fade in timeout={400}>
            <Box>
              <Card
                elevation={0}
                sx={{
                  borderRadius: '20px',
                  border: '1px solid',
                  borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)',
                  bgcolor: isDark ? 'rgba(30, 41, 59, 0.6)' : '#ffffff',
                  backdropFilter: 'blur(10px)'
                }}
              >
                <CardContent sx={{ p: 4 }}>
                  <Typography variant="h6" fontWeight="700" sx={{ mb: 1 }}>
                    นำเข้า Enum จากไฟล์ Excel ที่มีคอลัมน์ invalid_code และ ใช้รหัสแขวง
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                    เช่น ไฟล์ <code>DDC_Error_Report_error_address_...ส่งให้คุณหนานแก้ไข.xlsx</code> ระบบจะค้นหาและดึงการจับคู่รหัสเข้ามาผสานใน Enum โดยอัตโนมัติ
                  </Typography>

                  <FileUploadDropzone
                    file={excelFile}
                    onFileSelect={(file) => setExcelFile(file)}
                    onClear={() => setExcelFile(null)}
                    accept={{ 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'] }}
                    title="ลากไฟล์ Excel (.xlsx) มาวางที่นี่"
                    subtitle="รองรับไฟล์ Excel รายงานที่มีคอลัมน์ invalid_code และ ใช้รหัสแขวง"
                  />

                  <Box sx={{ mt: 3 }}>
                    <Button
                      variant="contained"
                      color="primary"
                      disabled={!excelFile || excelLoading}
                      onClick={handleImportExcel}
                      startIcon={excelLoading ? <CircularProgress size={20} color="inherit" /> : <UploadFileIcon />}
                      sx={{
                        py: 1.5,
                        px: 4,
                        borderRadius: '12px',
                        fontWeight: 700,
                        textTransform: 'none'
                      }}
                    >
                      {excelLoading ? 'กำลังนำเข้าข้อมูล...' : 'เริ่มนำเข้าข้อมูลเข้า Enum Mapping'}
                    </Button>
                  </Box>
                </CardContent>
              </Card>
            </Box>
          </Fade>
        )}

        {/* Add / Edit Dialog */}
        <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: '16px' } }}>
          <DialogTitle sx={{ fontWeight: 700 }}>
            {isEditMode ? 'แก้ไข Enum Mapping' : 'เพิ่ม Enum Mapping ใหม่'}
          </DialogTitle>
          <DialogContent dividers sx={{ py: 3 }}>
            <Stack spacing={3}>
              <TextField
                label="รหัสที่ไม่ถูกต้อง (invalid_code)"
                value={editingCode}
                onChange={(e) => setEditingCode(e.target.value)}
                disabled={isEditMode}
                placeholder="เช่น 105001"
                fullWidth
                helperText="รหัสตำบล 6 หลักเดิมที่มีปัญหาในฐานข้อมูล"
              />
              <TextField
                label="รหัสแขวงที่ถูกต้อง (ใช้รหัสแขวง)"
                value={editingValue}
                onChange={(e) => setEditingValue(e.target.value)}
                placeholder="เช่น 105003 หรือ ไม่นำเข้าฐาน Epinet"
                fullWidth
                helperText="รหัสแขวง 6 หลักที่ต้องการให้ระบบแทนที่ หรือระบุข้อความเฉพาะ"
              />
            </Stack>
          </DialogContent>
          <DialogActions sx={{ px: 3, py: 2 }}>
            <Button onClick={() => setOpenDialog(false)} sx={{ borderRadius: '10px', textTransform: 'none' }}>
              ยกเลิก
            </Button>
            <Button variant="contained" onClick={handleSaveMapping} sx={{ borderRadius: '10px', textTransform: 'none', fontWeight: 700 }}>
              บันทึก
            </Button>
          </DialogActions>
        </Dialog>
      </Container>
    </Box>
  );
}
