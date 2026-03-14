// =============================================
// MIDDLEWARE DE AUTENTICACIÓN - TECHSTORE PRO
// =============================================

const jwt = require('jsonwebtoken');
const User = require('../models/User');
const admin = require('../config/firebase');


// =============================================
// MIDDLEWARE: PROTECT - VERIFICAR TOKEN JWT O FIREBASE
// =============================================

/**
 * Middleware para proteger rutas que requieren autenticación
 *
 * Soporta DOS tipos de token:
 *
 * 1. JWT propio → generado por tu backend al hacer login normal
 *    Header: Authorization: Bearer <jwt_token>
 *
 * 2. Token de Firebase → generado por Google al hacer login con Google
 *    Header: Authorization: Bearer <firebase_id_token>
 *    (guardado en localStorage como 'gigante_token')
 *
 * Flujo:
 *  - Intenta verificar como JWT propio primero
 *  - Si falla, intenta verificar como token de Firebase
 *  - Si el usuario de Google no existe en MongoDB, lo crea automáticamente
 *  - Agrega req.user y llama next()
 */
const protect = async (req, res, next) => {
    let token;

    console.log('🔒 Middleware protect: Verificando autenticación...');

    // =============================================
    // PASO 1: BUSCAR TOKEN EN HEADERS O COOKIES
    // =============================================

    if (
        req.headers.authorization &&
        req.headers.authorization.startsWith('Bearer')
    ) {
        token = req.headers.authorization.split(' ')[1];
        console.log('   ✅ Token encontrado en header (Bearer)');
    } else if (req.headers.authorization) {
        token = req.headers.authorization;
        console.log('   ✅ Token encontrado en header (directo)');
    }

    if (!token && req.cookies && req.cookies.token) {
        token = req.cookies.token;
        console.log('   ✅ Token encontrado en cookies');
    }

    // =============================================
    // PASO 2: VERIFICAR QUE EXISTE EL TOKEN
    // =============================================

    if (!token) {
        console.log('   ❌ No se encontró token');
        return res.status(401).json({
            success: false,
            error: 'No autorizado',
            message: 'No se proporcionó token de autenticación',
            hint: 'Incluye el token en el header: Authorization: Bearer <token>'
        });
    }

    // =============================================
    // PASO 3A: INTENTAR JWT PROPIO (login normal)
    // =============================================

    try {
        console.log('   🔍 Intentando verificar como JWT propio...');

        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        console.log('   ✅ Token JWT válido');
        console.log(`   👤 Usuario ID: ${decoded.id}`);
        console.log(`   📧 Email: ${decoded.email}`);
        console.log(`   🎭 Rol: ${decoded.role}`);

        const user = await User.findById(decoded.id).select('-password');

        if (!user) {
            console.log('   ❌ Usuario no encontrado en BD');
            return res.status(401).json({
                success: false,
                error: 'Usuario no encontrado',
                message: 'El usuario del token no existe'
            });
        }

        if (!user.isActive) {
            console.log('   ❌ Cuenta desactivada');
            return res.status(401).json({
                success: false,
                error: 'Cuenta desactivada',
                message: 'Tu cuenta ha sido desactivada. Contacta soporte.'
            });
        }

        if (user.isLocked) {
            console.log('   🔒 Cuenta bloqueada temporalmente');
            return res.status(401).json({
                success: false,
                error: 'Cuenta bloqueada',
                message: 'Cuenta bloqueada por seguridad. Intenta más tarde.'
            });
        }

        console.log('   ✅ Autenticación JWT exitosa');
        console.log(`   📝 req.user establecido para: ${user.email}`);

        req.user = user;
        return next();

    } catch (jwtError) {

        // JWT falló — puede ser token de Firebase, no un error real todavía
        console.log(`   ⚠️ No es JWT propio (${jwtError.name}), intentando Firebase...`);

        // =============================================
        // PASO 3B: INTENTAR TOKEN DE FIREBASE (login con Google)
        // =============================================

        try {
            console.log('   🔍 Verificando token con Firebase Admin SDK...');

            const decoded = await admin.auth().verifyIdToken(token);

            console.log('   ✅ Token de Firebase válido');
            console.log(`   📧 Email: ${decoded.email}`);
            console.log(`   👤 UID: ${decoded.uid}`);
            console.log(`   🔑 Proveedor: ${decoded.firebase?.sign_in_provider}`);

            // Buscar usuario en MongoDB por email
            let user = await User.findOne({ email: decoded.email }).select('-password');

            if (!user) {
                // Primera vez que entra con Google → crear usuario automáticamente
                console.log('   🆕 Usuario de Google no existe, creando en MongoDB...');

                const nameParts = (decoded.name || 'Usuario Google').split(' ');
                const firstName = nameParts[0] || 'Usuario';
                const lastName = nameParts.slice(1).join(' ') || '';

                user = await User.create({
                    firstName,
                    lastName,
                    email: decoded.email,
                    photoURL: decoded.picture || '',
                    isActive: true,
                    role: 'customer',
                    authProvider: 'google',
                    firebaseUid: decoded.uid,
                    // Sin password — entró con Google
                    password: require('crypto').randomBytes(32).toString('hex')
                });

                console.log(`   ✅ Usuario creado: ${user.email}`);
            } else {
                console.log(`   ✅ Usuario de Google encontrado: ${user.email}`);

                // Actualizar firebaseUid si no lo tenía
                if (!user.firebaseUid) {
                    await User.findByIdAndUpdate(user._id, {
                        firebaseUid: decoded.uid,
                        authProvider: 'google'
                    });
                }
            }

            if (!user.isActive) {
                console.log('   ❌ Cuenta desactivada');
                return res.status(401).json({
                    success: false,
                    error: 'Cuenta desactivada',
                    message: 'Tu cuenta ha sido desactivada. Contacta soporte.'
                });
            }

            console.log('   ✅ Autenticación Firebase exitosa');
            console.log(`   📝 req.user establecido para: ${user.email}`);

            req.user = user;
            return next();

        } catch (firebaseError) {

            // =============================================
            // PASO 4: AMBOS FALLARON — TOKEN INVÁLIDO
            // =============================================

            console.log(`   ❌ Token inválido (ni JWT ni Firebase)`);
            console.log(`   JWT error: ${jwtError.name} - ${jwtError.message}`);
            console.log(`   Firebase error: ${firebaseError.message}`);

            // Mensajes específicos según el error JWT original
            if (jwtError.name === 'TokenExpiredError') {
                return res.status(401).json({
                    success: false,
                    error: 'Token expirado',
                    message: 'Tu sesión ha expirado. Por favor inicia sesión nuevamente.',
                    expiredAt: jwtError.expiredAt
                });
            }

            if (jwtError.name === 'NotBeforeError') {
                return res.status(401).json({
                    success: false,
                    error: 'Token no válido aún',
                    message: 'Token no es válido todavía'
                });
            }

            return res.status(401).json({
                success: false,
                error: 'Token inválido',
                message: 'El token proporcionado no es válido',
                hint: 'Obtén un nuevo token haciendo login'
            });
        }
    }
};

// =============================================
// MIDDLEWARE: AUTHORIZE - VERIFICAR ROLES
// =============================================

const authorize = (...roles) => {
    return (req, res, next) => {
        console.log('🔐 Middleware authorize: Verificando permisos...');

        if (!req.user) {
            console.log('   ❌ No hay usuario autenticado (protect no ejecutado)');
            return res.status(401).json({
                success: false,
                error: 'No autenticado',
                message: 'Debes iniciar sesión para realizar esta acción'
            });
        }

        console.log(`   👤 Usuario: ${req.user.email}`);
        console.log(`   🎭 Rol actual: ${req.user.role}`);
        console.log(`   📋 Roles permitidos: ${roles.join(', ')}`);

        if (!roles.includes(req.user.role)) {
            console.log('   ❌ Rol insuficiente');
            return res.status(403).json({
                success: false,
                error: 'Acceso denegado',
                message: `Esta acción requiere rol de ${roles.join(' o ')}`,
                userRole: req.user.role,
                requiredRoles: roles
            });
        }

        console.log('   ✅ Permiso concedido');
        next();
    };
};

// =============================================
// EXPORTAR MIDDLEWARE
// =============================================

module.exports = { protect, authorize };


/**
 * EJEMPLO DE USO EN RUTAS:
 *
 * Sin protección:
 * router.get('/products', getAllProducts);
 *
 * Con protección (acepta login normal Y login con Google):
 * router.get('/profile', protect, getProfile);
 *
 * Con protección y autorización:
 * router.post('/products', protect, authorize('admin'), createProduct);
 */