// =============================================
// CONTROLADOR DE AUTENTICACIÓN - TECHSTORE PRO
// ✨ VERSIÓN CORREGIDA - updateProfile con userId del body
// =============================================

const User = require('../models/User');
const logger = require('../config/logger');



// =============================================
// FUNCIÓN 1: REGISTER - CREAR NUEVA CUENTA
// =============================================

/**
 * @desc    Registrar nuevo usuario
 * @route   POST /api/auth/register
 * @access  Público
 */
const register = async (req, res, next) => {
    try {
        const { firstName, lastName, email, password, phone, role } = req.body;
        
        console.log(`📝 Intento de registro: ${email}`);
        
        // VALIDACIÓN 1: Verificar campos requeridos
        if (!firstName || !lastName || !email || !password) {
            console.log('❌ Faltan campos requeridos');
            return res.status(400).json({
                success: false,
                error: 'Campos requeridos',
                details: 'firstName, lastName, email y password son obligatorios'
            });
        }
        
        // VALIDACIÓN 2: Verificar que el email no esté registrado
        const existingUser = await User.findOne({ email: email.toLowerCase() });
        
        if (existingUser) {
            console.log(`❌ Email ya registrado: ${email}`);
            return res.status(400).json({
                success: false,
                error: 'Email ya registrado',
                message: 'Ya existe una cuenta con este email'
            });
        }
        
        // VALIDACIÓN 3: Solo admin puede crear otros admins
        if (role === 'admin') {
            console.log('⚠️ Intento de crear cuenta admin');
            // Por ahora permitimos, pero en producción verificar auth
            // TODO: Verificar que el usuario que crea sea admin
        }
        
        // CREAR USUARIO
        const user = new User({
            firstName,
            lastName,
            email: email.toLowerCase(),
            password,  // Se hasheará automáticamente con middleware
            phone,
            role: role || 'customer'  // customer por defecto
        });
        
        await user.save();
        console.log(`✅ Usuario creado: ${user.email} (${user.role})`);

        // ✨ Log de auditoría
        if (logger && logger.audit) {
            logger.audit('USER_REGISTERED', {
                userId: user._id,
                email: user.email,
                role: user.role,
                ip: req.ip,
                userAgent: req.get('user-agent')
            });

            logger.info('Usuario creado', { 
                email: user.email, 
                role: user.role 
            });
        }
        
        // GENERAR TOKEN JWT
        const token = user.generateAuthToken();
        
        // OBTENER PERFIL PÚBLICO (sin contraseña)
        const publicProfile = user.getPublicProfile();
        
        console.log(`🎫 Token generado para: ${user.email}`);
        
        // RESPUESTA EXITOSA
        res.status(201).json({
            success: true,
            message: 'Usuario registrado exitosamente',
            token,
            user: publicProfile
        });
        
    } catch (error) {
        console.error(`❌ Error en register: ${error.message}`);
        
        // Errores específicos de validación de Mongoose
        if (error.name === 'ValidationError') {
            const messages = Object.values(error.errors).map(err => err.message);
            return res.status(400).json({
                success: false,
                error: 'Error de validación',
                details: messages
            });
        }
        
        next(error);
    }
};

// =============================================
// FUNCIÓN 2: LOGIN - AUTENTICAR USUARIO
// =============================================

/**
 * @desc    Login de usuario
 * @route   POST /api/auth/login
 * @access  Público
 */
const login = async (req, res, next) => {
    try {
        const { email, password } = req.body;
        
        console.log(`🔐 Intento de login: ${email}`);
        
        // VALIDACIÓN 1: Verificar campos requeridos
        if (!email || !password) {
            console.log('❌ Faltan credenciales');
            return res.status(400).json({
                success: false,
                error: 'Credenciales incompletas',
                message: 'Email y contraseña son requeridos'
            });
        }
        
        // BUSCAR USUARIO (incluye contraseña para verificar)
        const user = await User.findByCredentials(email);
        
        if (!user) {
            console.log(`❌ Usuario no encontrado: ${email}`);
            return res.status(401).json({
                success: false,
                error: 'Credenciales inválidas',
                message: 'Email o contraseña incorrectos'
            });
        }
        
        // VERIFICAR SI LA CUENTA ESTÁ ACTIVA
        if (!user.isActive) {
            console.log(`❌ Cuenta inactiva: ${email}`);
            return res.status(401).json({
                success: false,
                error: 'Cuenta desactivada',
                message: 'Tu cuenta ha sido desactivada. Contacta soporte.'
            });
        }
        
        // VERIFICAR SI LA CUENTA ESTÁ BLOQUEADA
        if (user.isLocked) {
            console.log(`🔒 Cuenta bloqueada: ${email}`);
            return res.status(401).json({
                success: false,
                error: 'Cuenta bloqueada',
                message: 'Demasiados intentos fallidos. Intenta en 30 minutos.'
            });
        }
        
        // COMPARAR CONTRASEÑA
        const isPasswordCorrect = await user.comparePassword(password);
        
        if (!isPasswordCorrect) {
            console.log(`❌ Contraseña incorrecta para: ${email}`);
            
            // Incrementar intentos fallidos
            await user.incrementLoginAttempts();
            
            return res.status(401).json({
                success: false,
                error: 'Credenciales inválidas',
                message: 'Email o contraseña incorrectos'
            });
        }
        
        // LOGIN EXITOSO
        console.log(`✅ Login exitoso: ${user.email} (${user.role})`);
        
        // Resetear intentos fallidos
        await user.resetLoginAttempts();
        
        // GENERAR TOKEN JWT
        const token = user.generateAuthToken();
        
        // ✨ Log de auditoría
        if (logger && logger.audit) {
            logger.audit('USER_LOGIN', {
                userId: user._id,
                email: user.email,
                ip: req.ip,
                userAgent: req.get('user-agent')
            });

            logger.info('Login exitoso', { email: user.email });
        }
        
        // OBTENER PERFIL PÚBLICO
        const publicProfile = user.getPublicProfile();
        
        console.log(`🎫 Token generado para: ${user.email}`);
        
        // RESPUESTA EXITOSA
        res.status(200).json({
            success: true,
            message: 'Login exitoso',
            token,
            user: publicProfile
        });
        
    } catch (error) {
        console.error(`❌ Error en login: ${error.message}`);
        next(error);
    }
};

// =============================================
// FUNCIÓN 3: GET PROFILE - OBTENER PERFIL
// =============================================

/**
 * @desc    Obtener perfil del usuario autenticado
 * @route   GET /api/auth/profile
 * @access  Privado (requiere token)
 */
const getProfile = async (req, res, next) => {
    try {
        // req.user será agregado por middleware de autenticación (Parte 3C3)
        // Por ahora usamos ID de query params para testing
        const userId = req.query.userId || req.user?.id;
        
        if (!userId) {
            return res.status(400).json({
                success: false,
                error: 'ID de usuario requerido',
                message: 'Proporciona userId en query params'
            });
        }
        
        console.log(`👤 Obteniendo perfil: ${userId}`);
        
        // BUSCAR USUARIO
        const user = await User.findById(userId)
            .select('-password');  // Excluir contraseña
        
        if (!user) {
            console.log(`❌ Usuario no encontrado: ${userId}`);
            return res.status(404).json({
                success: false,
                error: 'Usuario no encontrado'
            });
        }
        
        // OBTENER PERFIL PÚBLICO
        const publicProfile = user.getPublicProfile();
        
        console.log(`✅ Perfil obtenido: ${user.email}`);
        
        // RESPUESTA EXITOSA
        res.status(200).json({
            success: true,
            user: publicProfile
        });
        
    } catch (error) {
        console.error(`❌ Error en getProfile: ${error.message}`);
        next(error);
    }
};

// =============================================
// ✨ FUNCIÓN 4: UPDATE PROFILE - ACTUALIZAR PERFIL (CORREGIDA)
// =============================================

/**
 * @desc    Actualizar perfil del usuario
 * @route   PUT /api/auth/profile
 * @access  Privado (requiere token)
 */
const updateProfile = async (req, res, next) => {
    try {
        console.log('📝 Actualizando perfil de usuario...');
        console.log('Body recibido:', req.body);
        
        // ✨ CORREGIDO: Obtener userId del BODY (no de query params)
        const { userId, firstName, lastName, phone, dateOfBirth, gender, avatar, address } = req.body;
        
        // VALIDACIÓN: userId es requerido
        if (!userId) {
            console.error('❌ No se proporcionó userId');
            return res.status(400).json({
                success: false,
                error: 'El ID de usuario es requerido'
            });
        }
        
        console.log(`✏️ Actualizando perfil: ${userId}`);
        
        // CAMPOS PERMITIDOS PARA ACTUALIZAR
        const allowedUpdates = [
            'firstName', 
            'lastName', 
            'phone', 
            'dateOfBirth',
            'gender',
            'avatar',
            'address'
        ];
        
        // FILTRAR SOLO CAMPOS PERMITIDOS
        const updates = {};
        Object.keys(req.body).forEach(key => {
            if (allowedUpdates.includes(key) && req.body[key] !== undefined) {
                updates[key] = req.body[key];
            }
        });
        
        // VALIDAR QUE HAY ALGO QUE ACTUALIZAR
        if (Object.keys(updates).length === 0) {
            console.error('❌ No hay campos para actualizar');
            return res.status(400).json({
                success: false,
                error: 'No hay campos para actualizar',
                allowedFields: allowedUpdates
            });
        }
        
        console.log('📝 Campos a actualizar:', Object.keys(updates));
        
        // ACTUALIZAR USUARIO
        const user = await User.findByIdAndUpdate(
            userId,
            updates,
            { 
                new: true,           // Retornar documento actualizado
                runValidators: true  // Ejecutar validaciones
            }
        );
        
        if (!user) {
            console.error('❌ Usuario no encontrado');
            return res.status(404).json({
                success: false,
                error: 'Usuario no encontrado'
            });
        }
        
        console.log(`✅ Perfil actualizado: ${user.email}`);
        
        // OBTENER PERFIL PÚBLICO ACTUALIZADO
        const publicProfile = user.getPublicProfile();
        
        // RESPUESTA EXITOSA
        res.status(200).json({
            success: true,
            message: 'Perfil actualizado exitosamente',
            user: publicProfile
        });
        
    } catch (error) {
        console.error(`❌ Error en updateProfile: ${error.message}`);
        
        // Errores de validación
        if (error.name === 'ValidationError') {
            const messages = Object.values(error.errors).map(err => err.message);
            return res.status(400).json({
                success: false,
                error: 'Error de validación',
                details: messages
            });
        }
        
        // Error de CastError (ID inválido)
        if (error.name === 'CastError' && error.kind === 'ObjectId') {
            return res.status(400).json({
                success: false,
                error: 'ID de usuario inválido'
            });
        }
        
        next(error);
    }
};
// ============================================
// MAPA TEMPORAL DE CÓDIGOS (en producción usa Redis o MongoDB)
// ============================================
const resetCodes = new Map(); 
// formato: email → { code, expiresAt, attempts }

// ============================================
// FUNCIÓN 5: ENVIAR CÓDIGO DE RESET
// POST /api/auth/send-reset-code
// ============================================
const sendResetCode = async (req, res, next) => {
    try {
        const { email } = req.body;
        if (!email) return res.status(400).json({ message: 'Email requerido' });

        // Verificar que el usuario existe
        const user = await User.findOne({ email: email.toLowerCase() });
        // Respuesta genérica por seguridad (no revelar si existe)
        if (!user) {
            return res.status(200).json({ 
                success: true, 
                message: 'Si el correo existe, recibirás el código.' 
            });
        }

        // Generar código de 6 dígitos
        const code = Math.floor(100000 + Math.random() * 900000).toString();
        const expiresAt = Date.now() + 10 * 60 * 1000; // 10 minutos

        // Guardar en mapa
        resetCodes.set(email.toLowerCase(), { code, expiresAt, attempts: 0 });
        console.log(`🔑 Código generado para ${email}: ${code}`);

        // Enviar correo
        const { sendResetCode: sendEmail } = require('../services/emailService');
        const result = await sendEmail(email, code);

        if (!result.success) {
            console.error('❌ Error enviando email:', result.error);
            return res.status(500).json({ 
                message: 'Error al enviar el correo. Intenta de nuevo.' 
            });
        }

        res.status(200).json({ 
            success: true, 
            message: 'Código enviado correctamente.' 
        });

    } catch (error) {
        console.error('❌ sendResetCode error:', error.message);
        next(error);
    }
};

// ============================================
// FUNCIÓN 6: VERIFICAR CÓDIGO
// POST /api/auth/verify-reset-code
// ============================================
const verifyResetCode = async (req, res, next) => {
    try {
        const { email, code } = req.body;
        if (!email || !code) 
            return res.status(400).json({ message: 'Email y código requeridos' });

        const entry = resetCodes.get(email.toLowerCase());

        if (!entry) 
            return res.status(400).json({ valid: false, message: 'Código no encontrado o expirado.' });

        if (Date.now() > entry.expiresAt) {
            resetCodes.delete(email.toLowerCase());
            return res.status(400).json({ valid: false, message: 'El código ha expirado. Solicita uno nuevo.' });
        }

        if (entry.attempts >= 5) 
            return res.status(400).json({ valid: false, message: 'Demasiados intentos. Solicita un nuevo código.' });

        if (entry.code !== code) {
            entry.attempts++;
            return res.status(400).json({ valid: false, message: 'Código incorrecto.' });
        }

        // Código correcto — marcar como verificado
        entry.verified = true;
        res.status(200).json({ valid: true, message: 'Código verificado.' });

    } catch (error) {
        console.error('❌ verifyResetCode error:', error.message);
        next(error);
    }
};

// ============================================
// FUNCIÓN 7: CAMBIAR CONTRASEÑA
// POST /api/auth/reset-password
// ============================================
const resetPassword = async (req, res, next) => {
    try {
        const { email, newPassword } = req.body;
        if (!email || !newPassword) 
            return res.status(400).json({ message: 'Email y nueva contraseña requeridos' });

        const entry = resetCodes.get(email.toLowerCase());

        if (!entry || !entry.verified) 
            return res.status(400).json({ message: 'Debes verificar el código primero.' });

        if (Date.now() > entry.expiresAt) {
            resetCodes.delete(email.toLowerCase());
            return res.status(400).json({ message: 'Sesión expirada. Inicia el proceso de nuevo.' });
        }

        if (newPassword.length < 8) 
            return res.status(400).json({ message: 'La contraseña debe tener al menos 8 caracteres.' });

        // Actualizar contraseña (el middleware de User la hasheará)
        const user = await User.findOne({ email: email.toLowerCase() });
        if (!user) return res.status(404).json({ message: 'Usuario no encontrado.' });

        user.password = newPassword;
        await user.save();

        // Limpiar código usado
        resetCodes.delete(email.toLowerCase());

        console.log(`✅ Contraseña actualizada para: ${email}`);
        res.status(200).json({ success: true, message: 'Contraseña actualizada exitosamente.' });

    } catch (error) {
        console.error('❌ resetPassword error:', error.message);
        next(error);
    }
};
// =============================================
// EXPORTAR FUNCIONES
// =============================================

module.exports = {
    register,
    login,
    getProfile,
    updateProfile
};
