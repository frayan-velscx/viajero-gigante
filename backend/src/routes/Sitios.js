// =============================================
// routes/Sitios.js  –  Gigante Viajero
// =============================================

const express = require('express');
const router  = express.Router();
const {
    getSitios,
    getSitiosByCategoria,
    getSitioBySlug,
    getSitiosMapa,
    createSitio,
    updateSitio,
    deleteSitio
} = require('../controllers/sitiocontroller');

// ── Rutas de lectura ─────────────────────────────────────────────

// GET /api/sitios                    → todos los sitios activos
router.get('/', getSitios);

// GET /api/sitios/mapa/lugares       → datos para el mapa
// ⚠️  DEBE ir ANTES de /:slug para que "mapa" no sea interpretado como slug
router.get('/mapa/lugares', getSitiosMapa);

// GET /api/sitios/categoria/:tipo    → parque | mirador | glamping | hospedaje
// ⚠️  DEBE ir ANTES de /:slug
router.get('/categoria/:tipo', getSitiosByCategoria);

// GET /api/sitios/:slug              → detalle de un sitio
router.get('/:slug', getSitioBySlug);

// ── Rutas de escritura (panel de administración) ─────────────────

// POST   /api/sitios          → crear nuevo sitio
router.post('/', createSitio);

// PUT    /api/sitios/:slug    → editar sitio existente
router.put('/:slug', updateSitio);

// DELETE /api/sitios/:slug    → borrado suave (activo = false)
router.delete('/:slug', deleteSitio);

module.exports = router;