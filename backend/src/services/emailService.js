// =============================================
// services/emailService.js  –  Gigante Viajero
// =============================================

const logger      = require('../config/logger');
const { transporter } = require('../config/Nodemailer');

const fmt     = (n) => new Intl.NumberFormat('es-CO').format(Math.round(n || 0));
const fmtDate = (d) => d ? new Date(d).toLocaleDateString('es-CO', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '--';

// =================================================================
// FUNCIÓN PRINCIPAL — llamada desde BookingController
// =================================================================
exports.sendBookingEmails = async (bookingData, itinerary) => {
    try {
        const confirmationResult = await sendConfirmationEmail(bookingData);
        const itineraryResult    = itinerary?.length > 0
            ? await sendItineraryEmail(bookingData, itinerary)
            : { success: false, skipped: true };

        return { confirmation: confirmationResult, itinerary: itineraryResult };

    } catch (error) {
        logger.error('❌ Error en emailService:', error);
        return {
            confirmation: { success: false, error: error.message },
            itinerary:    { success: false, error: error.message }
        };
    }
};

// =================================================================
// EMAIL 1 — Confirmación de reserva
// =================================================================
async function sendConfirmationEmail(bookingData) {
    const {
        bookingCode, destination, checkIn, checkOut, nights,
        numPeople, pricing, bookingMode, accommodation, personalInfo
    } = bookingData;

    try {
        const modeLine  = bookingMode === 'entrada' ? '🎟️ Visita de día' : '🏡 Alojamiento';
        const firstName = personalInfo?.fullName?.split(' ')[0] || 'viajero';

        const accomRow = accommodation?.nombre ? `
            <tr style="background:#f9fafb;">
                <td style="padding:12px;color:#6b7280;">Alojamiento</td>
                <td style="padding:12px;font-weight:700;">${accommodation.nombre}</td>
            </tr>` : '';

        const nequiNumber = destination?.nequiNumber || '';
        const nequiBlock  = nequiNumber ? `
        <div style="background:#f0fdf4;border:2px solid #86efac;border-radius:12px;padding:20px;margin-bottom:24px;">
            <p style="font-weight:700;color:#195C33;margin:0 0 8px;">📱 Instrucciones de Pago por Nequi</p>
            <p style="font-size:13px;color:#166534;margin:0 0 12px;">Transfiere el total para confirmar tu reserva:</p>
            <div style="background:white;border:2px solid #195C33;border-radius:10px;padding:14px;text-align:center;margin-bottom:12px;">
                <div style="font-size:11px;color:#6b7280;font-weight:600;text-transform:uppercase;letter-spacing:1px;margin-bottom:4px;">Número Nequi</div>
                <div style="font-size:26px;font-weight:900;color:#195C33;letter-spacing:3px;font-family:monospace;">${nequiNumber}</div>
            </div>
            <ol style="font-size:13px;color:#166534;margin:0;padding-left:20px;line-height:2.2;">
                <li>Abre Nequi → <strong>"Enviar plata"</strong> → número <strong style="font-family:monospace;">${nequiNumber}</strong></li>
                <li>Monto exacto: <strong>$${fmt(pricing?.total)} COP</strong></li>
                <li>Escribe en el mensaje: <strong>${bookingCode}</strong></li>
                <li>Envía captura del comprobante por WhatsApp al sitio</li>
            </ol>
        </div>` : '';

        const html = `
        <div style="font-family:Inter,Arial,sans-serif;max-width:600px;margin:0 auto;background:#ffffff;">

          <div style="background:linear-gradient(135deg,#195C33,#0d3d20);padding:40px 32px;text-align:center;border-radius:16px 16px 0 0;">
            <div style="font-size:52px;margin-bottom:12px;">✅</div>
            <h1 style="color:white;font-size:28px;font-weight:800;margin:0 0 8px;">¡Reserva Registrada!</h1>
            <p style="color:rgba(255,255,255,.85);font-size:15px;margin:0;">Gigante Viajero · Gigante, Huila</p>
          </div>

          <div style="padding:32px;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 16px 16px;">

            <p style="font-size:16px;color:#374151;margin:0 0 24px;">
                Hola <strong>${firstName}</strong>, tu reserva ha sido registrada exitosamente.
            </p>

            <div style="background:linear-gradient(135deg,#F4C400,#FFE347);padding:20px;border-radius:14px;text-align:center;margin-bottom:28px;">
              <p style="font-size:12px;color:#195C33;font-weight:700;margin:0 0 6px;text-transform:uppercase;letter-spacing:1.5px;">Código de Reserva</p>
              <p style="font-size:30px;font-weight:900;color:#195C33;font-family:monospace;letter-spacing:3px;margin:0;">${bookingCode}</p>
              <p style="font-size:12px;color:#195C33;margin:8px 0 0;opacity:.8;">Guarda este código para gestionar tu reserva</p>
            </div>

            <h3 style="font-size:16px;font-weight:700;color:#195C33;margin:0 0 14px;">📋 Detalles de tu reserva</h3>
            <table style="width:100%;border-collapse:collapse;font-size:14px;margin-bottom:28px;border-radius:12px;overflow:hidden;border:1px solid #e5e7eb;">
              <tr><td style="padding:12px;color:#6b7280;width:42%;">Destino</td><td style="padding:12px;font-weight:700;">${destination?.name || ''}</td></tr>
              <tr style="background:#f9fafb;"><td style="padding:12px;color:#6b7280;">Tipo de visita</td><td style="padding:12px;font-weight:600;">${modeLine}</td></tr>
              ${accomRow}
              <tr><td style="padding:12px;color:#6b7280;">Fecha de entrada</td><td style="padding:12px;font-weight:600;">${fmtDate(checkIn)}</td></tr>
              <tr style="background:#f9fafb;"><td style="padding:12px;color:#6b7280;">Fecha de salida</td><td style="padding:12px;font-weight:600;">${fmtDate(checkOut)}</td></tr>
              <tr><td style="padding:12px;color:#6b7280;">Noches</td><td style="padding:12px;font-weight:600;">${nights}</td></tr>
              <tr style="background:#f9fafb;"><td style="padding:12px;color:#6b7280;">Personas</td><td style="padding:12px;font-weight:600;">${numPeople}</td></tr>
              <tr style="border-top:2px solid #195C33;">
                <td style="padding:14px 12px;font-weight:700;color:#195C33;font-size:15px;">💰 Total a pagar</td>
                <td style="padding:14px 12px;font-size:22px;font-weight:900;color:#195C33;">$${fmt(pricing?.total)} COP</td>
              </tr>
            </table>

            <div style="background:#f9fafb;border-radius:12px;padding:16px;margin-bottom:24px;font-size:13px;">
              <p style="font-weight:700;color:#374151;margin:0 0 10px;">💳 Desglose de precios</p>
              <div style="display:flex;justify-content:space-between;padding:5px 0;color:#6b7280;"><span>Subtotal</span><span>$${fmt(pricing?.subtotal)} COP</span></div>
              <div style="display:flex;justify-content:space-between;padding:5px 0;color:#6b7280;"><span>Tarifa de servicio (${pricing?.serviceFeePercentage || 5}%)</span><span>$${fmt(pricing?.serviceFee)} COP</span></div>
              <div style="display:flex;justify-content:space-between;padding:5px 0;color:#6b7280;"><span>Impuestos (${pricing?.taxPercentage || 19}%)</span><span>$${fmt(pricing?.tax)} COP</span></div>
              <div style="display:flex;justify-content:space-between;padding:8px 0 0;font-weight:800;color:#195C33;font-size:15px;border-top:1px solid #e5e7eb;margin-top:5px;">
                <span>Total</span><span>$${fmt(pricing?.total)} COP</span>
              </div>
            </div>

            ${nequiBlock}

            <div style="background:#fef3c7;border:1px solid #fcd34d;border-radius:10px;padding:16px;font-size:13px;color:#92400e;line-height:1.7;margin-bottom:24px;">
              ⚠️ <strong>Estado: Pendiente de pago</strong><br>
              Tu reserva quedará confirmada una vez que el sitio verifique tu transferencia Nequi.
            </div>

            <div style="border-top:2px solid #f3f4f6;padding-top:20px;text-align:center;">
              <p style="font-size:13px;color:#6b7280;margin:0 0 6px;">
                ¿Tienes dudas? Escríbenos a
                <a href="mailto:${process.env.EMAIL_USER}" style="color:#195C33;font-weight:600;">${process.env.EMAIL_USER}</a>
              </p>
              <p style="font-size:12px;color:#9ca3af;margin:0;">
                © 2025 Gigante Viajero · Gigante, Huila<br>
                Este correo fue generado automáticamente.
              </p>
            </div>
          </div>
        </div>`;

        await transporter.sendMail({
            from:    `"Gigante Viajero" <${process.env.EMAIL_USER}>`,
            to:      personalInfo.email,
            subject: `✅ Reserva ${bookingCode} — ${destination?.name} | Gigante Viajero`,
            html
        });

        logger.info('📧 Confirmación enviada', { to: personalInfo.email, bookingCode });
        console.log(`📧 Confirmación enviada a: ${personalInfo.email}`);
        return { success: true };

    } catch (error) {
        logger.error('❌ Error enviando confirmación:', error);
        console.error('❌ Error detalle:', error.message);
        return { success: false, error: error.message };
    }
}

// =================================================================
// EMAIL 2 — Itinerario del viaje
// =================================================================
async function sendItineraryEmail(bookingData, itinerary) {
    const { bookingCode, destination, checkIn, personalInfo } = bookingData;

    try {
        const firstName = personalInfo?.fullName?.split(' ')[0] || 'viajero';

        const daysHtml = itinerary.map(day => `
            <div style="margin-bottom:20px;border:1px solid #e5e7eb;border-radius:12px;overflow:hidden;">
              <div style="background:linear-gradient(135deg,#195C33,#0d3d20);padding:14px 20px;">
                <p style="color:white;font-weight:700;font-size:15px;margin:0;">Día ${day.day} — ${day.title}</p>
              </div>
              <div style="padding:16px;">
                ${day.activities.map(a => `
                  <div style="display:flex;gap:14px;padding:10px 0;border-bottom:1px solid #f3f4f6;">
                    <span style="font-size:12px;font-weight:700;color:#195C33;min-width:72px;padding-top:2px;">${a.time}</span>
                    <span style="font-size:13px;color:#374151;">${a.description}</span>
                  </div>`).join('')}
                <div style="display:flex;gap:10px;margin-top:12px;flex-wrap:wrap;">
                  ${day.meals?.breakfast ? '<span style="background:#dcfce7;color:#166534;font-size:11px;font-weight:600;padding:4px 10px;border-radius:20px;">🍳 Desayuno</span>' : ''}
                  ${day.meals?.lunch     ? '<span style="background:#dbeafe;color:#1e40af;font-size:11px;font-weight:600;padding:4px 10px;border-radius:20px;">🍽️ Almuerzo</span>'  : ''}
                  ${day.meals?.dinner    ? '<span style="background:#fef3c7;color:#92400e;font-size:11px;font-weight:600;padding:4px 10px;border-radius:20px;">🌙 Cena</span>'        : ''}
                </div>
              </div>
            </div>`).join('');

        const html = `
        <div style="font-family:Inter,Arial,sans-serif;max-width:600px;margin:0 auto;background:#ffffff;">
          <div style="background:linear-gradient(135deg,#195C33,#0d3d20);padding:40px 32px;text-align:center;border-radius:16px 16px 0 0;">
            <div style="font-size:52px;margin-bottom:12px;">🗺️</div>
            <h1 style="color:white;font-size:26px;font-weight:800;margin:0 0 8px;">Tu Itinerario en ${destination?.name}</h1>
            <p style="color:rgba(255,255,255,.85);font-size:14px;margin:0;">Reserva ${bookingCode} · ${fmtDate(checkIn)}</p>
          </div>
          <div style="padding:32px;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 16px 16px;">
            <p style="font-size:15px;color:#374151;margin:0 0 24px;">
                Hola <strong>${firstName}</strong>, aquí tienes tu itinerario sugerido.
            </p>
            ${daysHtml}
            <div style="background:#f0fdf4;border:1px solid #86efac;border-radius:10px;padding:14px;font-size:13px;color:#166534;margin-top:8px;">
              💡 <strong>Consejo:</strong> Las actividades son sugerencias. Consulta al sitio para adaptar el itinerario.
            </div>
            <p style="text-align:center;font-size:12px;color:#9ca3af;margin-top:24px;border-top:1px solid #f3f4f6;padding-top:16px;">
              © 2025 Gigante Viajero · Gigante, Huila
            </p>
          </div>
        </div>`;

        await transporter.sendMail({
            from:    `"Gigante Viajero" <${process.env.EMAIL_USER}>`,
            to:      personalInfo.email,
            subject: `🗺️ Tu itinerario para ${destination?.name} — ${bookingCode}`,
            html
        });

        logger.info('📧 Itinerario enviado', { to: personalInfo.email, bookingCode });
        console.log(`📧 Itinerario enviado a: ${personalInfo.email}`);
        return { success: true };

    } catch (error) {
        logger.error('❌ Error enviando itinerario:', error);
        return { success: false, error: error.message };
    }
}