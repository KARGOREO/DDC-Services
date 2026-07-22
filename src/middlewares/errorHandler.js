// Global Error Handler Middleware
const errorHandler = (err, req, res, next) => {
    // บันทึก Error ลง log (ในระบบจริงอาจจะใช้ Winston หรือส่งเข้า Sentry)
    console.error(`[Error] ${err.message}`);

    const statusCode = err.statusCode || 500;
    
    res.status(statusCode).json({
        success: false,
        error: err.message || 'Internal Server Error',
        // ส่ง stack trace กลับไปเฉพาะตอน Development
        stack: process.env.NODE_ENV === 'production' ? null : err.stack,
    });
};

module.exports = errorHandler;
