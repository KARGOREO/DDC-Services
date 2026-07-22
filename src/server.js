require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const swaggerUi = require('swagger-ui-express');
const swaggerSpec = require('./config/swagger.config');

const reportRoutes = require('./routes/report.routes');
const sqlRoutes = require('./routes/sql.routes');
const fileRoutes = require('./routes/file.routes');
const errorHandler = require('./middlewares/errorHandler');

const app = express();
const PORT = process.env.PORT || 3000;

// 1. Security & Headers Middleware
app.use(helmet()); // ซ่อน header ที่บอกข้อมูล Server และตั้งค่าความปลอดภัยพื้นฐาน
app.use(cors({ exposedHeaders: ['Content-Disposition'] })); // อนุญาตการเข้าถึงข้ามโดเมน และยอมให้ Frontend อ่านชื่อไฟล์

// 2. Request Parser Middleware
app.use(express.json({ limit: '50mb' })); // รับข้อมูลแบบ JSON
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// 3. Logger Middleware
app.use(morgan('dev')); // บันทึก Log การเรียกใช้งาน API (แสดงใน Terminal)

// 4. Rate Limiter Middleware (จำกัด 100 Request ต่อ 15 นาทีต่อ IP)
const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, 
    max: 100,
    message: { error: 'มีการเรียกใช้งาน API มากเกินไป กรุณาลองใหม่ในภายหลัง' }
});
app.use('/api', apiLimiter);

// 5. Swagger UI Route
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// 6. API Routes
app.use('/api/report', reportRoutes);
app.use('/api/sql', sqlRoutes);
app.use('/api/files', fileRoutes);

// Health Check
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK', message: 'API is running successfully' });
});

// 7. Global Error Handler (ต้องวางไว้ล่างสุดเสมอ)
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`🚀 Server is running on http://localhost:${PORT}`);
  console.log(`📑 Swagger Documentation available at http://localhost:${PORT}/api-docs`);
});
