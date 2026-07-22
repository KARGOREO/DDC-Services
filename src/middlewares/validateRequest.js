const validateRequest = (schema) => {
    return (req, res, next) => {
        try {
            // Validate req.body, req.query, or req.params depending on your schema
            schema.parse(req.body);
            next();
        } catch (error) {
            // ถ้า Zod validate ไม่ผ่าน ให้ส่ง Error 400 กลับไป
            res.status(400).json({
                success: false,
                error: 'รูปแบบข้อมูลไม่ถูกต้อง',
                details: error.errors
            });
        }
    };
};

module.exports = validateRequest;
