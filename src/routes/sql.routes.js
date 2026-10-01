const express = require('express');
const router = express.Router();
const multer = require('multer');
const sqlController = require('../controllers/sql.controller');

const upload = multer({ dest: 'uploads/' });

/**
 * @swagger
 * tags:
 *   name: SQL Generator
 *   description: การสร้างคำสั่ง SQL สำหรับลบข้อมูลอัตโนมัติ
 */

/**
 * @swagger
 * /api/sql/generate-delete:
 *   post:
 *     summary: สร้างคำสั่ง SQL สำหรับตั้งค่าสถานะเป็น delete
 *     tags: [SQL Generator]
 *     requestBody:
 *       required: false
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               excelFile:
 *                 type: string
 *                 format: binary
 *                 description: (Optional) ไฟล์ Excel ที่มีข้อมูล - ถ้าไม่ใส่จะใช้ไฟล์ .xlsx ในโฟลเดอร์ item-excel
 *     responses:
 *       200:
 *         description: สำเร็จ ส่งคืนไฟล์ .sql เพื่อดาวน์โหลด
 *         content:
 *           application/octet-stream:
 *             schema:
 *               type: string
 *               format: binary
 */
router.post('/generate-delete', upload.single('excelFile'), sqlController.generateSqlDeleteHandler);

/**
 * @swagger
 * /api/sql/generate-update-address:
 *   post:
 *     summary: สร้างคำสั่ง SQL UPDATE สำหรับเติมที่อยู่ขณะป่วย (epidem_) จากที่อยู่ปัจจุบัน
 *     tags: [SQL Generator]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: array
 *             items:
 *               type: object
 *               properties:
 *                 epidem_report_guid:
 *                   type: string
 *                 cid:
 *                   type: string
 *                 address:
 *                   type: string
 *                 moo:
 *                   type: string
 *                 road:
 *                   type: string
 *                 chw_code:
 *                   type: string
 *                 amp_code:
 *                   type: string
 *                 tmb_code:
 *                   type: string
 *                 epidem_address:
 *                   type: string
 *                 epidem_moo:
 *                   type: string
 *                 epidem_road:
 *                   type: string
 *                 epidem_chw_code:
 *                   type: string
 *                 epidem_amp_code:
 *                   type: string
 *                 epidem_tmb_code:
 *                   type: string
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               jsonFile:
 *                 type: string
 *                 format: binary
 *                 description: ไฟล์ JSON ข้อมูลที่ได้จาก query
 *     responses:
 *       200:
 *         description: สำเร็จ ส่งคืนรายการคำสั่ง SQL UPDATE หรือไฟล์ .sql
 */
router.post('/generate-update-address', upload.single('jsonFile'), sqlController.generateSqlUpdateAddressHandler);

module.exports = router;
