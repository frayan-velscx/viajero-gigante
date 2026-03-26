// =============================================
// CONTROLADOR DE RESERVAS - GIGANTE VIAJERO
// ✅ Validación de disponibilidad por cabaña específica
// =============================================

const Booking = require('../models/Booking');
const logger  = require('../config/logger');

let Settings;
try {
    Settings = require('../models/Settings');
} catch (e) {
    console.warn('⚠️ Settings model no disponible:', e.message);
}

async function getConfig() {
    const defaults = {
        serviceFeePercentage: 5,
        taxPercentage:        19,
        freeCancelHours:      48,
        partialRefundPercent: 50,
        partialRefundHours:   24
    };
    if (!Settings) return defaults;
    try {
        let cfg = await Settings.findOne({ key: 'global' }).lean();
        if (!cfg) cfg = await Settings.create({ key: 'global' });
        return { ...defaults, ...cfg };
    } catch {
        return defaults;
    }
}

let sendBookingEmails;
try {
    sendBookingEmails = require('../services/emailService').sendBookingEmails;
} catch (e) {
    console.warn('⚠️ emailService no disponible:', e.message);
    sendBookingEmails = null;
}

// =================================================================
// CONSULTAR DISPONIBILIDAD DE UN DESTINO
// GET /api/bookings/availability?destinationId=xxx
//   &accommodationId=yyy   (opcional — filtra por cabaña específica)
//   &entranceOnly=true     (opcional — solo visitas de día)
//   &checkIn=yyyy-mm-dd    (opcional — verifica rango)
//   &checkOut=yyyy-mm-dd   (opcional — verifica rango)
// =================================================================
exports.getAvailability = async (req, res) => {
    try {
        const { destinationId, checkIn, checkOut, accommodationId, entranceOnly } = req.query;

        if (!destinationId) {
            return res.status(400).json({
                success: false,
                message: 'destinationId es requerido'
            });
        }

        const activeStatuses = ['pending', 'confirmed', 'in-progress'];

        // ✅ FILTRO CORREGIDO: distingue cabaña específica vs visita de día
        const filter = {
            'destination.id': destinationId,
            status: { $in: activeStatuses }
        };

        if (accommodationId) {
            // Solo reservas de ESA cabaña concreta — ignora las demás cabañas del mismo destino
            filter['accommodation.id'] = accommodationId;
        } else if (entranceOnly === 'true') {
            // Solo reservas de visita de día (sin alojamiento)
            filter['bookingMode'] = 'entrada';
        }

        const bookings = await Booking.find(filter)
            .select('checkIn checkOut bookingCode accommodation bookingMode')
            .lean();

        const occupiedRanges = bookings.map(b => ({
            checkIn:     b.checkIn,
            checkOut:    b.checkOut,
            bookingCode: b.bookingCode
        }));

        // Verificación opcional si vienen fechas de consulta
        let isAvailable        = true;
        let conflictingBooking = null;

        if (checkIn && checkOut) {
            const reqIn  = new Date(checkIn);
            const reqOut = new Date(checkOut);

            for (const range of occupiedRanges) {
                const bookedIn  = new Date(range.checkIn);
                const bookedOut = new Date(range.checkOut);

                if (reqIn < bookedOut && reqOut > bookedIn) {
                    isAvailable        = false;
                    conflictingBooking = range.bookingCode;
                    break;
                }
            }
        }

        return res.status(200).json({
            success: true,
            data: {
                destinationId,
                accommodationId: accommodationId || null,
                entranceOnly:    entranceOnly === 'true',
                isAvailable,
                conflictingBooking,
                occupiedRanges
            }
        });

    } catch (error) {
        logger.error('❌ Error al consultar disponibilidad:', error);
        res.status(500).json({ success: false, message: 'Error al consultar disponibilidad' });
    }
};

// =================================================================
// CREAR NUEVA RESERVA
// POST /api/bookings
// =================================================================
exports.createBooking = async (req, res) => {
    try {
        const bookingData = req.body;

        // 1. Validar datos requeridos
        if (!bookingData.serviceType || !bookingData.destination || !bookingData.personalInfo) {
            return res.status(400).json({
                success: false,
                message: 'Faltan datos obligatorios para la reserva'
            });
        }

        // 2. Código de reserva
        if (!bookingData.bookingCode) {
            bookingData.bookingCode = generateBookingCode();
        }
        bookingData.status    = bookingData.status || 'pending';
        bookingData.createdAt = new Date();

        // 3. Aplicar tarifa de servicio e IVA desde Settings
        const cfg = await getConfig();

        if (bookingData.pricing) {
            const base   = bookingData.pricing.subtotal || bookingData.pricing.total || 0;
            const feeAmt = Math.round(base * cfg.serviceFeePercentage / 100);
            const taxAmt = Math.round((base + feeAmt) * cfg.taxPercentage / 100);
            const total  = base + feeAmt + taxAmt;

            bookingData.pricing = {
                ...bookingData.pricing,
                serviceFee:           feeAmt,
                serviceFeePercentage: cfg.serviceFeePercentage,
                tax:                  taxAmt,
                taxPercentage:        cfg.taxPercentage,
                total
            };
        }

        // ✅ 3.5 — Validar disponibilidad filtrando por cabaña específica
        if (bookingData.destination?.id && bookingData.checkIn && bookingData.checkOut) {
            const reqIn  = new Date(bookingData.checkIn);
            const reqOut = new Date(bookingData.checkOut);

            // ✅ FILTRO CORREGIDO: si hay accommodation, valida solo esa cabaña
            const conflictFilter = {
                'destination.id': bookingData.destination.id,
                status: { $in: ['pending', 'confirmed', 'in-progress'] },
                $and: [
                    { checkIn:  { $lt: reqOut } },
                    { checkOut: { $gt: reqIn  } }
                ]
            };

            if (bookingData.accommodation?.id) {
                // Reserva de cabaña — valida solo ESA cabaña
                conflictFilter['accommodation.id'] = bookingData.accommodation.id;
            } else {
                // Visita de día — valida solo reservas de entrada del mismo destino
                conflictFilter['bookingMode'] = 'entrada';
            }

            const conflict = await Booking.findOne(conflictFilter)
                .select('bookingCode checkIn checkOut accommodation')
                .lean();

            if (conflict) {
                const conflictIn  = new Date(conflict.checkIn).toLocaleDateString('es-CO');
                const conflictOut = new Date(conflict.checkOut).toLocaleDateString('es-CO');
                const accomName   = conflict.accommodation?.nombre || bookingData.destination.name;

                logger.warn('⚠️ Conflicto de fechas detectado', {
                    destination:     bookingData.destination.id,
                    accommodation:   bookingData.accommodation?.id || 'entrada',
                    requested:       `${reqIn.toLocaleDateString('es-CO')} → ${reqOut.toLocaleDateString('es-CO')}`,
                    conflictingCode: conflict.bookingCode
                });

                return res.status(409).json({
                    success: false,
                    message: `"${accomName}" ya está reservado del ${conflictIn} al ${conflictOut}. Por favor elige otras fechas.`,
                    conflict: {
                        bookingCode: conflict.bookingCode,
                        checkIn:     conflict.checkIn,
                        checkOut:    conflict.checkOut
                    }
                });
            }
        }

        // 4. Guardar reserva
        const booking = new Booking(bookingData);
        await booking.save();

        logger.info('✅ Reserva creada', {
            bookingCode:   bookingData.bookingCode,
            email:         bookingData.personalInfo.email,
            destination:   bookingData.destination.name,
            accommodation: bookingData.accommodation?.nombre || 'entrada',
            total:         bookingData.pricing?.total
        });

        // 5. Responder al cliente inmediatamente
        res.status(201).json({
            success: true,
            message: 'Reserva creada exitosamente',
            data: {
                bookingCode: bookingData.bookingCode,
                booking
            }
        });

       // 6. Emails en segundo plano
console.log('🔍 sendBookingEmails disponible:', !!sendBookingEmails);

if (sendBookingEmails) {
    const itinerary = generateItinerary(bookingData);
    console.log('📤 Intentando enviar email a:', bookingData.personalInfo.email);
    
    sendBookingEmails(bookingData, itinerary)
        .then(r => {
            console.log('📧 Resultado emails:', JSON.stringify(r));
        })
        .catch(err => {
            console.error('❌ Error emails completo:', err);
        });
} else {
    console.error('❌ emailService NO está cargado — revisa la importación');
}

    } catch (error) {
        logger.error('❌ Error al crear reserva:', error);
        res.status(500).json({
            success: false,
            message: 'Error al procesar la reserva',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

// =================================================================
// OBTENER TODAS LAS RESERVAS (Admin)
// GET /api/bookings
// =================================================================
exports.getAllBookings = async (req, res) => {
    try {
        const { status, serviceType, page = 1, limit = 10 } = req.query;

        const query = {};
        if (status)      query.status      = status;
        if (serviceType) query.serviceType = serviceType;

        const bookings = await Booking.find(query)
            .sort({ createdAt: -1 })
            .limit(limit * 1)
            .skip((page - 1) * limit)
            .exec();

        const count = await Booking.countDocuments(query);

        res.status(200).json({
            success:       true,
            data:          bookings,
            totalPages:    Math.ceil(count / limit),
            currentPage:   page,
            totalBookings: count
        });
    } catch (error) {
        logger.error('❌ Error al obtener reservas:', error);
        res.status(500).json({ success: false, message: 'Error al obtener reservas' });
    }
};

// =================================================================
// OBTENER RESERVA POR CÓDIGO
// GET /api/bookings/:bookingCode
// =================================================================
exports.getBookingByCode = async (req, res) => {
    try {
        const booking = await Booking.findOne({ bookingCode: req.params.bookingCode });
        if (!booking) {
            return res.status(404).json({ success: false, message: 'Reserva no encontrada' });
        }
        res.status(200).json({ success: true, data: booking });
    } catch (error) {
        logger.error('❌ Error al obtener reserva:', error);
        res.status(500).json({ success: false, message: 'Error al obtener reserva' });
    }
};

// =================================================================
// OBTENER RESERVAS POR EMAIL
// GET /api/bookings/user/:email
// =================================================================
exports.getBookingsByEmail = async (req, res) => {
    try {
        const bookings = await Booking.find({ 'personalInfo.email': req.params.email })
            .sort({ createdAt: -1 })
            .exec();
        res.status(200).json({ success: true, data: bookings, count: bookings.length });
    } catch (error) {
        logger.error('❌ Error al obtener reservas del usuario:', error);
        res.status(500).json({ success: false, message: 'Error al obtener reservas' });
    }
};

// =================================================================
// CANCELAR RESERVA
// PATCH /api/bookings/:bookingCode/cancel
// =================================================================
exports.cancelBooking = async (req, res) => {
    try {
        const { bookingCode } = req.params;
        const { reason }      = req.body;

        const booking = await Booking.findOne({ bookingCode });
        if (!booking) {
            return res.status(404).json({ success: false, message: 'Reserva no encontrada' });
        }
        if (booking.status === 'cancelled') {
            return res.status(400).json({ success: false, message: 'Esta reserva ya ha sido cancelada' });
        }

        const cfg = await getConfig();
        const freeCancelHours      = cfg.freeCancelHours;
        const partialRefundPercent = cfg.partialRefundPercent;
        const partialRefundHours   = cfg.partialRefundHours;

        const hoursUntilCheckIn = (new Date(booking.checkIn) - new Date()) / (1000 * 60 * 60);

        let refundPercentage = 0;
        if      (hoursUntilCheckIn >= freeCancelHours)    refundPercentage = 100;
        else if (hoursUntilCheckIn >= partialRefundHours) refundPercentage = partialRefundPercent;

        booking.status       = 'cancelled';
        booking.cancellation = {
            date:             new Date(),
            reason:           reason || 'No especificada',
            refundPercentage,
            policyApplied: {
                freeCancelHours,
                partialRefundPercent,
                partialRefundHours,
                hoursUntilCheckIn: Math.round(hoursUntilCheckIn * 10) / 10
            }
        };
        await booking.save();

        res.status(200).json({
            success: true,
            message: 'Reserva cancelada exitosamente',
            data: {
                bookingCode,
                refundPercentage,
                refundAmount:  (booking.pricing.total * refundPercentage) / 100,
                policyApplied: booking.cancellation.policyApplied
            }
        });
    } catch (error) {
        logger.error('❌ Error al cancelar reserva:', error);
        res.status(500).json({ success: false, message: 'Error al cancelar reserva' });
    }
};

// =================================================================
// ACTUALIZAR ESTADO (Admin)
// PATCH /api/bookings/:bookingCode/status
// =================================================================
exports.updateBookingStatus = async (req, res) => {
    try {
        const { bookingCode } = req.params;
        const { status }      = req.body;

        const validStatuses = ['pending', 'confirmed', 'in-progress', 'completed', 'cancelled'];
        if (!validStatuses.includes(status)) {
            return res.status(400).json({ success: false, message: 'Estado inválido' });
        }

        const booking = await Booking.findOneAndUpdate(
            { bookingCode },
            { status, updatedAt: new Date() },
            { new: true }
        );
        if (!booking) {
            return res.status(404).json({ success: false, message: 'Reserva no encontrada' });
        }

        res.status(200).json({
            success: true,
            message: 'Estado actualizado exitosamente',
            data:    booking
        });
    } catch (error) {
        logger.error('❌ Error al actualizar estado:', error);
        res.status(500).json({ success: false, message: 'Error al actualizar estado' });
    }
};

// =================================================================
// FUNCIONES AUXILIARES
// =================================================================
function generateBookingCode() {
    const year   = new Date().getFullYear();
    const random = Math.floor(Math.random() * 9000) + 1000;
    return `GV-${year}-${random}`;
}

function generateItinerary(bookingData) {
    const { destination, nights } = bookingData;

    const itineraries = {
        'parque-1': [{
            day: 1, title: 'Bienvenida y Exploración',
            activities: [
                { time: '09:00 AM', description: 'Check-in y bienvenida' },
                { time: '10:00 AM', description: 'Recorrido por senderos ecológicos' },
                { time: '12:00 PM', description: 'Almuerzo en restaurante del parque' },
                { time: '02:00 PM', description: 'Atracciones acuáticas y piscinas' },
                { time: '05:00 PM', description: 'Cine acuático' },
                { time: '07:00 PM', description: 'Cena y descanso' }
            ],
            meals: { breakfast: false, lunch: true, dinner: true }
        }],
        'mirador-1': [{
            day: 1, title: 'Aventura en las Alturas',
            activities: [
                { time: '08:00 AM', description: 'Llegada al mirador' },
                { time: '08:30 AM', description: 'Deslizador de 210 metros' },
                { time: '10:00 AM', description: 'Columpio sobre el barranco' },
                { time: '11:00 AM', description: 'Sesión de fotos en La Mano' },
                { time: '12:30 PM', description: 'Almuerzo con vista panorámica' }
            ],
            meals: { breakfast: false, lunch: true, dinner: false }
        }],
        'glamping-1': [{
            day: 1, title: 'Conexión con la Naturaleza',
            activities: [
                { time: '02:00 PM', description: 'Check-in en glamping' },
                { time: '04:00 PM', description: 'Caminata por bosque de pinos' },
                { time: '06:00 PM', description: 'Fogata y asado nocturno' },
                { time: '08:00 PM', description: 'Observación de estrellas' }
            ],
            meals: { breakfast: false, lunch: false, dinner: true }
        }],
        'hospedaje-1': [{
            day: 1, title: 'Bienvenida a la Ruta del Café',
            activities: [
                { time: '02:00 PM', description: 'Check-in en cabaña de lujo' },
                { time: '03:30 PM', description: 'Tour por plantación de café' },
                { time: '07:00 PM', description: 'Cena gourmet con productos locales' }
            ],
            meals: { breakfast: false, lunch: false, dinner: true }
        }]
    };

    const found = itineraries[destination?.id];
    if (found) return found.slice(0, Math.min((nights || 1) + 1, found.length));

    return [{
        day: 1, title: `Primer Día en ${destination?.name || 'el destino'}`,
        activities: [
            { time: '02:00 PM', description: 'Check-in y bienvenida' },
            { time: '05:00 PM', description: 'Actividades recreativas' },
            { time: '07:00 PM', description: 'Cena y descanso' }
        ],
        meals: { breakfast: false, lunch: false, dinner: true }
    }];
}

module.exports = exports;