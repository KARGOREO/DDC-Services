const express = require('express');
const router = express.Router();
const multer = require('multer');
const addressEnumController = require('../controllers/addressEnum.controller');

const upload = multer({ dest: 'uploads/' });

/**
 * @swagger
 * tags:
 *   name: AddressEnum
 *   description: การจัดการ Enum จับคู่ invalid_code กับ ใช้รหัสแขวง สำหรับรายงานที่อยู่ผิดพลาด
 */

/**
 * @swagger
 * /api/address-enum:
 *   get:
 *     summary: ดึงรายการ Enum mapping ทั้งหมดในระบบ
 *     tags: [AddressEnum]
 *     responses:
 *       200:
 *         description: สำเร็จ ส่งคืน JSON mapping
 */
router.get('/', addressEnumController.getMappingsHandler);

/**
 * @swagger
 * /api/address-enum:
 *   post:
 *     summary: เพิ่มหรืออัปเดต Enum mapping รายการเดียว
 *     tags: [AddressEnum]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               invalid_code:
 *                 type: string
 *                 example: "105001"
 *               suggested_code:
 *                 type: string
 *                 example: "105003"
 *     responses:
 *       200:
 *         description: สำเร็จ
 */
router.post('/', addressEnumController.updateMappingHandler);

/**
 * @swagger
 * /api/address-enum/merge:
 *   post:
 *     summary: เพิ่มหรืออัปเดต Enum mapping แบบกลุ่ม (Batch merge)
 *     tags: [AddressEnum]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               mappings:
 *                 type: object
 *                 example: { "100114": "100101", "100230": "100201" }
 *     responses:
 *       200:
 *         description: สำเร็จ
 */
router.post('/merge', addressEnumController.mergeMappingsHandler);

/**
 * @swagger
 * /api/address-enum/{code}:
 *   delete:
 *     summary: ลบ Enum mapping ตามรหัส invalid_code
 *     tags: [AddressEnum]
 *     parameters:
 *       - in: path
 *         name: code
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: สำเร็จ
 */
router.delete('/:code', addressEnumController.deleteMappingHandler);

/**
 * @swagger
 * /api/address-enum/reset:
 *   post:
 *     summary: รีเซ็ต Enum mapping กลับเป็นค่ามาตรฐานเริ่มต้น
 *     tags: [AddressEnum]
 *     responses:
 *       200:
 *         description: สำเร็จ
 */
router.post('/reset', addressEnumController.resetMappingsHandler);

/**
 * @swagger
 * /api/address-enum/import-excel:
 *   post:
 *     summary: นำเข้า Enum mapping จากไฟล์ Excel รายงานข้อผิดพลาด (อ่านคอลัมน์ invalid_code และ ใช้รหัสแขวง อัตโนมัติ)
 *     tags: [AddressEnum]
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               excelFile:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: สำเร็จ
 */
router.post('/import-excel', upload.single('excelFile'), addressEnumController.importFromExcelHandler);

/**
 * @swagger
 * /api/address-enum/analyze-json:
 *   post:
 *     summary: ตรวจสอบไฟล์ JSON ว่ามี invalid_code รหัสใดบ้างที่อยู่ใน Enum แล้ว และรหัสใดเป็นรหัสใหม่ที่ยังไม่ถูก map
 *     tags: [AddressEnum]
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
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               jsonData:
 *                 type: array
 *     responses:
 *       200:
 *         description: สำเร็จ ส่งคืนรายการสรุปและสถานะ mapped / unmapped
 */
router.post('/analyze-json', upload.single('jsonFile'), addressEnumController.analyzeJsonEnumHandler);

module.exports = router;
