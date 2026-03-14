// =============================================
// CONFIGURACIÓN DE NODEMAILER - GIGANTE VIAJERO
// =============================================

const nodemailer = require('nodemailer');
const logger = require('./logger');

// ─────────────────────────────────────────────
// Crear transporte de email
// ─────────────────────────────────────────────
const createTransport = () => {
    try {

        // Verificar variables de entorno
        if (!process.env.RESEND_API_KEY) {
            throw new Error('❌ Falta RESEND_API_KEY en el .env');
        }

        const transporter = nodemailer.createTransport({
            host: 'smtp.resend.com',
            port: 465,
            secure: true,
            auth: {
                user: 'resend',
                pass: process.env.RESEND_API_KEY
            }
        });

        logger.info('✅ Transporte de email configurado', {
            service: 'Resend',
            from: process.env.EMAIL_FROM
        });

        return transporter;

    } catch (error) {
        logger.error('❌ Error configurando Nodemailer:', error);
        throw error;
    }
};

// ─────────────────────────────────────────────
// Instancia del transporter
// ─────────────────────────────────────────────
const transporter = createTransport();


// ─────────────────────────────────────────────
// Verificar conexión con el servidor de correo
// ─────────────────────────────────────────────
const verifyEmailConfig = async () => {
    try {

        await transporter.verify();

        logger.info('✅ Servidor de correo listo');

        return true;

    } catch (error) {

        logger.error('❌ Error verificando email:', error);

        console.error('  ❌  Email (Resend)  ›  Verificación SMTP fallida');

        return false;
    }
};


// ─────────────────────────────────────────────
// Enviar correo genérico
// ─────────────────────────────────────────────
const sendEmail = async (mailOptions) => {

    try {

        if (!mailOptions.from) {
            mailOptions.from = {
                name: 'Gigante Viajero',
                address: process.env.EMAIL_FROM || 'onboarding@resend.dev'
            };
        }

        const info = await transporter.sendMail(mailOptions);

        logger.info('📧 Email enviado', {
            to: mailOptions.to,
            subject: mailOptions.subject,
            id: info.messageId
        });

        return {
            success: true,
            messageId: info.messageId
        };

    } catch (error) {

        logger.error('❌ Error enviando email:', error);

        return {
            success: false,
            error: error.message
        };
    }
};


// ─────────────────────────────────────────────
// Enviar email con adjuntos
// ─────────────────────────────────────────────
const sendEmailWithAttachments = async (to, subject, html, attachments = []) => {

    const mailOptions = {
        from: {
            name: 'Gigante Viajero',
            address: process.env.EMAIL_FROM || 'onboarding@resend.dev'
        },
        to,
        subject,
        html,
        attachments
    };

    return await sendEmail(mailOptions);
};


// ─────────────────────────────────────────────
// Exportaciones
// ─────────────────────────────────────────────
module.exports = {
    transporter,
    sendEmail,
    sendEmailWithAttachments,
    verifyEmailConfig
};