const multer = require('multer');
const path = require('path');
const fs = require('fs');

const uploadDir = path.join(__dirname, '../uploads/avatars');
fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
    destination: uploadDir,
    filename: (req, file, cb) => {
        const safeName = file.originalname
            .replace(/\s+/g, '-')
            .replace(/[^a-zA-Z0-9-_.]/g, '');
        cb(null, `${Date.now()}-${safeName}`);
    },
});

const fileFilter = (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error('Chỉ chấp nhận hình ảnh JPG, PNG, GIF hoặc WEBP'));
    }
};

const upload = multer({
    storage,
    fileFilter,
    limits: {
        fileSize: 2 * 1024 * 1024, // 2MB
    },
});

module.exports = upload;
