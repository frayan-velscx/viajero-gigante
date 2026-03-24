// =============================================
// SERVIDOR PRINCIPAL - GIGANTE VIAJERO
// =============================================

const express = require('express');
const cors    = require('cors');
const dotenv  = require('dotenv');
const path    = require('path');
const fs      = require('fs');

dotenv.config({ path: path.join(__dirname, '../.env') });

const { connectDB } = require('./config/database');
connectDB();

const app = express();

// ── Middleware global ─────────────────────────────────────────────────────────
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ── CORS específico para imágenes ─────────────────────────────────────────────
app.use('/uploads', (req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    next();
}, express.static(path.join(__dirname, '..', 'uploads')));

// ── Rutas existentes ──────────────────────────────────────────────────────────
app.use('/api/auth',     require('./routes/auth'));
app.use('/api/chat',     require('./routes/chatRoutes'));
app.use('/api/sitios',   require('./routes/Sitios'));
app.use('/api/Bookings', require('./routes/Bookings'));
app.use('/api/reviews',  require('./routes/reviews'));
app.use('/api/users/photo', require('./routes/Photo'));
app.use('/api/users',    require('./routes/users')); 
app.use('/api/settings', require('./routes/settings'));
// ── Servir frontend estático ──────────────────────────────────────────────────
const frontendPath = path.resolve(__dirname, '..', '..', 'frontend');

// Log de diagnóstico — visible en los logs de Render
console.log('📁 frontendPath:', frontendPath);
console.log('📁 frontend existe:', fs.existsSync(frontendPath));
console.log('📁 video existe:', fs.existsSync(path.join(frontendPath, 'assets', 'video', 'VID_20260310143913.mp4')));

// MIME types explícitos — soluciona el bloqueo "text/plain" en producción
const staticOptions = {
    setHeaders: (res, filePath) => {
        const ext = path.extname(filePath).toLowerCase();
        if (ext === '.js')   res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
        if (ext === '.css')  res.setHeader('Content-Type', 'text/css; charset=utf-8');
        if (ext === '.html') res.setHeader('Content-Type', 'text/html; charset=utf-8');
        if (ext === '.json') res.setHeader('Content-Type', 'application/json; charset=utf-8');
    }
};

app.use(express.static(frontendPath, staticOptions));
app.use('/scripts', express.static(path.join(frontendPath, 'scripts'), staticOptions));
app.use('/styles',  express.static(path.join(frontendPath, 'styles'),  staticOptions));
app.use('/assets',  express.static(path.join(frontendPath, 'assets'),  staticOptions));
app.get('/', (req, res) => {
    res.sendFile(path.join(frontendPath, 'pages', 'index.html'));
});
// ── Health check ──────────────────────────────────────────────────────────────
app.get('/api/health', (req, res) => {
    res.json({
        success:   true,
        message:   'Servidor funcionando',
        timestamp: new Date().toISOString()
    });
});

// ── Iniciar servidor ──────────────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    const env  = process.env.NODE_ENV || 'development';
    const now  = new Date().toLocaleString('es-CO', {
        year: 'numeric', month: '2-digit', day: '2-digit',
        hour: '2-digit', minute: '2-digit', second: '2-digit'
    });
    const line = '─'.repeat(50);

    console.log(`
╔${'═'.repeat(50)}╗
║${'          🌍  GIGANTE VIAJERO  —  API          '}║
╚${'═'.repeat(50)}╝
  Entorno  ›  ${env.padEnd(16)}Puerto  ›  ${PORT}
  Inicio   ›  ${now}

  Servicios
  ├─ ✅  Firebase        activo
  ├─ ✅  Email (Resend)  configurado
  ├─ ✅  Uploads         /uploads
  └─ ⏳  MongoDB         conectando...

  Rutas
  ├─ /api/auth       /api/sitios    /api/Bookings
  ├─ /api/reviews    /api/users     /api/chat
  └─ /api/health

${line}
  🚀  http://localhost:${PORT}
${line}
`)
});