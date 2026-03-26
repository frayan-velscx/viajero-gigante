// =============================================
// MODELO DE RESERVA — GIGANTE VIAJERO
// ✅ Índice corregido para filtrar por cabaña específica
// =============================================

const mongoose = require('mongoose');

const companionSchema = new mongoose.Schema({
    name:           { type: String, required: true, trim: true },
    documentType:   { type: String, required: true, enum: ['CC', 'CE', 'PA', 'TI'] },
    documentNumber: { type: String, required: true, trim: true }
}, { _id: false });

const accommodationSchema = new mongoose.Schema({
    id:              { type: String },
    nombre:          { type: String },
    tipo:            { type: String, enum: ['cabaña', 'glamping'] },
    capacidadMax:    { type: Number },
    incluyeDesayuno: { type: Boolean, default: false },
    precio:          { type: Number },
    amenidades:      [{ type: String }]
}, { _id: false });

const bookingSchema = new mongoose.Schema({
    bookingCode: { type: String, required: true, unique: true, trim: true, index: true },

    serviceType: {
        type: String,
        required: [true, 'El tipo de servicio es requerido'],
        enum: ['parque', 'mirador', 'glamping', 'hospedaje'],
        lowercase: true
    },

    bookingMode: {
        type:    String,
        enum:    ['entrada', 'alojamiento'],
        default: 'entrada'
    },

    destination: {
        id:          String,
        name:        { type: String, required: true },
        location:    { type: String, required: true },
        price:       { type: Number, required: true },
        image:       String,
        description: String
    },

    // Detalle del alojamiento (null si es visita de día)
    accommodation: { type: accommodationSchema, default: null },

    checkIn:  { type: Date, required: [true, 'La fecha de entrada es requerida'] },
    checkOut: {
        type: Date,
        required: [true, 'La fecha de salida es requerida'],
        validate: {
            validator: function(v) { return v > this.checkIn; },
            message: 'La fecha de salida debe ser posterior a la fecha de entrada'
        }
    },

    nights:    { type: Number, required: true, min: [1, 'Debe ser al menos 1 noche'] },
    numPeople: { type: String, required: [true, 'El número de personas es requerido'] },

    personalInfo: {
        fullName:       { type: String, required: true, trim: true },
        email:          { type: String, required: true, trim: true, lowercase: true, match: [/^\S+@\S+\.\S+$/, 'Email inválido'] },
        phone:          { type: String, required: true, trim: true },
        documentType:   { type: String, required: true, enum: ['CC', 'CE', 'PA', 'TI'] },
        documentNumber: { type: String, required: true, trim: true },
        comments:       { type: String, trim: true, default: '' }
    },

    companions: [companionSchema],

    emergencyContact: {
        name:  { type: String, required: true, trim: true },
        phone: { type: String, required: true, trim: true }
    },

   paymentMethod: {
    type:     String,
    required: [true, 'El método de pago es requerido'],
    enum:     ['nequi', 'bancolombia'],
    default:  'nequi'
},

    pricing: {
        basePrice:  { type: Number, required: true },
        subtotal:   { type: Number, required: true },
        serviceFee: { type: Number, required: true },
        tax:        { type: Number, required: true },
        total:      { type: Number, required: true }
    },

    status: {
        type:    String,
        enum:    ['pending', 'confirmed', 'in-progress', 'completed', 'cancelled'],
        default: 'confirmed'
    },

    cancellation: {
        date:             Date,
        reason:           String,
        refundPercentage: Number
    },

    newsletter: { type: Boolean, default: false },

    emailsSent: {
        confirmation: { type: Boolean, default: false },
        itinerary:    { type: Boolean, default: false },
        reminder:     { type: Boolean, default: false },
        thankYou:     { type: Boolean, default: false }
    }
}, {
    timestamps: true,
    toJSON:   { virtuals: true },
    toObject: { virtuals: true }
});

// ==================== ÍNDICES ====================
bookingSchema.index({ 'personalInfo.email': 1 });
bookingSchema.index({ status: 1 });
bookingSchema.index({ checkIn: 1 });
bookingSchema.index({ createdAt: -1 });

// ✅ ÍNDICE CORREGIDO: incluye bookingMode para diferenciar
//    entrada (visita de día) vs alojamiento (cabaña/glamping) en la misma query
bookingSchema.index({
    'destination.id':    1,
    'accommodation.id':  1,
    'bookingMode':       1,
    status:              1
});

// ==================== VIRTUALS ====================
bookingSchema.virtual('totalPeople').get(function() {
    return this.companions ? this.companions.length + 1 : 1;
});
bookingSchema.virtual('isActive').get(function() {
    return ['confirmed', 'in-progress'].includes(this.status);
});
bookingSchema.virtual('isAccommodation').get(function() {
    return this.bookingMode === 'alojamiento';
});

// ==================== MÉTODOS ====================
bookingSchema.methods.canCancelWithFullRefund = function() {
    return (new Date(this.checkIn) - new Date()) / (1000 * 60 * 60) >= 48;
};
bookingSchema.methods.getRefundPercentage = function() {
    const h = (new Date(this.checkIn) - new Date()) / (1000 * 60 * 60);
    if (h >= 48) return 100;
    if (h >= 24) return 50;
    return 0;
};

// ==================== HOOKS ====================
bookingSchema.pre('save', function(next) {
    if (this.checkOut <= this.checkIn)
        return next(new Error('La fecha de salida debe ser posterior a la fecha de entrada'));
    next();
});

bookingSchema.pre('save', function(next) {
    if (!this.nights && this.checkIn && this.checkOut) {
        this.nights = Math.ceil(
            Math.abs(new Date(this.checkOut) - new Date(this.checkIn)) / (1000 * 60 * 60 * 24)
        );
    }
    next();
});

bookingSchema.post('save', function(doc) {
    const tipo = doc.bookingMode === 'alojamiento'
        ? `${doc.accommodation?.tipo || 'alojamiento'}: ${doc.accommodation?.nombre || '—'}`
        : 'visita de día';
    console.log(`✅ Reserva guardada: ${doc.bookingCode} — ${doc.personalInfo.fullName} — ${tipo}`);
});

const Booking = mongoose.model('Booking', bookingSchema);
module.exports = Booking;