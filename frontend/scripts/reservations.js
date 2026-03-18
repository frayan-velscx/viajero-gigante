// =============================================
// reservations.js — Gigante Viajero
// VERSIÓN UNIFICADA: cabañas + entradas + disponibilidad por alojamiento
// ✅ ACTUALIZADO: soporte para cuenta bancaria (Bancolombia) en sitios sin Nequi
// =============================================

// ==================== CATÁLOGO DE DESTINOS ====================

const destinationsCatalog = {
    parque: [
        { id: 'parque-1', slug: 'xhimanut-parque-de-los-suenos',    name: 'Xhimanut - Parque de los Sueños',      location: 'Gigante, Huila',               price: 35000,  image: '../assets/img/parque_xhimnaut_123.jpg', description: 'Parque temático con +30 atracciones, cine acuático y senderos ecológicos' },
        { id: 'parque-2', slug: 'los-pinos-parque-agroecoturistico', name: 'Los Pinos - Parque Agroecoturístico',   location: 'Hobo - Gigante',                price: 25000,  image: '../assets/img/los_pinos.jpg',            description: 'Eco hotel sustentable en bosque de pinos con senderos y glamping' },
        { id: 'parque-3', slug: 'brisas-de-mirthayu',               name: 'Brisas de Mirthayú',                    location: 'Vía Zuluaga, Gigante',          price: 5000,   image: '../assets/img/brisa_marthayu.jpg',        description: 'Finca agroturística con escultura de la Diosa Mirthayú y piscina' }
    ],
    mirador: [
        { id: 'mirador-1', slug: 'la-mano-del-gigante',  name: 'La Mano del Gigante',     location: 'Vereda El Rodeo, Gigante',      price: 21000, image: '../assets/img/la_mano_gigante_fondo.jpg', description: 'Mirador icónico con deslizador de 210m y columpio sobre el barranco' },
        { id: 'mirador-2', slug: 'la-loma-de-la-cruz',   name: 'La Loma de la Cruz',      location: 'Gigante, Huila',                price: 0,     image: '../assets/img/loma_cruz_gigante.jpg',      description: 'Mirador natural con vista 360° del Valle del Magdalena' },
        { id: 'mirador-3', slug: 'la-morra-mirador-360', name: 'La Morra - Mirador 360°', location: 'Cordillera Oriental, Gigante',  price: 15000, image: '../assets/img/la_morra.jpg',               description: 'Vistas al Nevado del Huila, Puracé y represas del Quimbo' },
        { id: 'mirador-4', slug: 'la-casa-del-arbol',    name: 'La Casa del Árbol',       location: 'Gigante, Huila',                price: 10000, image: '../assets/img/la_casa_arbol.jpg',          description: 'Mirador en árbol con cascada, canoa y senderismo ecológico' }
    ],
    glamping: [
        { id: 'glamping-1', slug: 'los-pinos-parque-agroecoturistico', name: 'Los Pinos - Glampinos y Alpinos',  location: 'Hobo - Gigante',               price: 180000, image: '../assets/img/los_pinos.jpg', description: 'Tarimas en madera con hamacas inmersas en bosque de pinos' },
        { id: 'glamping-2', slug: 'la-morra-mirador-360',              name: 'La Morra - Glamping de Pareja',   location: 'Cordillera Oriental, Gigante', price: 250000, image: '../assets/img/la_morra.jpg',   description: 'Glamping romántico con jacuzzi, malla elevada y vistas al nevado' }
    ],
    hospedaje: [
        { id: 'hospedaje-1', slug: 'la-perla-finca-hotel',            name: 'La Perla Finca Hotel',                  location: 'Vereda Bajo Corozal, Gigante', price: 280000, image: '../assets/img/perla_finca_gigante.jpg', description: 'Hotel boutique en Ruta del Café con cabañas de lujo entre cafetales' },
        { id: 'hospedaje-2', slug: 'los-pinos-parque-agroecoturistico', name: 'Los Pinos - Cabañas Ecológicas',       location: 'Hobo - Gigante',               price: 150000, image: '../assets/img/los_pinos.jpg',            description: 'Cabañas en pino con vistas espectaculares y diseño sostenible' },
        { id: 'hospedaje-3', slug: 'la-morra-mirador-360',             name: 'La Morra - Cabañas Confortables',      location: 'Cordillera Oriental, Gigante', price: 120000, image: '../assets/img/la_morra.jpg',              description: 'Hospedaje acogedor con vistas panorámicas de 360 grados' },
        { id: 'hospedaje-4', slug: 'brisas-de-mirthayu',               name: 'Brisas de Mirthayú - Finca Agroturística', location: 'Vía Zuluaga, Gigante',    price: 100000, image: '../assets/img/brisa_marthayu.jpg',        description: 'Cabañas con desayuno incluido, piscina e hidropedales' }
    ]
};

// ==================== CATÁLOGO DE SITIOS (cabañas + entradas) ====================
//
// ✅ ESTRUCTURA DE PAGO:
//   - paymentMethod: 'nequi'   → muestra número Nequi (nequiNumber + nequiTitular)
//   - paymentMethod: 'bancolombia' → muestra cuenta de ahorros Bancolombia
//                                    (bankAccount, bankTitular, bankCC)
//   - Si no se define paymentMethod, el sistema asume 'nequi' por retrocompatibilidad.

const sitesCatalog = {
    'brisas-de-mirthayu': {
        nombre: 'Brisas de Mirthayú',
        paymentMethod: 'nequi',
        nequiNumber: '3222313146',
        nequiTitular: 'Brisas de Mirthayú',
        entrada: { precio: 5000, notas: 'Piscina adicional $7.000 · Hidropedales $8.000 · Cabalgata $10.000' },
        alojamientos: [
            { id: 'brisas-cab-familiar',  nombre: 'Cabaña Familiar',          tipo: 'cabaña',  capacidadMax: 4, incluyeDesayuno: true,  precio: 80000,  descripcion: 'Cabaña acogedora para grupos o familias, rodeada de naturaleza.',                    amenidades: ['Piscina', 'WiFi', 'Hidropedales', 'Senderismo', 'Juegos familiares'] },
            { id: 'brisas-cab-romantica', nombre: 'Cabaña Romántica Pareja',   tipo: 'cabaña',  capacidadMax: 2, incluyeDesayuno: true,  precio: 200000, descripcion: 'Cabaña íntima con ambiente romántico, perfecta para escapadas en pareja.',           amenidades: ['Piscina', 'WiFi', 'Hidropedales', 'Senderismo'] }
        ]
    },
    'xhimanut-parque-de-los-suenos': {
        nombre: 'Xhimanut - Parque de los Sueños',
        paymentMethod: 'nequi',
        nequiNumber: '3193999708',
        nequiTitular: 'Xhimanut Parque',
        entrada: { precio: 12000, notas: 'Algunas atracciones tienen costo adicional. Consultar en taquilla.' },
        alojamientos: [
            { id: 'xhim-catacoa', nombre: 'Cabaña CATACOA', tipo: 'cabaña', capacidadMax: 4, incluyeDesayuno: false, precio: 420000, descripcion: 'Cabaña emblemática con vistas panorámicas y acceso a todas las instalaciones.', amenidades: ['Vistas panorámicas', 'WiFi', 'Acceso al parque', 'Privacidad'] },
            { id: 'xhim-b',       nombre: 'Cabaña B',        tipo: 'cabaña', capacidadMax: 4, incluyeDesayuno: false, precio: 390000, descripcion: 'Cabaña confortable con todas las comodidades y acceso al parque.',               amenidades: ['WiFi', 'Acceso al parque', 'Privacidad'] }
        ]
    },
    'los-pinos-parque-agroecoturistico': {
        nombre: 'Los Pinos - Parque Agroecoturístico',
        paymentMethod: 'nequi',
        nequiNumber: '3203867524',
        nequiTitular: 'Los Pinos Ecoturismo',
        entrada: { precio: 48000, notas: 'Incluye almuerzo típico huilense.' },
        alojamientos: [
            { id: 'pinos-glamp-vip',      nombre: 'Glamping VIP',       tipo: 'glamping', capacidadMax: 2,  incluyeDesayuno: true, precio: 540000,  descripcion: 'Glamping de lujo con acabados premium y vista al bosque de pinos.',          amenidades: ['Cama king', 'Baño privado', 'Terraza privada', 'WiFi'] },
            { id: 'pinos-alpino-confort',  nombre: 'Alpino Confort',     tipo: 'cabaña',   capacidadMax: 2,  incluyeDesayuno: true, precio: 424000,  descripcion: 'Cabaña alpina con diseño rústico moderno integrada al bosque.',              amenidades: ['Chimenea', 'Baño privado', 'Vista al bosque', 'WiFi'] },
            { id: 'pinos-alpino-esencial', nombre: 'Alpino Esencial',    tipo: 'cabaña',   capacidadMax: 2,  incluyeDesayuno: true, precio: 264000,  descripcion: 'Cabaña acogedora con lo esencial para disfrutar del entorno natural.',      amenidades: ['Baño privado', 'Vista al bosque', 'WiFi'] },
            { id: 'pinos-alpino-prime',    nombre: 'Alpino Prime',       tipo: 'cabaña',   capacidadMax: 6,  incluyeDesayuno: true, precio: 510000,  descripcion: 'Cabaña espaciosa para grupos de hasta 6 personas.',                         amenidades: ['Sala de estar', 'Cocina básica', 'Terraza', 'WiFi'] },
            { id: 'pinos-aprisco',         nombre: 'Cabaña El Aprisco',  tipo: 'cabaña',   capacidadMax: 12, incluyeDesayuno: true, precio: 870000,  descripcion: 'Opción ideal para grupos grandes. Capacidad máxima 12 personas.',           amenidades: ['Sala amplia', 'Múltiples baños', 'Cocina equipada', 'Zona BBQ', 'WiFi'] },
            { id: 'pinos-alpino-plus',     nombre: 'Alpino Plus',        tipo: 'cabaña',   capacidadMax: 6,  incluyeDesayuno: true, precio: 510000,  descripcion: 'Cabaña premium con amenidades adicionales y zona BBQ.',                     amenidades: ['Sala de estar', 'Baño premium', 'Terraza con vista', 'Zona BBQ', 'WiFi'] }
        ]
    },

    // ✅ ACTUALIZADO: La Mano del Gigante usa cuenta de ahorros Bancolombia
    'la-mano-del-gigante': {
        nombre: 'La Mano del Gigante',
        paymentMethod: 'bancolombia',
        bankAccount:  '91238524712',
        bankTitular:  'Jessica Katerine Cometa Sánchez',
        bankCC:       '1082806714',
        bankType:     'Cuenta de Ahorros',
        entrada: { precio: 15000, notas: 'Deslizador y columpio tienen costo adicional.' },
        alojamientos: [
            { id: 'mano-celeste-2',  nombre: 'Cabaña Celeste Pareja',      tipo: 'cabaña', capacidadMax: 2, incluyeDesayuno: false, precio: 280000,  descripcion: 'Íntima cabaña para dos con vista privilegiada al valle.',                              amenidades: ['Vista panorámica', 'Baño privado', 'Terraza', 'WiFi'] },
            { id: 'mano-celeste-3',  nombre: 'Cabaña Celeste Familiar 3',  tipo: 'cabaña', capacidadMax: 3, incluyeDesayuno: false, precio: 380000,  descripcion: 'Cabaña familiar para 3 personas con vistas y acceso a miradores.',                    amenidades: ['Vista panorámica', 'Baño privado', 'WiFi'] },
            { id: 'mano-celeste-4',  nombre: 'Cabaña Celeste Familiar 4',  tipo: 'cabaña', capacidadMax: 4, incluyeDesayuno: false, precio: 480000,  descripcion: 'Cabaña familiar para 4 personas, perfecta para grupos pequeños.',                    amenidades: ['Vista panorámica', 'Baño privado', 'WiFi'] },
            { id: 'mano-azulejo',    nombre: 'Cabaña Azulejo',             tipo: 'cabaña', capacidadMax: 6, incluyeDesayuno: false, precio: 580000,  descripcion: 'Cabaña espaciosa con vistas al entorno y ambiente natural.',                          amenidades: ['Vista al valle', 'Sala de estar', 'Baño privado', 'WiFi'] },
            { id: 'mano-cardenal',   nombre: 'Cabaña Cardenal',            tipo: 'cabaña', capacidadMax: 6, incluyeDesayuno: false, precio: 580000,  descripcion: 'Confort y naturaleza en armonía, nombrada por el ave Cardenal.',                     amenidades: ['Vista al valle', 'Sala de estar', 'Baño privado', 'WiFi'] },
            { id: 'mano-turpial',    nombre: 'Cabaña Turpial',             tipo: 'cabaña', capacidadMax: 6, incluyeDesayuno: false, precio: 658000,  descripcion: 'Diseño colorido y vistas privilegiadas, inspirada en el ave Turpial.',              amenidades: ['Vista panorámica', 'Sala de estar', 'Baño premium', 'WiFi'] },
            { id: 'mano-colibri',    nombre: 'Cabaña Colibrí',             tipo: 'cabaña', capacidadMax: 8, incluyeDesayuno: false, precio: 1300000, descripcion: 'La cabaña más grande, ideal para grupos o familias numerosas.',                      amenidades: ['Vista panorámica', 'Sala amplia', 'Múltiples baños', 'Zona BBQ', 'WiFi'] }
        ]
    },

    'la-loma-de-la-cruz': {
        nombre: 'La Loma de la Cruz',
        paymentMethod: 'nequi',
        nequiNumber: '3203867524',
        nequiTitular: 'La Loma de la Cruz',
        entrada: { precio: 0, notas: 'Acceso completamente gratuito. Abierto todos los días.' },
        alojamientos: []
    },
    'la-morra-mirador-360': {
        nombre: 'La Morra - Mirador 360°',
        paymentMethod: 'nequi',
        nequiNumber: '3203867524',
        nequiTitular: 'La Morra Mirador',
        entrada: { precio: 10000, notas: 'Llevar ropa de abrigo. Temperatura 10°C–18°C.' },
        alojamientos: [
            { id: 'morra-glamp', nombre: 'Glamping Romántico con Jacuzzi', tipo: 'glamping', capacidadMax: 2, incluyeDesayuno: true, precio: 250000, descripcion: 'Glamping de alta montaña con jacuzzi, cielos estrellados y vistas al amanecer.', amenidades: ['Jacuzzi', 'Cama king', 'Vista a nevados', 'Desayuno incluido', 'Fogata privada'] }
        ]
    },
    'la-casa-del-arbol': {
        nombre: 'La Casa del Árbol',
        paymentMethod: 'nequi',
        nequiNumber: '3114767290',
        nequiTitular: 'La Casa del Árbol',
        entrada: { precio: 8000, notas: 'Solo visitas diurnas. Ropa cómoda y calzado para senderos.' },
        alojamientos: []
    },

    // ✅ ACTUALIZADO: La Perla Finca Hotel usa cuenta de ahorros Bancolombia
    'la-perla-finca-hotel': {
        nombre: 'La Perla Finca Hotel',
        paymentMethod: 'bancolombia',
        bankAccount:  '01378362730',
        bankTitular:  'Ana María Parra',
        bankCC:       '1020740001',
        bankType:     'Cuenta de Ahorros',
        entrada: { precio: 6000, notas: 'Recorrido cafetero incluido. Cata de café opcional.' },
        alojamientos: [
            { id: 'perla-zafiro',    nombre: 'Cabaña ZAFIRO',            tipo: 'cabaña',   capacidadMax: 2, incluyeDesayuno: true, precio: 1750000, descripcion: 'La cabaña más lujosa. Diseño premium entre los cafetales.',                       amenidades: ['Jacuzzi', 'Cama king', 'Vista panorámica', 'Minibar', 'WiFi'] },
            { id: 'perla-jaspe',     nombre: 'Cabaña JASPE',             tipo: 'cabaña',   capacidadMax: 2, incluyeDesayuno: true, precio: 990000,  descripcion: 'Cabaña elegante inspirada en la piedra Jaspe.',                               amenidades: ['Cama queen', 'Terraza privada', 'Vista al cafetal', 'WiFi'] },
            { id: 'perla-crisolito', nombre: 'Glamping CRISOLITO',       tipo: 'glamping', capacidadMax: 2, incluyeDesayuno: true, precio: 1100000, descripcion: 'Glamping de lujo entre los cafetales con diseño moderno.',                     amenidades: ['Cama queen', 'Baño privado', 'Terraza', 'WiFi'] },
            { id: 'perla-agata',     nombre: 'Cabaña AGATA',             tipo: 'cabaña',   capacidadMax: 2, incluyeDesayuno: true, precio: 1100000, descripcion: 'Diseño artesanal con tonos cálidos y ambiente acogedor.',                      amenidades: ['Cama queen', 'Baño privado', 'Hamaca exterior', 'WiFi'] },
            { id: 'perla-cornalina', nombre: 'Glamping CORNALINA',       tipo: 'glamping', capacidadMax: 2, incluyeDesayuno: true, precio: 1100000, descripcion: 'Glamping romántico con bañera y botella de vino de bienvenida.',              amenidades: ['Cama king', 'Bañera', 'Vista al cafetal', 'WiFi', 'Botella de vino'] },
            { id: 'perla-jacinto',   nombre: 'Cabaña Familiar JACINTO',  tipo: 'cabaña',   capacidadMax: 4, incluyeDesayuno: true, precio: 1150000, descripcion: 'Cabaña familiar espaciosa, ideal para familias con niños.',                   amenidades: ['2 habitaciones', 'Sala', 'Baño privado', 'Patio', 'WiFi'] },
            { id: 'perla-amatista',  nombre: 'Cabaña Familiar AMATISTA', tipo: 'cabaña',   capacidadMax: 4, incluyeDesayuno: true, precio: 1200000, descripcion: 'Tonos violetas inspirados en la Amatista. Espacio y confort premium.',       amenidades: ['2 habitaciones', 'Sala', 'Baño premium', 'Terraza familiar', 'WiFi'] },
            { id: 'perla-esmeralda', nombre: 'Cabaña ESMERALDA',         tipo: 'cabaña',   capacidadMax: 2, incluyeDesayuno: true, precio: 1200000, descripcion: 'Rodeada completamente por cafetales con máxima privacidad.',                 amenidades: ['Cama king', 'Jacuzzi exterior', 'Vista verde total', 'WiFi'] },
            { id: 'perla-cristal',   nombre: 'Cabaña Familiar CRISTAL',  tipo: 'cabaña',   capacidadMax: 4, incluyeDesayuno: true, precio: 1100000, descripcion: 'Diseño luminoso con ventanales panorámicos en cada rincón.',               amenidades: ['2 habitaciones', 'Ventanales panorámicos', 'Baño privado', 'Terraza', 'WiFi'] }
        ]
    }
};

// ==================== ÍCONOS AMENIDADES ====================

const amenityIcons = {
    'WiFi': 'fa-wifi', 'Piscina': 'fa-swimming-pool', 'Jacuzzi': 'fa-hot-tub',
    'Desayuno incluido': 'fa-coffee', 'Cama king': 'fa-bed', 'Cama queen': 'fa-bed',
    'Baño privado': 'fa-shower', 'Terraza': 'fa-leaf', 'Terraza privada': 'fa-leaf',
    'Vista panorámica': 'fa-mountain', 'Vista al valle': 'fa-mountain',
    'Vista a nevados': 'fa-snowflake', 'Vista al bosque': 'fa-tree',
    'Vista al cafetal': 'fa-seedling', 'Vista verde total': 'fa-leaf',
    'Zona BBQ': 'fa-fire', 'Fogata privada': 'fa-fire', 'Chimenea': 'fa-fire',
    'Sala de estar': 'fa-couch', 'Sala amplia': 'fa-couch',
    'Cocina básica': 'fa-utensils', 'Cocina equipada': 'fa-utensils',
    'Múltiples baños': 'fa-restroom', 'Baño premium': 'fa-shower',
    'Minibar': 'fa-wine-bottle', 'Botella de vino': 'fa-wine-bottle',
    'Bañera': 'fa-bath', 'Hamaca exterior': 'fa-leaf',
    'Acceso al parque': 'fa-ticket-alt', 'Privacidad': 'fa-lock',
    'Vistas panorámicas': 'fa-mountain', 'Hidropedales': 'fa-water',
    'Senderismo': 'fa-hiking', 'Juegos familiares': 'fa-gamepad',
    '2 habitaciones': 'fa-door-open', 'Patio': 'fa-sun',
    'Ventanales panorámicos': 'fa-window-maximize'
};

// ==================== TARIFAS ====================

const pricingConfig = {
    serviceFeePercentage: 0.05,
    taxPercentage:        0.19,
    minNights:            1,
    maxNights:            30
};

// ==================== ESTADO GLOBAL ====================

let appState = {
    selectedServiceType:   null,
    selectedDestination:   null,
    selectedDestinationDb: null,
    checkInDate:           null,
    checkOutDate:          null,
    numPeople:             null,
    paymentMethod:         'nequi',
    currentDestinations:   [],
    userData:              null,
    companions:            []
};

const bookingTypeState = {
    mode:          null,
    selectedAccom: null
};

const availabilityState = {
    occupiedRanges: [],
    lastKey:        null
};

// ==================== API BASE URL ====================

const API_BASE = (typeof window.API_URL !== 'undefined' ? window.API_URL : '')
              || 'http://localhost:5000/api';

// ==================== INICIALIZACIÓN ====================

document.addEventListener('DOMContentLoaded', function () {
    initializeReservationSystem();
});

async function initializeReservationSystem() {
    loadUserData();
    setMinDates();
    setupReservationListeners();
    injectCalendarStyles();

    const pmInput = document.getElementById('paymentMethod');
    if (pmInput) pmInput.value = 'nequi';

    initPeopleCounter();

    await loadPricingFromBackend();
    console.log('✅ Sistema de reservas inicializado');
}

// ==================== TARIFAS DINÁMICAS ====================

async function loadPricingFromBackend() {
    try {
        const res  = await fetch(`${API_BASE}/settings/public`);
        const json = await res.json();
        if (json?.data) {
            const fee = json.data.serviceFeePercentage;
            const tax = json.data.taxPercentage;
            if (fee != null) pricingConfig.serviceFeePercentage = fee / 100;
            if (tax != null) pricingConfig.taxPercentage        = tax / 100;
            _updateFeeLabel('summaryServiceFee', `Tarifa de servicio (${fee ?? 5}%)`);
            _updateFeeLabel('summaryTax',        `Impuestos (${tax ?? 19}%)`);
            calculateTotalPrice();
        }
    } catch (err) {
        console.warn('⚠️ Usando tarifas por defecto:', err.message);
    }
}

function _updateFeeLabel(summaryId, labelText) {
    const el = document.getElementById(summaryId);
    if (!el) return;
    const labelEl = el.closest('.detail-item')?.querySelector('.detail-label');
    if (labelEl) {
        const icon = labelEl.querySelector('i');
        labelEl.textContent = ' ' + labelText;
        if (icon) labelEl.prepend(icon);
    }
}

// ==================== USUARIO ====================

function getActiveUser() {
    if (typeof authAPI !== 'undefined' && authAPI.isAuthenticated()) {
        const u = authAPI.getUser();
        if (u?.email) return u;
    }
    for (const key of ['techstore-user-data', 'gigante_user', 'currentUser']) {
        try {
            const u = JSON.parse(localStorage.getItem(key) || 'null');
            if (u?.email) return u;
        } catch (_) {}
    }
    return null;
}

function loadUserData() {
    const user = getActiveUser();
    if (!user) return;
    appState.userData = user;
    let fullName = user.fullName || '';
    if (!fullName && user.firstName)   fullName = `${user.firstName} ${user.lastName || ''}`.trim();
    if (!fullName && user.displayName) fullName = user.displayName;
    const fullNameField = document.getElementById('fullName');
    const emailField    = document.getElementById('email');
    if (fullNameField && fullName)  fullNameField.value = fullName;
    if (emailField    && user.email) emailField.value   = user.email;
}

// ==================== FECHAS ====================

function setMinDates() {
    const today    = new Date().toISOString().split('T')[0];
    const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];
    const ci = document.getElementById('checkIn');
    const co = document.getElementById('checkOut');
    if (ci) ci.min = today;
    if (co) co.min = tomorrow;
}

// ==================== LISTENERS ====================

function setupReservationListeners() {
    document.querySelectorAll('.service-type-card').forEach(card =>
        card.addEventListener('click', () => selectServiceType(card.dataset.type))
    );

    const destSelect = document.getElementById('destination');
    if (destSelect) destSelect.addEventListener('change', () => selectDestination(destSelect.value));

    const ci = document.getElementById('checkIn');
    const co = document.getElementById('checkOut');
    if (ci) ci.addEventListener('change', e => handleCheckInChange(e.target.value));
    if (co) co.addEventListener('change', e => handleCheckOutChange(e.target.value));

    setupRealtimeValidations();

    const form = document.getElementById('reservationForm');
    if (form) form.addEventListener('submit', handleFormSubmit);
}

// ==================== VALIDACIONES EN TIEMPO REAL ====================

function setupRealtimeValidations() {
    [
        { id: 'fullName',         fn: validateName  },
        { id: 'phone',            fn: validatePhone },
        { id: 'email',            fn: validateEmail },
        { id: 'emergencyContact', fn: validateName  },
        { id: 'emergencyPhone',   fn: validatePhone }
    ].forEach(({ id, fn }) => {
        const el = document.getElementById(id);
        if (!el) return;
        el.addEventListener('input', e => fn(e.target));
        el.addEventListener('blur',  e => fn(e.target, true));
    });

    const docType   = document.getElementById('documentType');
    const docNumber = document.getElementById('documentNumber');
    if (docType && docNumber) {
        docType.addEventListener('change', () => validateDocumentNumber(docNumber));
        docNumber.addEventListener('input', e => validateDocumentNumber(e.target));
    }
}

function validateName(input, showError = false) {
    if (!input) return false;
    input.value = input.value.replace(/[^a-záéíóúñA-ZÁÉÍÓÚÑ\s]/g, '');
    const value = input.value.trim();
    if (!value)                                           { if (showError) showFieldError(input, 'Este campo es obligatorio');          return false; }
    if (value.length < 3)                                 { if (showError) showFieldError(input, 'Debe tener al menos 3 caracteres');  return false; }
    if (value.split(' ').filter(w => w).length < 2)       { if (showError) showFieldError(input, 'Ingresa nombre y apellido completo'); return false; }
    clearFieldError(input); return true;
}

function validatePhone(input, showError = false) {
    if (!input) return false;
    let value = input.value.replace(/\D/g, '').slice(0, 10);
    input.value = value;
    if (!value)              { if (showError) showFieldError(input, 'El teléfono es obligatorio (10 dígitos)'); return false; }
    if (value.length === 10) { clearFieldError(input); return true; }
    if (showError) showFieldError(input, `Faltan ${10 - value.length} dígitos`);
    return false;
}

function validateEmail(input, showError = false) {
    if (!input) return false;
    const value = input.value.trim().toLowerCase();
    if (!value)                              { if (showError) showFieldError(input, 'El correo electrónico es obligatorio'); return false; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) { if (showError) showFieldError(input, 'Formato de correo inválido');        return false; }
    clearFieldError(input); return true;
}

function validateDocumentNumber(input) {
    if (!input) return false;
    const docType   = document.getElementById('documentType')?.value;
    const maxLens   = { CC: 10, CE: 7, PA: 12, TI: 11 };
    let   value     = input.value.replace(/\D/g, '').slice(0, maxLens[docType] || 12);
    input.value = value;
    if (value.length >= 6) { clearFieldError(input); return true; }
    return false;
}

function showFieldError(input, message) {
    if (!input) return;
    const parent = input.closest('.form-group');
    if (!parent) return;
    clearFieldError(input);
    input.style.borderColor = '#ef4444';
    input.style.boxShadow   = '0 0 0 4px rgba(239,68,68,0.1)';
    const div = document.createElement('div');
    div.className     = 'field-error';
    div.style.cssText = 'color:#ef4444;font-size:13px;margin-top:6px;display:flex;align-items:center;gap:6px;';
    div.innerHTML     = `<i class="fas fa-exclamation-circle"></i> ${message}`;
    parent.appendChild(div);
}

function clearFieldError(input) {
    if (!input) return;
    const parent = input.closest('.form-group');
    if (!parent) return;
    input.style.borderColor = '#e5e7eb';
    input.style.boxShadow   = 'none';
    parent.querySelector('.field-error')?.remove();
}

// ==================== CONTADOR DE PERSONAS ====================

let _peopleCount = 1;

function initPeopleCounter() {
    _peopleCount = 1;
    _renderPeopleCounter();
}

function _renderPeopleCounter() {
    const wrapper = document.getElementById('people-counter-wrapper');
    if (!wrapper) return;

    wrapper.innerHTML = `
        <div style="display:flex;align-items:center;gap:20px;flex-wrap:wrap;">
            <div style="display:flex;align-items:center;gap:16px;background:#f9fafb;border:2px solid #e5e7eb;border-radius:16px;padding:16px 24px;">
                <div style="display:flex;align-items:center;gap:10px;">
                    <div style="width:40px;height:40px;background:linear-gradient(135deg,#195C33,#0d3d20);border-radius:50%;display:flex;align-items:center;justify-content:center;">
                        <i class="fas fa-user" style="color:white;font-size:16px;"></i>
                    </div>
                    <div>
                        <div style="font-size:15px;font-weight:700;color:#195C33;">Titular</div>
                        <div style="font-size:12px;color:#6b7280;">Tú</div>
                    </div>
                </div>
            </div>
            <div id="companions-badges" style="display:flex;flex-wrap:wrap;gap:10px;align-items:center;"></div>
            <button type="button" id="btn-add-companion"
                onclick="addCompanion()"
                style="display:flex;align-items:center;gap:8px;padding:14px 22px;background:linear-gradient(135deg,#F4C400,#FFE347);border:none;border-radius:14px;color:#195C33;font-size:14px;font-weight:700;cursor:pointer;transition:all .3s;box-shadow:0 4px 12px rgba(244,196,0,.3);">
                <i class="fas fa-user-plus"></i>
                Añadir acompañante
            </button>
        </div>
        <div style="margin-top:14px;display:flex;align-items:center;gap:8px;">
            <i class="fas fa-users" style="color:#195C33;font-size:14px;"></i>
            <span style="font-size:14px;color:#6b7280;">Total: <strong id="people-total-label" style="color:#195C33;">${_peopleCount} ${_peopleCount === 1 ? 'persona' : 'personas'}</strong></span>
        </div>
    `;

    _renderCompanionBadges();
    _syncPeopleState();
}

function _renderCompanionBadges() {
    const container = document.getElementById('companions-badges');
    if (!container) return;
    container.innerHTML = '';
    const numCompanions = _peopleCount - 1;
    for (let i = 1; i <= numCompanions; i++) {
        const badge = document.createElement('div');
        badge.style.cssText = 'display:flex;align-items:center;gap:8px;background:#f0fdf4;border:2px solid #86efac;border-radius:14px;padding:10px 16px;';
        badge.innerHTML = `
            <div style="width:34px;height:34px;background:linear-gradient(135deg,#F4C400,#FFE347);border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:14px;font-weight:800;color:#195C33;">${i}</div>
            <div>
                <div style="font-size:13px;font-weight:700;color:#195C33;">Acompañante #${i}</div>
                <div style="font-size:11px;color:#6b7280;">Datos requeridos</div>
            </div>
            <button type="button" onclick="removeCompanion(${i})"
                style="width:26px;height:26px;background:#fee2e2;border:none;border-radius:50%;display:flex;align-items:center;justify-content:center;cursor:pointer;color:#ef4444;font-size:12px;transition:all .2s;margin-left:4px;"
                title="Eliminar acompañante">
                <i class="fas fa-times"></i>
            </button>`;
        container.appendChild(badge);
    }
}

function addCompanion() {
    _peopleCount++;
    _renderPeopleCounter();
    _rebuildCompanionsForms();
    _scrollToCompanionForm(_peopleCount - 1);
}

function removeCompanion(index) {
    if (_peopleCount <= 1) return;
    _peopleCount--;
    _renderPeopleCounter();
    _rebuildCompanionsForms();
}

function _rebuildCompanionsForms() {
    const numCompanions = _peopleCount - 1;
    updateCompanionsSection(numCompanions);
    _syncPeopleState();
}

function _syncPeopleState() {
    const value = _peopleCount >= 6 ? '6+' : String(_peopleCount);
    appState.numPeople = value;
    const numPeopleInput = document.getElementById('numPeople');
    if (numPeopleInput) numPeopleInput.value = value;
    const summaryPeople = document.getElementById('summaryPeople');
    if (summaryPeople) summaryPeople.textContent = `${_peopleCount} ${_peopleCount === 1 ? 'persona' : 'personas'}`;
    const totalLabel = document.getElementById('people-total-label');
    if (totalLabel) totalLabel.textContent = `${_peopleCount} ${_peopleCount === 1 ? 'persona' : 'personas'}`;
    calculateTotalPrice();
}

function _scrollToCompanionForm(index) {
    setTimeout(() => {
        const el = document.getElementById(`companion-name-${index}`);
        if (el) el.closest('.companion-card')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 200);
}

// ==================== ACOMPAÑANTES ====================

function updateCompanionsSection(numCompanions) {
    let section = document.getElementById('companions-section');
    if (numCompanions <= 0) {
        if (section) section.style.display = 'none';
        appState.companions = [];
        return;
    }
    if (!section) section = createCompanionsSection();
    section.style.display = 'block';
    const container = document.getElementById('companions-container');
    if (!container) return;
    container.innerHTML = '';
    for (let i = 0; i < numCompanions; i++) container.appendChild(createCompanionForm(i + 1));
}

function createCompanionsSection() {
    const ref = document.querySelector('.form-section:has(#fullName)');
    const section = document.createElement('div');
    section.id = 'companions-section';
    section.className = 'form-section';
    section.style.display = 'none';
    section.innerHTML = `
        <h2 class="section-title"><i class="fas fa-user-friends"></i>Información de Acompañantes</h2>
        <div class="info-box" style="background:linear-gradient(135deg,#dbeafe,#bfdbfe);border-left-color:#3b82f6;margin-bottom:20px;">
            <p style="color:#1e40af;"><i class="fas fa-info-circle" style="color:#3b82f6;"></i>
            <strong>Nota:</strong> Por razones de seguridad necesitamos los datos básicos de cada acompañante.</p>
        </div>
        <div id="companions-container"></div>`;
    if (ref) ref.insertAdjacentElement('afterend', section);
    return section;
}

function createCompanionForm(index) {
    const div = document.createElement('div');
    div.className = 'companion-card';
    div.style.cssText = 'background:#f9fafb;padding:24px;border-radius:16px;margin-bottom:20px;border:2px solid #e5e7eb;';
    div.innerHTML = `
        <h3 style="font-size:16px;font-weight:700;color:#195C33;margin-bottom:20px;display:flex;align-items:center;gap:10px;">
            <div style="width:32px;height:32px;background:linear-gradient(135deg,#F4C400,#FFE347);border-radius:50%;display:flex;align-items:center;justify-content:center;color:#195C33;font-weight:800;font-size:14px;">${index}</div>
            Acompañante #${index}
        </h3>
        <div class="form-row">
            <div class="form-group">
                <label>Nombre Completo <span class="required">*</span></label>
                <input type="text" id="companion-name-${index}" class="form-input companion-input" placeholder="Ej: María García López">
            </div>
            <div class="form-group">
                <label>Tipo de Documento <span class="required">*</span></label>
                <select id="companion-doctype-${index}" class="form-select companion-input">
                    <option value="">Seleccione...</option>
                    <option value="CC">Cédula de Ciudadanía</option>
                    <option value="CE">Cédula de Extranjería</option>
                    <option value="PA">Pasaporte</option>
                    <option value="TI">Tarjeta de Identidad</option>
                </select>
            </div>
        </div>
        <div class="form-group">
            <label>Número de Documento <span class="required">*</span></label>
            <input type="text" id="companion-docnum-${index}" class="form-input companion-input" placeholder="Número de documento">
        </div>`;
    setTimeout(() => {
        const ni = div.querySelector(`#companion-name-${index}`);
        const dn = div.querySelector(`#companion-docnum-${index}`);
        const dt = div.querySelector(`#companion-doctype-${index}`);
        if (ni) { ni.addEventListener('input', e => validateName(e.target)); ni.addEventListener('blur', e => validateName(e.target, true)); }
        if (dt && dn) { dt.addEventListener('change', () => validateDocumentNumber(dn)); dn.addEventListener('input', e => validateDocumentNumber(e.target)); }
    }, 100);
    return div;
}

// ==================== TIPO DE SERVICIO ====================

function selectServiceType(type) {
    appState.selectedServiceType = type;
    document.querySelectorAll('.service-type-card').forEach(c => c.classList.toggle('active', c.dataset.type === type));
    const serviceTypeInput = document.getElementById('serviceType');
    if (serviceTypeInput) serviceTypeInput.value = type;
    loadDestinationsForType(type);
    updateServiceBadge(type);
    const destSelect = document.getElementById('destination');
    if (destSelect) destSelect.disabled = false;
}

function updateServiceBadge(type) {
    const badges = { parque: '🌳 Parques Naturales', mirador: '🏔️ Miradores', glamping: '⛺ Glamping', hospedaje: '🏨 Hospedaje' };
    const el = document.getElementById('serviceBadge');
    if (el) el.textContent = badges[type] || 'Servicio';
}

// ==================== DESTINOS ====================

function loadDestinationsForType(serviceType) {
    const destinations = destinationsCatalog[serviceType] || [];
    appState.currentDestinations = destinations;
    const select = document.getElementById('destination');
    if (!select) return;
    select.innerHTML = '<option value="">-- Selecciona un destino --</option>';
    destinations.forEach(dest => {
        const option = document.createElement('option');
        option.value       = dest.id;
        option.textContent = dest.name;
        select.appendChild(option);
    });
    resetDestinationPreview();
    appState.selectedDestination   = null;
    appState.selectedDestinationDb = null;
}

async function selectDestination(destinationId) {
    bookingTypeState.mode          = null;
    bookingTypeState.selectedAccom = null;
    availabilityState.occupiedRanges = [];
    availabilityState.lastKey        = null;
    _removeSection('booking-type-section');
    _removeSection('accommodation-section');
    _removeSection('availability-calendar-section');
    _removeSection('form-nequi-info');
    _resetAccomSummary();

    const destination = appState.currentDestinations.find(d => d.id === destinationId);
    if (!destination) {
        appState.selectedDestination   = null;
        appState.selectedDestinationDb = null;
        resetDestinationPreview();
        return;
    }

    appState.selectedDestination = destination;

    try {
        const slug = destination.slug;
        const res  = await fetch(`${API_BASE}/sitios/${slug}`);
        if (res.ok) {
            const json = await res.json();
            if (json?.ok && json?.data) appState.selectedDestinationDb = json.data;
        }
    } catch (_) {}

    const previewImage = document.getElementById('previewImage');
    if (previewImage) {
        previewImage.style.opacity = '0';
        setTimeout(() => {
            previewImage.src     = destination.image;
            previewImage.alt     = destination.name;
            previewImage.style.transition = 'opacity 0.5s ease';
            previewImage.style.opacity    = '1';
        }, 200);
    }
    const previewName     = document.getElementById('previewName');
    const previewLocation = document.getElementById('previewLocation');
    if (previewName)     previewName.textContent     = destination.name;
    if (previewLocation) previewLocation.textContent = destination.location;

    const siteData = sitesCatalog[destination.slug];
    if (siteData) renderBookingTypeSelector(siteData);
    else console.warn(`⚠️ Sin datos en sitesCatalog para slug: "${destination.slug}"`);

    renderFormPaymentInfo(destination.slug);
    calculateTotalPrice();
}

// ==================== PASO 1: TIPO DE VISITA ====================

function renderBookingTypeSelector(siteData) {
    _removeSection('booking-type-section');

    const hasAccom    = siteData.alojamientos?.length > 0;
    const entradaFree = siteData.entrada?.precio === 0;
    const entradaLabel = entradaFree ? 'Entrada libre' : `Entrada · ${_fmt(siteData.entrada.precio)} COP/persona`;

    const section = document.createElement('div');
    section.id = 'booking-type-section';
    section.className = 'form-section';

    section.innerHTML = `
        <h2 class="section-title">
            <i class="fas fa-door-open" style="font-size:20px;color:#F4C400;width:32px;height:32px;background:rgba(244,196,0,.1);border-radius:8px;display:flex;align-items:center;justify-content:center;"></i>
            ¿Qué tipo de visita deseas?
        </h2>
        <div style="display:grid;grid-template-columns:${hasAccom ? '1fr 1fr' : '1fr'};gap:16px;">
            <div id="btn-entrada"
                 onclick="selectBookingType('entrada')"
                 style="padding:28px 20px;border:2px solid #e5e7eb;border-radius:18px;cursor:pointer;text-align:center;transition:all .3s;background:white;">
                <div style="font-size:36px;margin-bottom:12px;">🎟️</div>
                <div style="font-size:16px;font-weight:700;color:inherit;margin-bottom:6px;">Visita de día</div>
                <div style="font-size:13px;color:#6b7280;margin-bottom:${siteData.entrada.notas ? '12px' : '0'};">${entradaLabel}</div>
                ${siteData.entrada.notas ? `<div style="font-size:11px;color:#9ca3af;padding:8px;background:#f9fafb;border-radius:8px;line-height:1.5;">${siteData.entrada.notas}</div>` : ''}
            </div>
            ${hasAccom ? `
            <div id="btn-alojamiento"
                 onclick="selectBookingType('alojamiento')"
                 style="padding:28px 20px;border:2px solid #e5e7eb;border-radius:18px;cursor:pointer;text-align:center;transition:all .3s;background:white;">
                <div style="font-size:36px;margin-bottom:12px;">🏡</div>
                <div style="font-size:16px;font-weight:700;color:inherit;margin-bottom:6px;">Alojamiento</div>
                <div style="font-size:13px;color:#6b7280;margin-bottom:12px;">${siteData.alojamientos.length} opción${siteData.alojamientos.length > 1 ? 'es' : ''} disponible${siteData.alojamientos.length > 1 ? 's' : ''}</div>
                <div style="font-size:11px;color:#9ca3af;padding:8px;background:#f9fafb;border-radius:8px;">Desde ${_fmt(Math.min(...siteData.alojamientos.map(a => a.precio)))} COP/noche</div>
            </div>` : ''}
        </div>`;

    const destSection = document.querySelector('.form-section:has(#destination)');
    if (destSection) destSection.insertAdjacentElement('afterend', section);
}

// ==================== PASO 2: SELECCIÓN DE TIPO ====================

function selectBookingType(type) {
    const dest     = appState.selectedDestination;
    const siteData = dest ? sitesCatalog[dest.slug] : null;
    if (!siteData) return;

    bookingTypeState.mode          = type;
    bookingTypeState.selectedAccom = null;

    ['btn-entrada', 'btn-alojamiento'].forEach(id => {
        const el = document.getElementById(id);
        if (!el) return;
        const isActive = id === `btn-${type}`;
        el.style.borderColor = isActive ? '#195C33' : '#e5e7eb';
        el.style.background  = isActive ? 'linear-gradient(135deg,#195C33,#0d3d20)' : 'white';
        el.style.color       = isActive ? 'white' : '';
        el.querySelectorAll('div').forEach(d => { if (!d.style.background.includes('f9fafb')) d.style.color = isActive ? 'rgba(255,255,255,.9)' : ''; });
    });

    _removeSection('accommodation-section');
    _removeSection('availability-calendar-section');
    _resetAccomSummary();
    availabilityState.occupiedRanges = [];
    availabilityState.lastKey        = null;

    if (type === 'entrada') {
        appState.selectedDestination = { ...dest, price: siteData.entrada.precio };
        _updateSummaryAccom('entrada', null, siteData.entrada.precio);
        calculateTotalPrice();
        _loadAvailability('entrada', dest.id, null);
    } else {
        appState.selectedDestination = { ...dest, price: 0 };
        calculateTotalPrice();
        renderAccommodationCards(siteData);
    }
}

// ==================== PASO 3: TARJETAS DE CABAÑAS ====================

function renderAccommodationCards(siteData) {
    _removeSection('accommodation-section');

    const tipoIcons = { glamping: '⛺', 'cabaña': '🏡' };

    const cards = siteData.alojamientos.map(accom => {
        const icon  = tipoIcons[accom.tipo] || '🏠';
        const badge = accom.tipo === 'glamping'
            ? '<span style="background:linear-gradient(135deg,#7c3aed,#5b21b6);color:white;font-size:10px;font-weight:700;padding:3px 10px;border-radius:20px;text-transform:uppercase;">Glamping</span>'
            : '<span style="background:linear-gradient(135deg,#195C33,#0d3d20);color:white;font-size:10px;font-weight:700;padding:3px 10px;border-radius:20px;text-transform:uppercase;">Cabaña</span>';
        const desayuno = accom.incluyeDesayuno
            ? '<span style="display:inline-flex;align-items:center;gap:4px;background:#dcfce7;color:#166534;font-size:11px;font-weight:600;padding:3px 8px;border-radius:10px;"><i class="fas fa-coffee"></i> Desayuno incluido</span>'
            : '';
        const amensList = (accom.amenidades || []).slice(0, 5).map(a =>
            `<span style="display:inline-flex;align-items:center;gap:5px;font-size:11px;color:#4b5563;background:#f3f4f6;padding:4px 8px;border-radius:8px;">
                <i class="fas ${amenityIcons[a] || 'fa-check'}" style="color:#195C33;font-size:10px;"></i>${a}
            </span>`
        ).join('');

        const accomJson = JSON.stringify(accom).replace(/"/g, '&quot;');

        return `
            <div class="accom-card" id="card-${accom.id}"
                 onclick="selectAccommodation(${accomJson})"
                 style="background:white;border:2px solid #e5e7eb;border-radius:20px;padding:24px;cursor:pointer;">
                <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:14px;gap:12px;">
                    <div style="display:flex;align-items:center;gap:12px;">
                        <div style="width:48px;height:48px;background:linear-gradient(135deg,#f0fdf4,#dcfce7);border-radius:14px;display:flex;align-items:center;justify-content:center;font-size:24px;flex-shrink:0;">${icon}</div>
                        <div>
                            <div style="font-size:15px;font-weight:700;color:#111827;line-height:1.2;margin-bottom:4px;">${accom.nombre}</div>
                            <div style="display:flex;gap:6px;flex-wrap:wrap;">${badge} ${desayuno}</div>
                        </div>
                    </div>
                    <div style="text-align:right;flex-shrink:0;">
                        <div style="font-size:20px;font-weight:800;color:#195C33;">${_fmt(accom.precio)}</div>
                        <div style="font-size:11px;color:#9ca3af;">COP/noche</div>
                    </div>
                </div>
                <div style="display:flex;align-items:center;gap:6px;margin-bottom:10px;">
                    <i class="fas fa-users" style="color:#6b7280;font-size:12px;"></i>
                    <span style="font-size:13px;color:#6b7280;">Hasta <strong style="color:#374151;">${accom.capacidadMax} personas</strong></span>
                </div>
                <p style="font-size:13px;color:#6b7280;line-height:1.5;margin-bottom:14px;">${accom.descripcion}</p>
                <div style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:18px;">${amensList}</div>
                <div class="accom-select-btn"
                     style="width:100%;padding:11px;border-radius:12px;border:2px solid #195C33;color:#195C33;font-size:14px;font-weight:700;text-align:center;transition:all .2s;background:transparent;">
                    Seleccionar esta opción
                </div>
            </div>`;
    }).join('');

    const section = document.createElement('div');
    section.id = 'accommodation-section';
    section.className = 'form-section';
    section.innerHTML = `
        <h2 class="section-title">
            <i class="fas fa-campground" style="font-size:20px;color:#F4C400;width:32px;height:32px;background:rgba(244,196,0,.1);border-radius:8px;display:flex;align-items:center;justify-content:center;"></i>
            Elige tu alojamiento
        </h2>
        <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:16px;">${cards}</div>`;

    document.getElementById('booking-type-section')?.insertAdjacentElement('afterend', section);
}

// ==================== SELECCIÓN DE CABAÑA ====================

function selectAccommodation(accom) {
    bookingTypeState.selectedAccom = accom;
    document.querySelectorAll('.accom-card').forEach(c => c.classList.remove('selected'));
    document.getElementById(`card-${accom.id}`)?.classList.add('selected');
    appState.selectedDestination = { ...appState.selectedDestination, price: accom.precio };
    _updateSummaryAccom('alojamiento', accom, accom.precio);
    calculateTotalPrice();
    _loadAvailability('alojamiento', appState.selectedDestination?.id, accom.id);
    document.querySelector('.reservation-summary')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

// ==================== DISPONIBILIDAD ====================

async function _loadAvailability(mode, destinationId, accommodationId) {
    availabilityState.occupiedRanges = [];
    availabilityState.lastKey        = null;
    _updateCalendarStatus();

    const cacheKey = mode === 'alojamiento' && accommodationId
        ? `accom:${accommodationId}`
        : `entrada:${destinationId}`;
    availabilityState.lastKey = cacheKey;

    try {
        const params = new URLSearchParams({ destinationId });
        if (mode === 'alojamiento' && accommodationId) {
            params.set('accommodationId', accommodationId);
        } else {
            params.set('entranceOnly', 'true');
        }
        const res  = await fetch(`${API_BASE}/bookings/availability?${params}`);
        const json = await res.json();
        if (json.success && json.data?.occupiedRanges) {
            availabilityState.occupiedRanges = json.data.occupiedRanges.map(r => ({
                checkIn:  new Date(r.checkIn),
                checkOut: new Date(r.checkOut)
            }));
        }
    } catch (err) {
        console.warn('⚠️ No se cargaron fechas ocupadas:', err.message);
    }

    renderAvailabilityCalendar();
}

function hasDateConflict(checkIn, checkOut) {
    if (!checkIn || !checkOut) return false;
    const reqIn  = new Date(checkIn);
    const reqOut = new Date(checkOut);
    return availabilityState.occupiedRanges.some(r => reqIn < r.checkOut && reqOut > r.checkIn);
}

function isDateOccupied(date) {
    return availabilityState.occupiedRanges.some(r => date >= r.checkIn && date < r.checkOut);
}

// ==================== CALENDARIO VISUAL ====================

function renderAvailabilityCalendar() {
    if (!bookingTypeState.mode) return;

    let section = document.getElementById('availability-calendar-section');
    if (!section) section = _createCalendarSection();
    section.style.display = 'block';

    const titleEl = document.getElementById('av-cal-title');
    if (titleEl) {
        if (bookingTypeState.mode === 'alojamiento' && bookingTypeState.selectedAccom) {
            titleEl.textContent = `Disponibilidad · ${bookingTypeState.selectedAccom.nombre}`;
        } else if (bookingTypeState.mode === 'entrada') {
            titleEl.textContent = 'Disponibilidad · Visitas de día';
        }
    }

    const container = document.getElementById('av-cal-months');
    if (!container) return;
    container.innerHTML = '';

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (let m = 0; m < 2; m++) {
        container.appendChild(_buildMonthGrid(new Date(today.getFullYear(), today.getMonth() + m, 1), today));
    }

    _updateCalendarStatus();
}

function _buildMonthGrid(monthDate, today) {
    const year  = monthDate.getFullYear();
    const month = monthDate.getMonth();
    const monthNames = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
    const dayNames   = ['Do','Lu','Ma','Mi','Ju','Vi','Sa'];
    const firstDay   = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const wrapper = document.createElement('div');
    wrapper.style.cssText = 'flex:1;min-width:220px;';

    const header = document.createElement('div');
    header.style.cssText = 'text-align:center;font-weight:700;color:#195C33;margin-bottom:8px;font-size:14px;';
    header.textContent = `${monthNames[month]} ${year}`;
    wrapper.appendChild(header);

    const grid = document.createElement('div');
    grid.style.cssText = 'display:grid;grid-template-columns:repeat(7,1fr);gap:3px;';

    dayNames.forEach(d => {
        const cell = document.createElement('div');
        cell.style.cssText = 'text-align:center;font-size:11px;font-weight:600;color:#6b7280;padding:4px 0;';
        cell.textContent = d;
        grid.appendChild(cell);
    });

    for (let i = 0; i < firstDay; i++) grid.appendChild(document.createElement('div'));

    for (let day = 1; day <= daysInMonth; day++) {
        const date = new Date(year, month, day);
        date.setHours(0, 0, 0, 0);
        const cell = document.createElement('div');
        cell.style.cssText = 'text-align:center;font-size:12px;font-weight:500;padding:5px 2px;border-radius:6px;cursor:default;transition:all .15s;';
        cell.textContent = day;

        if (date < today) {
            cell.style.color = '#d1d5db';
        } else if (isDateOccupied(date)) {
            cell.style.background = '#fecaca'; cell.style.color = '#991b1b'; cell.title = 'No disponible';
        } else if (_isDateInSelectedRange(date)) {
            cell.style.background = '#195C33'; cell.style.color = 'white'; cell.title = 'Tu reserva';
        } else {
            cell.style.background = '#dcfce7'; cell.style.color = '#166534'; cell.title = 'Disponible';
        }
        grid.appendChild(cell);
    }
    wrapper.appendChild(grid);
    return wrapper;
}

function _isDateInSelectedRange(date) {
    if (!appState.checkInDate || !appState.checkOutDate) return false;
    return date >= new Date(appState.checkInDate) && date < new Date(appState.checkOutDate);
}

function _createCalendarSection() {
    const dateSection = document.querySelector('.form-section:has(#checkIn)');
    const section = document.createElement('div');
    section.id = 'availability-calendar-section';
    section.style.cssText = 'margin-bottom:36px;display:none;';
    section.innerHTML = `
        <div style="border:2px solid #e5e7eb;border-radius:16px;padding:24px;background:#fafafa;">
            <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;flex-wrap:wrap;gap:12px;">
                <h3 style="font-size:16px;font-weight:700;color:#195C33;display:flex;align-items:center;gap:8px;margin:0;">
                    <i class="fas fa-calendar-check" style="color:#F4C400;"></i>
                    <span id="av-cal-title">Disponibilidad</span>
                </h3>
                <div style="display:flex;align-items:center;gap:16px;font-size:12px;font-weight:600;flex-wrap:wrap;">
                    <span style="display:flex;align-items:center;gap:5px;"><span style="width:14px;height:14px;background:#dcfce7;border-radius:3px;display:inline-block;"></span>Disponible</span>
                    <span style="display:flex;align-items:center;gap:5px;"><span style="width:14px;height:14px;background:#fecaca;border-radius:3px;display:inline-block;"></span>Ocupado</span>
                    <span style="display:flex;align-items:center;gap:5px;"><span style="width:14px;height:14px;background:#195C33;border-radius:3px;display:inline-block;"></span>Tu selección</span>
                </div>
            </div>
            <div id="av-status-box" style="display:none;margin-bottom:16px;padding:12px 16px;border-radius:10px;font-size:14px;font-weight:600;"></div>
            <div id="av-cal-months" style="display:flex;gap:24px;flex-wrap:wrap;"></div>
            <p id="av-no-bookings" style="font-size:13px;color:#6b7280;text-align:center;margin:8px 0 0;display:none;">
                <i class="fas fa-check-circle" style="color:#10b981;"></i> ¡Todas las fechas están disponibles!
            </p>
        </div>`;
    if (dateSection) dateSection.insertAdjacentElement('afterend', section);
    else document.querySelector('.reservation-form')?.appendChild(section);
    return section;
}

function _updateCalendarStatus() {
    const box        = document.getElementById('av-status-box');
    const noBookings = document.getElementById('av-no-bookings');
    if (!box) return;

    if (noBookings) noBookings.style.display = availabilityState.occupiedRanges.length === 0 ? 'block' : 'none';

    if (!appState.checkInDate || !appState.checkOutDate) { box.style.display = 'none'; return; }

    box.style.display = 'block';
    const conflict = hasDateConflict(appState.checkInDate, appState.checkOutDate);
    const whatLabel = bookingTypeState.selectedAccom?.nombre || 'Este destino';

    if (conflict) {
        box.style.cssText = 'display:block;padding:12px 16px;border-radius:10px;font-size:14px;font-weight:600;background:#fee2e2;border:1px solid #fca5a5;color:#991b1b;';
        box.innerHTML = `<i class="fas fa-times-circle"></i> <strong>${whatLabel}</strong> ya está reservado en esas fechas. Por favor elige otras fechas.`;
        ['checkIn','checkOut'].forEach(id => {
            const el = document.getElementById(id);
            if (el) { el.style.borderColor = '#ef4444'; el.style.boxShadow = '0 0 0 4px rgba(239,68,68,0.1)'; }
        });
    } else {
        box.style.cssText = 'display:block;padding:12px 16px;border-radius:10px;font-size:14px;font-weight:600;background:#dcfce7;border:1px solid #86efac;color:#166534;';
        box.innerHTML = `<i class="fas fa-check-circle"></i> <strong>¡Fechas disponibles!</strong> Puedes continuar con tu reserva.`;
        ['checkIn','checkOut'].forEach(id => {
            const el = document.getElementById(id);
            if (el) { el.style.borderColor = '#e5e7eb'; el.style.boxShadow = 'none'; }
        });
    }
}

// ==================== FECHAS ====================

function handleCheckInChange(date) {
    appState.checkInDate = date;
    const co = document.getElementById('checkOut');
    if (co) {
        const minCO = new Date(date);
        minCO.setDate(minCO.getDate() + 1);
        co.min = minCO.toISOString().split('T')[0];
        if (co.value && co.value <= date) { co.value = ''; appState.checkOutDate = null; }
    }
    const el = document.getElementById('summaryCheckIn');
    if (el) el.textContent = formatDate(date);
    calculateTotalPrice();
    renderAvailabilityCalendar();
    _updateCalendarStatus();
}

function handleCheckOutChange(date) {
    appState.checkOutDate = date;
    const el = document.getElementById('summaryCheckOut');
    if (el) el.textContent = formatDate(date);
    calculateTotalPrice();
    renderAvailabilityCalendar();
    _updateCalendarStatus();
}

function calculateNights() {
    if (!appState.checkInDate || !appState.checkOutDate) return 0;
    return Math.max(0, Math.ceil((new Date(appState.checkOutDate) - new Date(appState.checkInDate)) / 86400000));
}

// ==================== PRECIOS ====================

function calculateTotalPrice() {
    const nights = calculateNights();
    const el = document.getElementById('summaryNights');
    if (el) el.textContent = nights;

    if (!appState.selectedDestination || nights === 0 || appState.selectedDestination.price === 0) {
        resetPriceDisplay(); return;
    }

    const basePrice  = appState.selectedDestination.price;
    const subtotal   = basePrice * nights;
    const serviceFee = subtotal * pricingConfig.serviceFeePercentage;
    const tax        = subtotal * pricingConfig.taxPercentage;
    const total      = subtotal + serviceFee + tax;

    _setText('summarySubtotal',   `${formatCurrency(subtotal)} COP`);
    _setText('summaryServiceFee', `${formatCurrency(serviceFee)} COP`);
    _setText('summaryTax',        `${formatCurrency(tax)} COP`);
    _setText('totalAmount',       `${formatCurrency(total)} COP`);
}

function resetPriceDisplay() {
    ['summarySubtotal','summaryServiceFee','summaryTax','totalAmount'].forEach(id => _setText(id, '$0 COP'));
}

// ==================== RESUMEN LATERAL ====================

function _updateSummaryAccom(type, accom, precio) {
    let block = document.getElementById('summary-booking-type');
    if (!block) {
        block = document.createElement('div');
        block.id = 'summary-booking-type';
        block.style.cssText = 'margin-bottom:20px;padding:16px;background:#f9fafb;border-radius:14px;border:1px solid #e5e7eb;';
        document.querySelector('.booking-details')?.insertAdjacentElement('beforebegin', block);
    }

    if (type === 'entrada') {
        block.innerHTML = `
            <div style="display:flex;align-items:center;gap:10px;">
                <span style="font-size:20px;">🎟️</span>
                <div>
                    <div style="font-size:13px;font-weight:700;color:#195C33;">Visita de día</div>
                    <div style="font-size:12px;color:#6b7280;">Entrada por persona</div>
                </div>
                <div style="margin-left:auto;font-size:15px;font-weight:800;color:#195C33;">${_fmt(precio)} COP</div>
            </div>`;
    } else if (accom) {
        const desayuno = accom.incluyeDesayuno
            ? '<span style="font-size:11px;color:#166534;background:#dcfce7;padding:2px 7px;border-radius:8px;"><i class="fas fa-coffee"></i> Desayuno incluido</span>'
            : '';
        block.innerHTML = `
            <div style="display:flex;align-items:flex-start;gap:10px;">
                <span style="font-size:22px;">${accom.tipo === 'glamping' ? '⛺' : '🏡'}</span>
                <div style="flex:1;min-width:0;">
                    <div style="font-size:13px;font-weight:700;color:#195C33;margin-bottom:3px;">${accom.nombre}</div>
                    <div style="font-size:12px;color:#6b7280;margin-bottom:5px;">Hasta ${accom.capacidadMax} personas · ${accom.tipo}</div>
                    ${desayuno}
                </div>
                <div style="text-align:right;flex-shrink:0;">
                    <div style="font-size:15px;font-weight:800;color:#195C33;">${_fmt(accom.precio)}</div>
                    <div style="font-size:11px;color:#9ca3af;">COP/noche</div>
                </div>
            </div>`;
    }
}

function _resetAccomSummary() {
    document.getElementById('summary-booking-type')?.remove();
}

// ==================== VALIDACIÓN COMPLETA ====================

function validateForm() {
    const errors = [];

    if (!appState.selectedServiceType) errors.push('Selecciona un tipo de servicio');
    if (!appState.selectedDestination) errors.push('Selecciona un destino');
    if (!bookingTypeState.mode)        errors.push('Elige si deseas visita de día o alojamiento');
    if (bookingTypeState.mode === 'alojamiento' && !bookingTypeState.selectedAccom)
                                       errors.push('Selecciona una cabaña o glamping');

    if (!appState.checkInDate || !appState.checkOutDate)
                                       errors.push('Completa las fechas de entrada y salida');
    if (calculateNights() < pricingConfig.minNights)
                                       errors.push('La reserva debe ser de al menos 1 noche');
    if (!appState.numPeople)           errors.push('Selecciona el número de personas');

    if (appState.checkInDate && appState.checkOutDate &&
        hasDateConflict(appState.checkInDate, appState.checkOutDate)) {
        errors.push('Las fechas seleccionadas no están disponibles para este alojamiento.');
    }

    [
        { id: 'fullName', fn: validateName,  label: 'El nombre del titular es inválido' },
        { id: 'email',    fn: validateEmail, label: 'El correo electrónico es inválido'  },
        { id: 'phone',    fn: validatePhone, label: 'El teléfono debe tener 10 dígitos'  }
    ].forEach(({ id, fn, label }) => {
        const el = document.getElementById(id);
        if (el && !fn(el, true)) errors.push(label);
    });

    const docType   = document.getElementById('documentType');
    const docNumber = document.getElementById('documentNumber');
    if (docType && !docType.value) errors.push('Selecciona el tipo de documento');
    if (docNumber && (!docNumber.value.trim() || docNumber.value.length < 6)) errors.push('Ingresa un número de documento válido');

    errors.push(...validateCompanions());

    const ec = document.getElementById('emergencyContact');
    const ep = document.getElementById('emergencyPhone');
    if (ec && !validateName(ec, true))  errors.push('El nombre del contacto de emergencia es inválido');
    if (ep && !validatePhone(ep, true)) errors.push('El teléfono de emergencia debe tener 10 dígitos');

    if (!document.getElementById('acceptTerms')?.checked)        errors.push('Debes aceptar los términos y condiciones');
    if (!document.getElementById('acceptCancellation')?.checked) errors.push('Debes aceptar las políticas de pago y reserva');

    return errors;
}

function validateCompanions() {
    const errors = [];
    const numCompanions = _peopleCount - 1;
    for (let i = 1; i <= numCompanions; i++) {
        const ni = document.getElementById(`companion-name-${i}`);
        const dt = document.getElementById(`companion-doctype-${i}`);
        const dn = document.getElementById(`companion-docnum-${i}`);
        if (!ni || !dt || !dn) { errors.push(`Faltan datos del acompañante #${i}`); continue; }
        if (!validateName(ni, true))  errors.push(`Nombre inválido del acompañante #${i}`);
        if (!dt.value)                errors.push(`Selecciona tipo de documento del acompañante #${i}`);
        if (!dn.value || dn.value.length < 6) errors.push(`Número de documento inválido del acompañante #${i}`);
    }
    return errors;
}

// ==================== ENVÍO ====================

function handleFormSubmit(e) {
    e.preventDefault();
    const activeUser = getActiveUser();
    if (!activeUser) {
        if (typeof showAuthModal === 'function') showAuthModal();
        return;
    }
    const errors = validateForm();
    if (errors.length > 0) { showErrors(errors); return; }

    const reservationData = collectFormData(activeUser);
    saveToLocalStorage(reservationData);
    showConfirmationModal(reservationData);
    sendToMongoDB(reservationData);
    console.log('✅ Reserva procesada:', reservationData.bookingCode);
}

// ==================== RECOLECCIÓN DE DATOS ====================

function collectFormData(activeUser) {
    const nights     = calculateNights();
    const basePrice  = appState.selectedDestination.price;
    const subtotal   = basePrice * nights;
    const serviceFee = subtotal * pricingConfig.serviceFeePercentage;
    const tax        = subtotal * pricingConfig.taxPercentage;
    const total      = subtotal + serviceFee + tax;

    const companions = [];
    const numCompanions = _peopleCount - 1;
    for (let i = 1; i <= numCompanions; i++) {
        const name    = document.getElementById(`companion-name-${i}`)?.value.trim()   || '';
        const docType = document.getElementById(`companion-doctype-${i}`)?.value       || '';
        const docNum  = document.getElementById(`companion-docnum-${i}`)?.value.trim() || '';
        if (name) companions.push({ name, documentType: docType, documentNumber: docNum });
    }

    const slug     = appState.selectedDestination?.slug || '';
    const siteData = sitesCatalog[slug] || {};

    // ✅ Recoger datos de pago según el método del sitio
    const paymentInfo = _getPaymentInfo(slug);

    const data = {
        bookingCode:   generateBookingCode(),
        timestamp:     new Date().toISOString(),
        createdAt:     new Date().toISOString(),
        serviceType:   appState.selectedServiceType,
        bookingMode:   bookingTypeState.mode || 'entrada',
        destination: {
            ...appState.selectedDestination,
            qrImageUrl: appState.selectedDestinationDb?.qrImageUrl || '',
            ...paymentInfo
        },
        checkIn:       appState.checkInDate,
        checkOut:      appState.checkOutDate,
        nights,
        numPeople:     appState.numPeople,
        personalInfo:  {
            fullName:       document.getElementById('fullName')?.value.trim()       || '',
            email:          (activeUser?.email || '').toLowerCase().trim(),
            phone:          document.getElementById('phone')?.value.trim()          || '',
            documentType:   document.getElementById('documentType')?.value          || '',
            documentNumber: document.getElementById('documentNumber')?.value.trim() || '',
            comments:       document.getElementById('comments')?.value.trim()       || ''
        },
        companions,
        emergencyContact: {
            name:  document.getElementById('emergencyContact')?.value.trim() || '',
            phone: document.getElementById('emergencyPhone')?.value.trim()   || ''
        },
        paymentMethod: siteData.paymentMethod || 'nequi',
        pricing: {
            basePrice,
            subtotal,
            serviceFee,
            serviceFeePercentage: Math.round(pricingConfig.serviceFeePercentage * 100),
            tax,
            taxPercentage: Math.round(pricingConfig.taxPercentage * 100),
            total
        },
        newsletter:    document.getElementById('acceptNewsletter')?.checked || false,
        status:        'pending'
    };

    if (bookingTypeState.selectedAccom) {
        const a = bookingTypeState.selectedAccom;
        data.accommodation = {
            id: a.id, nombre: a.nombre, tipo: a.tipo,
            capacidadMax: a.capacidadMax, incluyeDesayuno: a.incluyeDesayuno,
            precio: a.precio, amenidades: a.amenidades
        };
    }

    return data;
}

// ==================== HELPER: DATOS DE PAGO POR SITIO ====================

/**
 * Devuelve los datos de pago del sitio en un objeto plano para
 * embeber en destination al guardar la reserva.
 * Soporta paymentMethod: 'nequi' | 'bancolombia'
 */
function _getPaymentInfo(slug) {
    const s = sitesCatalog[slug];
    if (!s) return {};

    if (s.paymentMethod === 'bancolombia') {
        return {
            paymentMethod: 'bancolombia',
            bankAccount:   s.bankAccount  || '',
            bankTitular:   s.bankTitular  || '',
            bankCC:        s.bankCC       || '',
            bankType:      s.bankType     || 'Cuenta de Ahorros'
        };
    }

    // Nequi (default)
    return {
        paymentMethod: 'nequi',
        nequiNumber:   s.nequiNumber  || '',
        nequiTitular:  s.nequiTitular || ''
    };
}

function generateBookingCode() {
    return `GV-${new Date().getFullYear()}-${Math.floor(Math.random() * 9000) + 1000}`;
}

// ==================== PERSISTENCIA ====================

function saveToLocalStorage(reservationData) {
    try {
        const reservations = JSON.parse(localStorage.getItem('reservations') || '[]');
        reservations.push(reservationData);
        localStorage.setItem('reservations', JSON.stringify(reservations));
        localStorage.setItem('lastReservation', JSON.stringify(reservationData));
        try {
            const ch = new BroadcastChannel('gigante-viajero-notifications');
            ch.postMessage({ type: 'NEW_RESERVATION', data: reservationData, timestamp: Date.now() });
            ch.close();
        } catch (_) {
            const key = `reservation-trigger-${Date.now()}`;
            localStorage.setItem(key, JSON.stringify({ bookingCode: reservationData.bookingCode }));
            setTimeout(() => localStorage.removeItem(key), 1000);
        }
    } catch (err) {
        console.error('❌ Error guardando en localStorage:', err);
    }
}

async function sendToMongoDB(reservationData) {
    try {
        const res    = await fetch(`${API_BASE}/bookings`, {
            method:  'POST',
            headers: { 'Content-Type': 'application/json' },
            body:    JSON.stringify(reservationData)
        });
        const result = await res.json();

        if (res.status === 409) {
            alert(`⚠️ ${result.message}\n\nRevisa el calendario de disponibilidad.`);
            availabilityState.lastKey = null;
            await _loadAvailability(
                reservationData.bookingMode || 'entrada',
                reservationData.destination?.id,
                reservationData.accommodation?.id || null
            );
            return;
        }

        if (result.success) {
            console.log('✅ Reserva guardada en MongoDB:', result.data?.bookingCode);
        } else {
            console.warn('⚠️ MongoDB error:', result.message);
        }
    } catch (err) {
        console.warn('⚠️ Backend no disponible — reserva solo en localStorage:', err.message);
    }
}

// ==================== MODAL DE CONFIRMACIÓN ====================

function showConfirmationModal(reservationData) {
    const slug      = reservationData.destination?.slug;
    const siteData  = slug ? sitesCatalog[slug] : null;
    const total     = reservationData.pricing?.total || 0;
    const code      = reservationData.bookingCode;
    const fmt       = new Intl.NumberFormat('es-CO').format(Math.round(total));

    // ✅ Determinar bloque de pago según el método del sitio
    const paymentMethod = siteData?.paymentMethod || reservationData.paymentMethod || 'nequi';
    const paymentBlock  = paymentMethod === 'bancolombia'
        ? _buildBancolombiaBlock(siteData, reservationData, fmt, code)
        : _buildNequiBlock(siteData, reservationData, fmt, code);

    const modalContent = document.querySelector('#confirmModal .modal-content');
    if (!modalContent) return;

    modalContent.innerHTML = `
        <!-- Encabezado -->
        <div style="text-align:center;margin-bottom:20px;">
            <div style="width:72px;height:72px;background:linear-gradient(135deg,#10b981,#059669);border-radius:50%;display:flex;align-items:center;justify-content:center;margin:0 auto 16px;box-shadow:0 8px 24px rgba(16,185,129,.3);">
                <i class="fas fa-check" style="color:white;font-size:32px;"></i>
            </div>
            <h2 style="font-size:26px;font-weight:800;color:#195C33;margin:0 0 16px;">¡Reserva Registrada!</h2>
            <div style="background:linear-gradient(135deg,#F4C400,#FFE347);padding:14px 20px;border-radius:14px;display:inline-block;margin-bottom:12px;">
                <div style="font-size:11px;font-weight:700;color:#195C33;text-transform:uppercase;letter-spacing:1px;margin-bottom:4px;">Código de Reserva</div>
                <div id="bookingCode" style="font-size:22px;font-weight:900;color:#195C33;font-family:monospace;letter-spacing:2px;">${code}</div>
            </div>
            <p style="font-size:13px;color:#6b7280;line-height:1.6;margin:0 0 4px;">
                Realiza el pago al sitio y envía el comprobante por WhatsApp para confirmar tu reserva.
            </p>
        </div>

        ${paymentBlock}

        <!-- Botones -->
        <div style="display:flex;gap:12px;">
            <button onclick="location.reload()"
                    style="flex:1;padding:14px;background:linear-gradient(135deg,#195C33,#0d3d20);color:white;border:none;border-radius:12px;font-weight:700;font-size:14px;cursor:pointer;transition:all .3s;">
                <i class="fas fa-plus-circle"></i> Nueva Reserva
            </button>
            <button onclick="window.location.href='mis_reservas.html'"
                    style="flex:1;padding:14px;background:#f3f4f6;color:#374151;border:none;border-radius:12px;font-weight:700;font-size:14px;cursor:pointer;transition:all .3s;">
                <i class="fas fa-list"></i> Mis Reservas
            </button>
        </div>`;

    const modal = document.getElementById('confirmModal');
    if (modal) modal.classList.add('active');
}

// ──────────────────────────────────────────────────────────────────
// BLOQUE DE PAGO: BANCOLOMBIA (cuenta de ahorros)
// ──────────────────────────────────────────────────────────────────
function _buildBancolombiaBlock(siteData, reservationData, fmt, code) {
    const account  = siteData?.bankAccount  || reservationData.destination?.bankAccount  || '';
    const titular  = siteData?.bankTitular  || reservationData.destination?.bankTitular  || '';
    const cc       = siteData?.bankCC       || reservationData.destination?.bankCC       || '';
    const bankType = siteData?.bankType     || reservationData.destination?.bankType     || 'Cuenta de Ahorros';
    const hasAcc   = !!account;

    return `
    <div style="background:linear-gradient(135deg,#fffbeb,#fef3c7);border:2px solid #fcd34d;border-radius:18px;padding:20px;margin-bottom:20px;">

        <!-- Cabecera Bancolombia -->
        <div style="display:flex;align-items:center;gap:12px;margin-bottom:16px;">
            <div style="width:44px;height:44px;background:linear-gradient(135deg,#f59e0b,#d97706);border-radius:12px;display:flex;align-items:center;justify-content:center;flex-shrink:0;">
                <i class="fas fa-university" style="color:white;font-size:18px;"></i>
            </div>
            <div>
                <div style="font-size:15px;font-weight:800;color:#92400e;">Pago por Bancolombia</div>
                <div style="font-size:12px;color:#b45309;">${bankType} · Transfiere para confirmar tu reserva</div>
            </div>
        </div>

        ${hasAcc ? `
        <!-- Datos de la cuenta -->
        <div style="background:white;border:2px solid #f59e0b;border-radius:14px;padding:18px;margin-bottom:14px;">
            <div style="font-size:11px;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:1px;margin-bottom:14px;text-align:center;">Datos de la cuenta</div>

            <div style="display:grid;gap:10px;">
                <div style="display:flex;justify-content:space-between;align-items:center;padding:10px 14px;background:#fffbeb;border-radius:10px;">
                    <span style="font-size:12px;color:#6b7280;font-weight:600;">Banco</span>
                    <span style="font-size:14px;font-weight:800;color:#92400e;">Bancolombia</span>
                </div>
                <div style="display:flex;justify-content:space-between;align-items:center;padding:10px 14px;background:#fffbeb;border-radius:10px;">
                    <span style="font-size:12px;color:#6b7280;font-weight:600;">Tipo</span>
                    <span style="font-size:14px;font-weight:700;color:#374151;">${bankType}</span>
                </div>
                <div style="padding:10px 14px;background:#fffbeb;border-radius:10px;">
                    <div style="font-size:12px;color:#6b7280;font-weight:600;margin-bottom:6px;">Número de cuenta</div>
                    <div style="display:flex;align-items:center;justify-content:space-between;gap:10px;">
                        <span style="font-size:22px;font-weight:900;color:#92400e;letter-spacing:3px;font-family:monospace;">${account}</span>
                        <button onclick="navigator.clipboard.writeText('${account}').then(()=>this.innerHTML='<i class=\\'fas fa-check\\'></i>').catch(()=>{})"
                                style="padding:6px 12px;background:linear-gradient(135deg,#f59e0b,#d97706);color:white;border:none;border-radius:8px;font-size:12px;font-weight:700;cursor:pointer;display:inline-flex;align-items:center;gap:5px;white-space:nowrap;flex-shrink:0;">
                            <i class="fas fa-copy"></i> Copiar
                        </button>
                    </div>
                </div>
                ${titular ? `
                <div style="display:flex;justify-content:space-between;align-items:center;padding:10px 14px;background:#fffbeb;border-radius:10px;">
                    <span style="font-size:12px;color:#6b7280;font-weight:600;">Titular</span>
                    <span style="font-size:13px;font-weight:700;color:#374151;">${titular}</span>
                </div>` : ''}
                ${cc ? `
                <div style="display:flex;justify-content:space-between;align-items:center;padding:10px 14px;background:#fffbeb;border-radius:10px;">
                    <span style="font-size:12px;color:#6b7280;font-weight:600;">Cédula titular</span>
                    <span style="font-size:13px;font-weight:700;color:#374151;font-family:monospace;">${cc}</span>
                </div>` : ''}
            </div>
        </div>
        ` : `
        <div style="background:#fef9c3;border:1px solid #fde047;border-radius:12px;padding:12px;margin-bottom:14px;font-size:13px;color:#854d0e;">
            <i class="fas fa-exclamation-triangle"></i> Los datos bancarios de este sitio aún no están configurados. Contáctalos directamente.
        </div>
        `}

        <!-- Total -->
        <div style="background:white;border-radius:12px;padding:14px 16px;margin-bottom:14px;display:flex;justify-content:space-between;align-items:center;">
            <span style="font-size:14px;font-weight:700;color:#374151;">💰 Total a transferir</span>
            <span style="font-size:20px;font-weight:900;color:#92400e;">$${fmt} COP</span>
        </div>

        <!-- Instrucciones -->
        <div style="background:white;border-radius:12px;padding:14px 16px;margin-bottom:14px;">
            <div style="font-size:13px;font-weight:700;color:#374151;margin-bottom:10px;">
                <i class="fas fa-list-ol" style="color:#f59e0b;margin-right:6px;"></i>Instrucciones de pago
            </div>
            <ol style="margin:0;padding-left:18px;display:flex;flex-direction:column;gap:7px;">
                <li style="font-size:12px;color:#4b5563;">Abre tu app bancaria o sucursal virtual <strong>Bancolombia</strong>.</li>
                <li style="font-size:12px;color:#4b5563;">Ve a <strong>"Transferencias"</strong> y selecciona transferencia a otra cuenta Bancolombia.</li>
                <li style="font-size:12px;color:#4b5563;">Ingresa el número de cuenta: <strong style="color:#92400e;font-family:monospace;">${account || '—'}</strong>.</li>
                <li style="font-size:12px;color:#4b5563;">Ingresa el valor exacto: <strong style="color:#92400e;">$${fmt} COP</strong>.</li>
                <li style="font-size:12px;color:#4b5563;">En el mensaje / referencia escribe tu código: <strong style="color:#92400e;">${code}</strong>.</li>
                <li style="font-size:12px;color:#4b5563;">Envía captura del comprobante por WhatsApp al sitio.</li>
            </ol>
        </div>

        <!-- Aviso pendiente -->
        <div style="background:#fef3c7;border:1px solid #fcd34d;border-radius:12px;padding:12px 14px;display:flex;gap:8px;align-items:flex-start;">
            <i class="fas fa-info-circle" style="color:#d97706;font-size:15px;flex-shrink:0;margin-top:1px;"></i>
            <p style="margin:0;font-size:11px;color:#92400e;line-height:1.6;">
                Tu reserva queda en estado <strong>pendiente</strong> hasta que el sitio confirme el pago.
                Recibirás confirmación por correo electrónico.
            </p>
        </div>
    </div>`;
}

// ──────────────────────────────────────────────────────────────────
// BLOQUE DE PAGO: NEQUI (número de celular)
// ──────────────────────────────────────────────────────────────────
function _buildNequiBlock(siteData, reservationData, fmt, code) {
    const nequiNum  = siteData?.nequiNumber  || reservationData.destination?.nequiNumber  || '';
    const nequiName = siteData?.nequiTitular || reservationData.destination?.nequiTitular || reservationData.destination?.name || '';
    const hasNumber = !!nequiNum;

    return `
    <div style="background:linear-gradient(135deg,#f0fdf4,#dcfce7);border:2px solid #86efac;border-radius:18px;padding:20px;margin-bottom:20px;">

        <!-- Cabecera Nequi -->
        <div style="display:flex;align-items:center;gap:12px;margin-bottom:16px;">
            <div style="width:44px;height:44px;background:linear-gradient(135deg,#195C33,#0d3d20);border-radius:12px;display:flex;align-items:center;justify-content:center;flex-shrink:0;">
                <i class="fas fa-mobile-alt" style="color:white;font-size:18px;"></i>
            </div>
            <div>
                <div style="font-size:15px;font-weight:800;color:#195C33;">Pago por Nequi</div>
                <div style="font-size:12px;color:#166534;">Transfiere para confirmar tu reserva</div>
            </div>
        </div>

        ${hasNumber ? `
        <div style="background:white;border:2px solid #195C33;border-radius:14px;padding:18px;margin-bottom:14px;text-align:center;">
            <div style="font-size:10px;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:1px;margin-bottom:6px;">Número Nequi</div>
            <div style="font-size:28px;font-weight:900;color:#195C33;letter-spacing:3px;font-family:monospace;">${nequiNum}</div>
            ${nequiName ? `<div style="font-size:12px;color:#6b7280;margin-top:5px;">Titular: <strong style="color:#374151;">${nequiName}</strong></div>` : ''}
            <button onclick="navigator.clipboard.writeText('${nequiNum}').then(()=>this.innerHTML='<i class=\\'fas fa-check\\'></i> ¡Copiado!').catch(()=>{})"
                    style="margin-top:12px;padding:8px 18px;background:linear-gradient(135deg,#195C33,#0d3d20);color:white;border:none;border-radius:10px;font-size:13px;font-weight:700;cursor:pointer;display:inline-flex;align-items:center;gap:7px;">
                <i class="fas fa-copy"></i> Copiar número
            </button>
        </div>
        ` : `
        <div style="background:#fef9c3;border:1px solid #fde047;border-radius:12px;padding:12px;margin-bottom:14px;font-size:13px;color:#854d0e;">
            <i class="fas fa-exclamation-triangle"></i> El número Nequi de este sitio aún no está configurado. Contáctalos directamente.
        </div>
        `}

        <!-- Total -->
        <div style="background:white;border-radius:12px;padding:14px 16px;margin-bottom:14px;display:flex;justify-content:space-between;align-items:center;">
            <span style="font-size:14px;font-weight:700;color:#374151;">💰 Total a transferir</span>
            <span style="font-size:20px;font-weight:900;color:#195C33;">$${fmt} COP</span>
        </div>

        <!-- Instrucciones -->
        <div style="background:white;border-radius:12px;padding:14px 16px;margin-bottom:14px;">
            <div style="font-size:13px;font-weight:700;color:#374151;margin-bottom:10px;">
                <i class="fas fa-list-ol" style="color:#195C33;margin-right:6px;"></i>Instrucciones de pago
            </div>
            <ol style="margin:0;padding-left:18px;display:flex;flex-direction:column;gap:7px;">
                <li style="font-size:12px;color:#4b5563;">Abre la app <strong>Nequi</strong> en tu celular.</li>
                <li style="font-size:12px;color:#4b5563;">Toca <strong>"Enviar plata"</strong> e ingresa el número <strong style="color:#195C33;font-family:monospace;">${nequiNum || '—'}</strong>.</li>
                <li style="font-size:12px;color:#4b5563;">Ingresa el valor exacto: <strong style="color:#195C33;">$${fmt} COP</strong>.</li>
                <li style="font-size:12px;color:#4b5563;">En el mensaje escribe tu código: <strong style="color:#195C33;">${code}</strong>.</li>
                <li style="font-size:12px;color:#4b5563;">Envía captura del comprobante por WhatsApp al sitio.</li>
            </ol>
        </div>

        <!-- Aviso pendiente -->
        <div style="background:#fef3c7;border:1px solid #fcd34d;border-radius:12px;padding:12px 14px;display:flex;gap:8px;align-items:flex-start;">
            <i class="fas fa-info-circle" style="color:#d97706;font-size:15px;flex-shrink:0;margin-top:1px;"></i>
            <p style="margin:0;font-size:11px;color:#92400e;line-height:1.6;">
                Tu reserva queda en estado <strong>pendiente</strong> hasta que el sitio confirme el pago.
                Recibirás confirmación por correo electrónico.
            </p>
        </div>
    </div>`;
}

// ==================== BLOQUE DE PAGO EN EL FORMULARIO ====================

/**
 * ✅ Reemplaza renderFormNequiInfo() — ahora detecta automáticamente
 *    si el sitio usa Nequi o Bancolombia y muestra el bloque correcto.
 */
function renderFormPaymentInfo(slug) {
    const siteData = slug ? sitesCatalog[slug] : null;
    const method   = siteData?.paymentMethod || 'nequi';

    let block = document.getElementById('form-nequi-info');
    if (!block) {
        const paymentSection = document.querySelector('.payment-section, .form-section:last-of-type, #acceptTerms')?.closest('.form-section');
        if (!paymentSection) return;
        block = document.createElement('div');
        block.id = 'form-nequi-info';
        paymentSection.insertAdjacentElement('beforebegin', block);
    }

    if (method === 'bancolombia') {
        block.innerHTML = _formBancolombiaBlock(siteData);
    } else {
        block.innerHTML = _formNequiBlock(siteData);
    }
}

// Mantener alias para compatibilidad con código anterior que pudiera llamar a esta función
function renderFormNequiInfo(slug) {
    renderFormPaymentInfo(slug);
}

function _formBancolombiaBlock(siteData) {
    const account  = siteData?.bankAccount  || '';
    const titular  = siteData?.bankTitular  || '';
    const cc       = siteData?.bankCC       || '';
    const bankType = siteData?.bankType     || 'Cuenta de Ahorros';

    if (!account) {
        return `
        <div class="form-section">
            <h2 class="section-title">
                <i class="fas fa-university" style="font-size:20px;color:#F4C400;width:32px;height:32px;background:rgba(244,196,0,.1);border-radius:8px;display:flex;align-items:center;justify-content:center;"></i>
                Pago por Bancolombia
            </h2>
            <div style="background:#fef3c7;border:1px solid #fcd34d;border-radius:12px;padding:16px;font-size:14px;color:#92400e;">
                <i class="fas fa-exclamation-triangle"></i>
                <strong>Datos bancarios no configurados aún.</strong>
                Continúa con tu reserva y contacta al sitio para coordinar el pago.
            </div>
        </div>`;
    }

    return `
    <div class="form-section">
        <h2 class="section-title">
            <i class="fas fa-university" style="font-size:20px;color:#F4C400;width:32px;height:32px;background:rgba(244,196,0,.1);border-radius:8px;display:flex;align-items:center;justify-content:center;"></i>
            Pago por Bancolombia
        </h2>
        <div style="background:linear-gradient(135deg,#fffbeb,#fef3c7);border:2px solid #fcd34d;border-radius:16px;padding:20px;">
            <p style="font-size:14px;color:#92400e;margin:0 0 16px;">
                El pago se realiza directamente al sitio vía transferencia bancaria <strong>Bancolombia</strong>.
            </p>

            <div style="background:white;border:2px solid #f59e0b;border-radius:14px;padding:18px;margin-bottom:14px;">
                <div style="font-size:11px;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:1px;margin-bottom:12px;text-align:center;">Datos bancarios</div>
                <div style="display:grid;gap:8px;">
                    <div style="display:flex;justify-content:space-between;align-items:center;padding:8px 12px;background:#fffbeb;border-radius:8px;">
                        <span style="font-size:12px;color:#6b7280;font-weight:600;">Banco</span>
                        <span style="font-size:13px;font-weight:800;color:#92400e;">Bancolombia</span>
                    </div>
                    <div style="display:flex;justify-content:space-between;align-items:center;padding:8px 12px;background:#fffbeb;border-radius:8px;">
                        <span style="font-size:12px;color:#6b7280;font-weight:600;">Tipo de cuenta</span>
                        <span style="font-size:13px;font-weight:700;color:#374151;">${bankType}</span>
                    </div>
                    <div style="padding:8px 12px;background:#fffbeb;border-radius:8px;">
                        <div style="font-size:12px;color:#6b7280;font-weight:600;margin-bottom:6px;">Número de cuenta</div>
                        <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;">
                            <span style="font-size:20px;font-weight:900;color:#92400e;letter-spacing:2px;font-family:monospace;">${account}</span>
                            <button type="button"
                                    onclick="navigator.clipboard.writeText('${account}').then(()=>this.innerHTML='<i class=\\'fas fa-check\\'></i> ¡Copiado!').catch(()=>{})"
                                    style="padding:6px 14px;background:linear-gradient(135deg,#f59e0b,#d97706);color:white;border:none;border-radius:8px;font-size:12px;font-weight:700;cursor:pointer;display:inline-flex;align-items:center;gap:5px;white-space:nowrap;flex-shrink:0;">
                                <i class="fas fa-copy"></i> Copiar
                            </button>
                        </div>
                    </div>
                    ${titular ? `
                    <div style="display:flex;justify-content:space-between;align-items:center;padding:8px 12px;background:#fffbeb;border-radius:8px;">
                        <span style="font-size:12px;color:#6b7280;font-weight:600;">Titular</span>
                        <span style="font-size:13px;font-weight:700;color:#374151;">${titular}</span>
                    </div>` : ''}
                    ${cc ? `
                    <div style="display:flex;justify-content:space-between;align-items:center;padding:8px 12px;background:#fffbeb;border-radius:8px;">
                        <span style="font-size:12px;color:#6b7280;font-weight:600;">Cédula titular</span>
                        <span style="font-size:13px;font-weight:700;color:#374151;font-family:monospace;">${cc}</span>
                    </div>` : ''}
                </div>
            </div>

            <div style="font-size:12px;color:#92400e;background:white;border-radius:10px;padding:12px;line-height:1.7;">
                <strong>¿Cuándo pago?</strong> Una vez envíes la reserva, realiza la transferencia a la cuenta indicada.
                Escribe tu código de reserva en la referencia y envía el comprobante por WhatsApp al sitio.
            </div>
        </div>
    </div>`;
}

function _formNequiBlock(siteData) {
    const nequiNum  = siteData?.nequiNumber  || '';
    const nequiName = siteData?.nequiTitular || '';

    if (!nequiNum) {
        return `
        <div class="form-section">
            <h2 class="section-title">
                <i class="fas fa-mobile-alt" style="font-size:20px;color:#F4C400;width:32px;height:32px;background:rgba(244,196,0,.1);border-radius:8px;display:flex;align-items:center;justify-content:center;"></i>
                Pago por Nequi
            </h2>
            <div style="background:#fef3c7;border:1px solid #fcd34d;border-radius:12px;padding:16px;font-size:14px;color:#92400e;">
                <i class="fas fa-exclamation-triangle"></i>
                <strong>Número Nequi no configurado aún.</strong>
                El administrador del sitio deberá agregar el número. Por ahora continúa con tu reserva y contacta al sitio para coordinar el pago.
            </div>
        </div>`;
    }

    return `
    <div class="form-section">
        <h2 class="section-title">
            <i class="fas fa-mobile-alt" style="font-size:20px;color:#F4C400;width:32px;height:32px;background:rgba(244,196,0,.1);border-radius:8px;display:flex;align-items:center;justify-content:center;"></i>
            Pago por Nequi
        </h2>
        <div style="background:linear-gradient(135deg,#f0fdf4,#dcfce7);border:2px solid #86efac;border-radius:16px;padding:20px;">
            <p style="font-size:14px;color:#166534;margin:0 0 16px;">
                El pago se realiza directamente al sitio vía Nequi. Solo se acepta este método.
            </p>
            <div style="background:white;border:2px solid #195C33;border-radius:14px;padding:18px;text-align:center;margin-bottom:14px;">
                <div style="font-size:11px;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:1px;margin-bottom:6px;">Número Nequi del sitio</div>
                <div style="font-size:28px;font-weight:900;color:#195C33;letter-spacing:3px;font-family:monospace;">${nequiNum}</div>
                ${nequiName ? `<div style="font-size:13px;color:#6b7280;margin-top:4px;">Titular: <strong>${nequiName}</strong></div>` : ''}
                <button type="button"
                        onclick="navigator.clipboard.writeText('${nequiNum}').then(()=>this.innerHTML='<i class=\\'fas fa-check\\'></i> ¡Copiado!').catch(()=>{})"
                        style="margin-top:12px;padding:7px 18px;background:linear-gradient(135deg,#195C33,#0d3d20);color:white;border:none;border-radius:9px;font-size:13px;font-weight:700;cursor:pointer;display:inline-flex;align-items:center;gap:7px;">
                    <i class="fas fa-copy"></i> Copiar número
                </button>
            </div>
            <div style="font-size:12px;color:#166534;background:white;border-radius:10px;padding:12px;line-height:1.7;">
                <strong>¿Cuándo pago?</strong> Una vez envíes la reserva, realiza la transferencia por Nequi al número indicado.
                Escribe tu código de reserva en el mensaje y envía el comprobante por WhatsApp al sitio.
            </div>
        </div>
    </div>`;
}

// ==================== HELPERS ====================

function showErrors(errors) {
    alert(`⚠️ Por favor corrige los siguientes errores:\n\n• ${errors.join('\n• ')}`);
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function formatCurrency(amount) {
    return new Intl.NumberFormat('es-CO').format(Math.round(amount));
}

function formatDate(dateString) {
    if (!dateString) return '--/--/----';
    return new Date(dateString).toLocaleDateString('es-CO', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function resetDestinationPreview() {
    const pi = document.getElementById('previewImage');
    const pn = document.getElementById('previewName');
    const pl = document.getElementById('previewLocation');
    if (pi) pi.src = 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400&h=300&fit=crop';
    if (pn) pn.textContent = 'Selecciona un destino';
    if (pl) pl.textContent = 'Gigante, Huila';
    resetPriceDisplay();
}

function _setText(id, text) {
    const el = document.getElementById(id);
    if (el) el.textContent = text;
}

function _fmt(n) {
    return new Intl.NumberFormat('es-CO').format(n);
}

function _removeSection(id) {
    document.getElementById(id)?.remove();
}

function injectCalendarStyles() {
    if (document.getElementById('res-styles')) return;
    const s = document.createElement('style');
    s.id = 'res-styles';
    s.textContent = `
        @keyframes fadeInUp { from { opacity:0; transform:translateY(16px); } to { opacity:1; transform:translateY(0); } }
        #booking-type-section { animation: fadeInUp .35s ease both; }
        #accommodation-section { animation: fadeInUp .35s ease .1s both; }
        .accom-card { transition: all .3s cubic-bezier(.4,0,.2,1); }
        .accom-card:hover { transform: translateY(-4px); box-shadow: 0 16px 40px rgba(25,92,51,.15) !important; border-color: #195C33 !important; }
        .accom-card.selected { border-color: #195C33 !important; background: linear-gradient(135deg,#f0fdf4,#dcfce7) !important; }
        .accom-card.selected .accom-select-btn { background: linear-gradient(135deg,#195C33,#0d3d20) !important; color: white !important; }
    `;
    document.head.appendChild(s);
}

console.log('🚀 reservations.js cargado — versión unificada con soporte Nequi + Bancolombia');