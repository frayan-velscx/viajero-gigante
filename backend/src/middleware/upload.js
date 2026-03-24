// =============================================
// MIDDLEWARE DE SUBIDA DE ARCHIVOS - GIGANTE VIAJERO
// =============================================

const multer = require('multer');

// ── Almacenamiento en memoria (para Firebase Storage en Render) ───────────────
const storage = multer.memoryStorage();

// ── Filtro: solo imágenes ─────────────────────────────────────────────────────
const fileFilter = (req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (allowed.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error('Solo se permiten imágenes (jpg, png, webp, gif)'), false);
    }
};

const upload = multer({
    storage,
    fileFilter,
    limits: { fileSize: 5 * 1024 * 1024 } // máx 5 MB
});

console.log('✅ Middleware de upload configurado');

module.exports = upload;