// =============================================
// RUTAS DE AUTENTICACIÓN - GIGANTE VIAGERO
// ✨ VERSIÓN COMPLETA - Con Google Login → MongoDB
// =============================================

const express    = require('express');
const router     = express.Router();
const bcrypt     = require('bcrypt');
const { transporter } = require('../config/Nodemailer');
const admin      = require('../config/firebase');

const { authLimiter } = require('../middleware/rateLimiter');
const authController  = require('../controllers/authController');
const { verificarToken } = require('../middleware/auth');
const {
    registerValidation,
    loginValidation,
    updateProfileValidation,
    handleValidationErrors
} = require('../validators/authValidators');

const { register, login, getProfile, updateProfile } = require('../controllers/authController');

const User = require('../models/User');

console.log('🔐 Inicializando rutas de autenticación');

// =============================================
// NODEMAILER TRANSPORTER
// =============================================


// =============================================
// STORE DE CÓDIGOS EN MEMORIA
// Map<email, { code, expiresAt, attempts, verified }>
// =============================================

const codesStore   = new Map();
const CODE_EXPIRY  = 10 * 60 * 1000; // 10 minutos
const MAX_ATTEMPTS = 5;

function generateCode() {
    return Math.floor(100000 + Math.random() * 900000).toString();
}

// Limpieza automática cada 15 min
setInterval(() => {
    const now = Date.now();
    for (const [email, data] of codesStore.entries()) {
        if (now > data.expiresAt) codesStore.delete(email);
    }
}, 15 * 60 * 1000);

// =============================================
// RUTAS PÚBLICAS
// =============================================

router.post('/register',
    authLimiter,
    registerValidation,
    handleValidationErrors,
    authController.register
);

router.post('/login',
    authLimiter,
    loginValidation,
    handleValidationErrors,
    authController.login
);

// =============================================
// ✨ NUEVO: LOGIN CON GOOGLE → GUARDA EN MONGODB
// =============================================

/**
 * @route   POST /api/auth/google
 * @desc    Verifica token de Firebase y crea/actualiza usuario en MongoDB
 * @access  Público
 * @body    { idToken: string }
 */
router.post('/google', async (req, res) => {
    try {
        const { idToken } = req.body;

        if (!idToken) {
            return res.status(400).json({
                success: false,
                error: 'Token de Firebase requerido'
            });
        }

        console.log('🔥 Verificando token de Google con Firebase Admin...');

        // 1️⃣ Verificar token con Firebase Admin SDK
        const decodedToken = await admin.auth().verifyIdToken(idToken);
        const { uid, email, name, picture } = decodedToken;

        console.log('✅ Token verificado para:', email);

        // 2️⃣ Separar nombre y apellido del displayName de Google
        const nameParts   = (name || 'Usuario').split(' ');
        const firstName   = nameParts[0] || 'Usuario';
        const lastName    = nameParts.slice(1).join(' ') || '.';

        // 3️⃣ Buscar usuario existente por email o firebaseUid
        let user = await User.findOne({
            $or: [{ email: email.toLowerCase() }, { firebaseUid: uid }]
        });

        if (user) {
            // 🔄 Usuario ya existe → actualizar datos de Google
            console.log('🔄 Usuario existente, actualizando datos de Google...');
            user.firebaseUid     = uid;
            user.photoURL        = picture || user.photoURL;
            user.authProvider    = 'google';
            user.isEmailVerified = true;
            user.lastLogin       = new Date();
            // Actualizar nombre solo si estaba vacío o era genérico
            if (!user.firstName || user.firstName === 'Usuario') user.firstName = firstName;
            if (!user.lastName  || user.lastName  === '.')       user.lastName  = lastName;
            await user.save();
            console.log('✅ Usuario actualizado en MongoDB:', user.email);
        } else {
            // 🆕 Usuario nuevo → crear en MongoDB
            console.log('🆕 Creando nuevo usuario de Google en MongoDB...');
            user = new User({
                firstName,
                lastName,
                email:           email.toLowerCase(),
                firebaseUid:     uid,
                photoURL:        picture || null,
                authProvider:    'google',
                isEmailVerified: true,
                role:            'customer',
                isActive:        true
            });
            await user.save();
            console.log('✅ Nuevo usuario de Google creado en MongoDB:', user.email);
        }

        // 4️⃣ Generar token JWT del backend
        const token = user.generateAuthToken();

        // 5️⃣ Responder con token + perfil público
        return res.status(200).json({
            success: true,
            message: 'Sesión iniciada con Google',
            token,
            user: user.getPublicProfile()
        });

    } catch (error) {
        console.error('❌ Error en /api/auth/google:', error.message);

        if (error.code === 'auth/id-token-expired') {
            return res.status(401).json({ success: false, error: 'Token de Google expirado' });
        }
        if (error.code === 'auth/argument-error' || error.code === 'auth/invalid-id-token') {
            return res.status(401).json({ success: false, error: 'Token de Google inválido' });
        }

        return res.status(500).json({ success: false, error: 'Error al procesar login con Google' });
    }
});

// =============================================
// RUTAS PRIVADAS
// =============================================

router.get('/profile', getProfile);
router.put('/profile', updateProfile);

// =============================================
// RECUPERACIÓN DE CONTRASEÑA CON CÓDIGO
// =============================================

/**
 * @route   POST /api/auth/send-reset-code
 * @desc    Genera y envía un código de 6 dígitos al correo
 * @access  Público
 */
router.post('/send-reset-code', async (req, res) => {
    const email = (req.body.email || '').trim().toLowerCase();

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return res.status(400).json({ message: 'Correo no válido.' });
    }

    const code      = generateCode();
    const expiresAt = Date.now() + CODE_EXPIRY;
    codesStore.set(email, { code, expiresAt, attempts: 0, verified: false });

    const mailOptions = {
        from: `"Gigante Viagero 🌎" <${process.env.MAIL_USER}>`,
        to:   email,
        subject: '🔐 Tu código de recuperación — Gigante Viagero',
        html: `
        <body style="margin:0;padding:0;background:#f3f4f6;font-family:'Segoe UI',Arial,sans-serif;">
          <table width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;padding:40px 20px;">
            <tr><td align="center">
              <table width="540" cellpadding="0" cellspacing="0"
                style="background:white;border-radius:20px;overflow:hidden;box-shadow:0 8px 30px rgba(0,0,0,0.08);">

                <tr>
                  <td style="background:linear-gradient(135deg,#195C33,#0d3d20);padding:36px 40px;text-align:center;">
                    <p style="margin:0;color:white;font-size:26px;font-weight:800;">🌎 Gigante Viagero</p>
                    <p style="margin:8px 0 0;color:rgba(255,255,255,0.75);font-size:14px;">Recuperación de contraseña</p>
                  </td>
                </tr>

                <tr>
                  <td style="padding:44px 48px;">
                    <p style="margin:0 0 12px;color:#1f2937;font-size:17px;font-weight:700;">¡Hola! 👋</p>
                    <p style="margin:0 0 28px;color:#4b5563;font-size:15px;line-height:1.7;">
                      Recibimos una solicitud para restablecer tu contraseña.<br>
                      Ingresa este código en la página de recuperación:
                    </p>

                    <div style="text-align:center;margin:0 0 28px;">
                      <div style="display:inline-block;background:#f0fdf4;border:2px solid #bbf7d0;border-radius:16px;padding:24px 48px;">
                        <p style="margin:0;font-size:52px;font-weight:900;letter-spacing:12px;color:#195C33;font-family:monospace;">${code}</p>
                      </div>
                    </div>

                    <table width="100%" cellpadding="0" cellspacing="0"
                      style="background:#fefce8;border-radius:12px;border:1px solid #fde68a;margin-bottom:24px;">
                      <tr><td style="padding:16px 20px;">
                        <p style="margin:0;color:#92400e;font-size:13px;line-height:1.9;">
                          ⏰ <strong>Este código expira en 10 minutos.</strong><br>
                          🔒 Si no solicitaste este cambio, ignora este correo.<br>
                          🚫 Nunca compartas este código con nadie.
                        </p>
                      </td></tr>
                    </table>

                    <p style="margin:0;color:#9ca3af;font-size:12px;">Este correo es automático, no respondas a este mensaje.</p>
                  </td>
                </tr>

                <tr>
                  <td style="background:#f9fafb;padding:20px 40px;border-top:1px solid #e5e7eb;text-align:center;">
                    <p style="margin:0;color:#9ca3af;font-size:12px;">© ${new Date().getFullYear()} Gigante Viagero — Gigante, Huila, Colombia</p>
                  </td>
                </tr>

              </table>
            </td></tr>
          </table>
        </body>`
    };

    try {
        await transporter.sendMail(mailOptions);
        console.log(`📨 Código enviado a ${email}`);
        return res.json({ ok: true, message: 'Código enviado correctamente.' });
    } catch (err) {
        console.error('Error nodemailer:', err);
        return res.status(500).json({ message: 'No se pudo enviar el correo. Intenta de nuevo.' });
    }
});

/**
 * @route   POST /api/auth/verify-reset-code
 * @desc    Verifica el código de 6 dígitos
 * @access  Público
 */
router.post('/verify-reset-code', (req, res) => {
    const email  = (req.body.email || '').trim().toLowerCase();
    const code   = (req.body.code  || '').trim();
    const stored = codesStore.get(email);

    if (!stored) {
        return res.status(400).json({ valid: false, message: 'No hay código activo. Solicita uno nuevo.' });
    }
    if (Date.now() > stored.expiresAt) {
        codesStore.delete(email);
        return res.status(400).json({ valid: false, message: 'El código ha expirado. Solicita uno nuevo.' });
    }
    if (stored.attempts >= MAX_ATTEMPTS) {
        codesStore.delete(email);
        return res.status(429).json({ valid: false, message: 'Demasiados intentos. Solicita un nuevo código.' });
    }

    if (stored.code !== code) {
        stored.attempts++;
        codesStore.set(email, stored);
        const left = MAX_ATTEMPTS - stored.attempts;
        return res.status(400).json({
            valid: false,
            message: `Código incorrecto. ${left > 0 ? `Te quedan ${left} intentos.` : 'Sin más intentos disponibles.'}`
        });
    }

    stored.verified = true;
    codesStore.set(email, stored);
    console.log(`✅ Código verificado para ${email}`);
    return res.json({ valid: true, message: 'Código verificado.' });
});

/**
 * @route   POST /api/auth/reset-password
 * @desc    Cambia la contraseña en MongoDB
 * @access  Público (protegido por verificación previa del código)
 */
router.post('/reset-password', async (req, res) => {
    const email       = (req.body.email       || '').trim().toLowerCase();
    const newPassword = (req.body.newPassword || '').trim();
    const stored      = codesStore.get(email);

    if (!stored || !stored.verified || Date.now() > stored.expiresAt) {
        return res.status(403).json({ message: 'Sesión expirada o inválida. Empieza el proceso de nuevo.' });
    }

    if (!newPassword || newPassword.length < 8) {
        return res.status(400).json({ message: 'La contraseña debe tener al menos 8 caracteres.' });
    }

    try {
        const user = await User.findOne({ email });

        if (!user) {
            return res.status(404).json({ message: 'No existe una cuenta con ese correo.' });
        }

        const hashedPassword = await bcrypt.hash(newPassword, 10);

        await User.findOneAndUpdate(
            { email },
            { $set: { password: hashedPassword } },
            { new: true }
        );

        codesStore.delete(email);

        console.log(`🔑 Contraseña restablecida en MongoDB para: ${email}`);
        return res.json({ ok: true, message: 'Contraseña actualizada correctamente.' });

    } catch (err) {
        console.error('Error al actualizar contraseña en MongoDB:', err);
        return res.status(500).json({ message: 'Error al cambiar la contraseña. Intenta de nuevo.' });
    }
});

// =============================================
// LOG DE RUTAS CONFIGURADAS
// =============================================

console.log('✅ Rutas de autenticación configuradas:');
console.log('   📝 POST /api/auth/register          - Crear cuenta');
console.log('   🔐 POST /api/auth/login             - Iniciar sesión');
console.log('   🔥 POST /api/auth/google            - Login con Google → MongoDB');
console.log('   👤 GET  /api/auth/profile           - Ver perfil');
console.log('   ✏️  PUT  /api/auth/profile           - Actualizar perfil');
console.log('   📨 POST /api/auth/send-reset-code   - Enviar código');
console.log('   🔢 POST /api/auth/verify-reset-code - Verificar código');
console.log('   🔑 POST /api/auth/reset-password    - Cambiar contraseña');

module.exports = router;