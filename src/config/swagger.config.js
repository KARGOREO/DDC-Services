const swaggerJSDoc = require('swagger-jsdoc');
const path = require('path');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'DDC API Service',
      version: '1.0.0',
      description: 'API สำหรับจัดการข้อมูล D506 และประมวลผลรายงาน',
    },
    servers: [
      {
        url: 'http://localhost:3000',
        description: 'Local server',
      },
    ],
  },
  // ใช้ path.join แล้วแปลง \ เป็น / เพื่อให้ glob ใน Windows ทำงานได้ถูกต้อง
  apis: [path.join(__dirname, '../routes/*.js').replace(/\\/g, '/')],
};

const swaggerSpec = swaggerJSDoc(options);

module.exports = swaggerSpec;
