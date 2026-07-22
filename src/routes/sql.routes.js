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

module.exports = router;
