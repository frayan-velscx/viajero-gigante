// =============================================
// RUTA DE FOTO DE PERFIL - GIGANTE VIAJERO
// =============================================

const express = require('express');
const router  = express.Router();
const path    = require('path');

const { protect }  = require('../middleware/auth');
const upload       = require('../middleware/upload');
const User         = require('../models/User');
const admin        = require('../config/firebase');

console.log('📸 Inicializando rutas de foto de perfil');

// ── POST /api/users/photo  →  Subir / cambiar foto ───────────────────────────
router.post('/', protect, upload.single('photo'), async (req, res) => {
    try {
        console.log('📸 POST /api/users/photo - Subiendo foto...');

        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: 'No se recibió ninguna imagen.'
            });
        }

        const userId = req.user?._id || req.user?.id;
        if (!userId) {
            return res.status(401).json({
                success: false,
                message: 'No autenticado.'
            });
        }

        // Subir a Firebase Storage
        const ext      = path.extname(req.file.originalname).toLowerCase() || '.jpg';
        const filename = `photos/photo_${userId}_${Date.now()}${ext}`;
        const bucket   = admin.storage().bucket();
        const fileRef  = bucket.file(filename);

        await fileRef.save(req.file.buffer, {
            metadata: { contentType: req.file.mimetype },
            public: true
        });

        const photoURL = `https://storage.googleapis.com/${bucket.name}/${filename}`;
        console.log(`   📎 Nueva URL: ${photoURL}`);

        // Borrar la foto anterior de Firebase Storage si existe
        const userBefore = await User.findById(userId).select('photoURL avatar');
        const oldURL = userBefore?.photoURL || userBefore?.avatar;
        if (oldURL && oldURL.includes('storage.googleapis.com')) {
            const oldPath = oldURL.split(`${bucket.name}/`)[1];
            if (oldPath) {
                try {
                    await bucket.file(oldPath).delete();
                    console.log(`   🗑️ Foto anterior eliminada: ${oldPath}`);
                } catch (_) {}
            }
        }

        // Actualizar photoURL y avatar en MongoDB
        const user = await User.findByIdAndUpdate(
            userId,
            { photoURL, avatar: photoURL },
            { new: true, select: 'email firstName lastName photoURL avatar' }
        );

        console.log(`   ✅ Foto actualizada para: ${user.email}`);

        return res.json({
            success:  true,
            message:  'Foto actualizada correctamente.',
            photoURL: user.photoURL,
            user
        });

    } catch (err) {
        console.error('❌ Error al subir foto:', err);
        return res.status(500).json({
            success: false,
            message: 'Error interno al guardar la foto.'
        });
    }
});


// ── DELETE /api/users/photo  →  Eliminar foto ────────────────────────────────
router.delete('/', protect, async (req, res) => {
    try {
        console.log('🗑️ DELETE /api/users/photo - Eliminando foto...');

        const userId = req.user?._id || req.user?.id;
        if (!userId) {
            return res.status(401).json({
                success: false,
                message: 'No autenticado.'
            });
        }

        const user = await User.findById(userId).select('photoURL avatar');
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'Usuario no encontrado.'
            });
        }

        // Borrar archivo de Firebase Storage
        const oldURL = user.photoURL || user.avatar;
        if (oldURL && oldURL.includes('storage.googleapis.com')) {
            const bucket  = admin.storage().bucket();
            const oldPath = oldURL.split(`${bucket.name}/`)[1];
            if (oldPath) {
                try {
                    await bucket.file(oldPath).delete();
                    console.log(`   🗑️ Archivo eliminado: ${oldPath}`);
                } catch (_) {}
            }
        }

        // Limpiar campos en MongoDB
        await User.findByIdAndUpdate(userId, {
            $unset: { photoURL: '', avatar: '' }
        });

        console.log(`   ✅ Foto eliminada para usuario: ${userId}`);

        return res.json({
            success: true,
            message: 'Foto eliminada correctamente.'
        });

    } catch (err) {
        console.error('❌ Error al eliminar foto:', err);
        return res.status(500).json({
            success: false,
            message: 'Error interno al eliminar la foto.'
        });
    }
});

module.exports = router;