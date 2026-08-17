const express = require('express');
const router = express.Router();
const multer = require('multer');
const reportController = require('../controllers/report.controller');

// ตั้งค่า Multer สำหรับการรับไฟล์ชั่วคราว
const upload = multer({ dest: 'uploads/' });

/**
 * @swagger
 * tags:
 *   name: Reports
 *   description: การจัดการและวิเคราะห์ข้อมูลรายงาน D506 และ E506
 */

/**
 * @swagger
 * /api/reports/analyze-delay:
 *   post:
 *     summary: วิเคราะห์ความล่าช้าในการบันทึกข้อมูล (D506 vs EPI-Net)
 *     tags: [Reports]
 *     requestBody:
 *       required: false
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               d506File:
 *                 type: string
 *                 format: binary
 *                 description: (Optional) ไฟล์ JSON ข้อมูล D506 - ถ้าไม่ใส่จะใช้ไฟล์ D506-DATA.json ในระบบ
 *               eFormFile:
 *                 type: string
 *                 format: binary
 *                 description: (Optional) ไฟล์ JSON ข้อมูล E-Form - ถ้าไม่ใส่จะใช้ไฟล์ eForm506-DATA.json ในระบบ
 *     responses:
 *       200:
 *         description: สำเร็จ ส่งคืนไฟล์ Excel (D506_Analysis_Report_Final.xlsx)
 *         content:
 *           application/octet-stream:
 *             schema:
 *               type: string
 *               format: binary
 */
router.post('/analyze-delay', upload.fields([{ name: 'd506File', maxCount: 1 }, { name: 'eFormFile', maxCount: 1 }]), reportController.analyzeDelayHandler);

/**
 * @swagger
 * /api/reports/validate-identity:
 *   post:
 *     summary: ตรวจสอบความถูกต้องของ CID และ Passport
 *     tags: [Reports]
 *     requestBody:
 *       required: false
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               dataFile:
 *                 type: string
 *                 format: binary
 *                 description: (Optional) ไฟล์ JSON ข้อมูลที่ต้องการตรวจสอบ - ถ้าไม่ใส่จะใช้ data.json ในระบบ
 *               schemaFile:
 *                 type: string
 *                 format: binary
 *                 description: (Optional) ไฟล์ JSON โครงสร้าง (Schema) - ถ้าไม่ใส่จะใช้ schema.json ในระบบ
 *     responses:
 *       200:
 *         description: สำเร็จ ส่งคืนรายงานข้อผิดพลาดเป็น Excel หรือ JSON
 */
router.post('/validate-identity', upload.fields([{ name: 'dataFile', maxCount: 1 }, { name: 'schemaFile', maxCount: 1 }]), reportController.validateIdentityHandler);

/**
 * @swagger
 * /api/reports/find-missing:
 *   post:
 *     summary: ค้นหาข้อมูลที่ตกหล่น (มีใน D506 แต่ไม่มีใน E506)
 *     tags: [Reports]
 *     requestBody:
 *       required: false
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               d506File:
 *                 type: string
 *                 format: binary
 *                 description: (Optional) ไฟล์ JSON ข้อมูล D506 - ถ้าไม่ใส่จะใช้ items/dataD506.json ในระบบ
 *               e506File:
 *                 type: string
 *                 format: binary
 *                 description: (Optional) ไฟล์ JSON ข้อมูล E506 - ถ้าไม่ใส่จะใช้ items/dataE506.json ในระบบ
 *     responses:
 *       200:
 *         description: สำเร็จ ส่งคืนรายการข้อมูลที่หายไปเป็น JSON
 */
router.post('/find-missing', upload.fields([{ name: 'd506File', maxCount: 1 }, { name: 'e506File', maxCount: 1 }]), reportController.findMissingHandler);

/**
 * @swagger
 * /api/report/json-to-excel:
 *   post:
 *     summary: แปลงไฟล์ JSON ทุกรูปแบบ (Database Export) เป็นไฟล์ Excel (.xlsx)
 *     tags: [Reports]
 *     requestBody:
 *       required: false
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               jsonFile:
 *                 type: string
 *                 format: binary
 *                 description: ไฟล์ JSON ที่ต้องการแปลงเป็น Excel
 *               flatten:
 *                 type: boolean
 *                 description: ต้องการแยกฟิลด์ nested object ย่อยเป็นคอลัมน์หรือไม่ (default true)
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               jsonData:
 *                 type: object
 *                 description: ข้อมูล JSON ที่ต้องการแปลง
 *               flatten:
 *                 type: boolean
 *                 description: แตกโครงสร้าง nested หรือไม่
 *     responses:
 *       200:
 *         description: สำเร็จ ส่งคืนไฟล์ Excel (.xlsx)
 *         content:
 *           application/vnd.openxmlformats-officedocument.spreadsheetml.sheet:
 *             schema:
 *               type: string
 *               format: binary
 */
router.post('/json-to-excel', upload.single('jsonFile'), reportController.jsonToExcelHandler);

/**
 * @swagger
 * /api/report/json-to-excel/sample-bma:
 *   get:
 *     summary: แปลงไฟล์ตัวอย่าง user_bma.json ในระบบเป็นไฟล์ Excel ทันที
 *     tags: [Reports]
 *     responses:
 *       200:
 *         description: สำเร็จ ส่งคืนไฟล์ Excel ของ user_bma
 */
router.get('/json-to-excel/sample-bma', reportController.convertSampleUserBmaHandler);

module.exports = router;

