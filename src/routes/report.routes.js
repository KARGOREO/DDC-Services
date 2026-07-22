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

module.exports = router;
