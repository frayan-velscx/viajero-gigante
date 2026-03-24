// =============================================
// business-info.js  –  Gigante Viajero
// =============================================
// Carga los datos del negocio desde la API y los inyecta
// en los elementos HTML que tengan los data-attributes correspondientes.
//
// USO EN CUALQUIER PÁGINA HTML:
//
//   <!-- 1. Marca los elementos que quieres rellenar automáticamente -->
//   <span   data-biz="businessName"></span>
//   <a      data-biz="businessPhone"      href="#"></a>
//   <a      data-biz="businessWhatsapp"   href="#"></a>
//   <span   data-biz="businessAddress"></span>
//   <a      data-biz="businessInstagram"  href="#"></a>
//   <a      data-biz="businessFacebook"   href="#"></a>
//   <img    data-biz="businessLogo"       src="" alt="Logo">
//
//   <!-- 2. Incluye este script al final del body -->
//   <script src="../scripts/business-info.js"></script>
// =============================================

(function () {
    // ── URL del backend según entorno ─────────────────────────────
    const API_URL = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
        ? 'http://localhost:5000'
        : 'https://viajero-gigante.onrender.com') + '/api';

    // ── Valores de fallback (se usan si la API falla) ─────────────
    const FALLBACK = {
        businessName:      'Gigante Viajero',
        businessPhone:     '',
        businessWhatsapp:  '',
        businessAddress:   'Gigante, Huila, Colombia',
        businessLogo:      '../assets/img/logo.png',
        businessInstagram: '',
        businessFacebook:  ''
    };

    // ── Aplica los datos en el DOM ────────────────────────────────
    function applyBusinessInfo(data) {
        const info = { ...FALLBACK, ...data };

        document.querySelectorAll('[data-biz]').forEach(el => {
            const key = el.getAttribute('data-biz');
            const val = info[key] || '';
            if (!val) return;

            switch (key) {
                case 'businessLogo':
                    // Si es <img>, actualiza src; si no, el texto
                    if (el.tagName === 'IMG') el.src = val;
                    else el.textContent = val;
                    break;

                case 'businessPhone':
                    el.textContent = val;
                    if (el.tagName === 'A') el.href = `tel:${val.replace(/\s/g, '')}`;
                    break;

                case 'businessWhatsapp':
                    // Solo actualiza el href, nunca el contenido
                    // para no borrar el ícono ni el texto del botón
                    if (el.tagName === 'A') {
                        const waNum = val.replace(/[^0-9]/g, '');
                        el.href   = `https://wa.me/${waNum}`;
                        el.target = '_blank';
                        el.rel    = 'noopener noreferrer';
                        // Si el elemento está vacío, agrega texto de fallback
                        if (!el.textContent.trim() && !el.querySelector('i')) {
                            el.textContent = `+${val}`;
                        }
                    } else {
                        el.textContent = `+${val}`;
                    }
                    break;

                case 'businessInstagram':
                    el.textContent = val.startsWith('@') ? val : `@${val}`;
                    if (el.tagName === 'A') {
                        const handle = val.replace('@', '');
                        el.href   = `https://instagram.com/${handle}`;
                        el.target = '_blank';
                        el.rel    = 'noopener noreferrer';
                    }
                    break;

                case 'businessFacebook':
                    el.textContent = val;
                    if (el.tagName === 'A') {
                        const page = val.includes('facebook.com') ? val : `https://facebook.com/${val}`;
                        el.href   = page;
                        el.target = '_blank';
                        el.rel    = 'noopener noreferrer';
                    }
                    break;

                default:
                    el.textContent = val;
            }
        });

        // Dispara evento para que otras partes del sitio puedan reaccionar
        document.dispatchEvent(new CustomEvent('businessInfoLoaded', { detail: info }));
    }

    // ── Fetch desde la API ────────────────────────────────────────
    async function loadBusinessInfo() {
        // Intenta desde caché primero (para velocidad)
        try {
            const cached = sessionStorage.getItem('gv-biz-info');
            if (cached) {
                applyBusinessInfo(JSON.parse(cached));
                return; // sigue con la petición en background para actualizar
            }
        } catch (_) {}

        try {
            const res  = await fetch(`${API_URL}/settings/public`);
            const json = await res.json();

            if (json.ok && json.data) {
                sessionStorage.setItem('gv-biz-info', JSON.stringify(json.data));
                applyBusinessInfo(json.data);
            } else {
                applyBusinessInfo(FALLBACK);
            }
        } catch (err) {
            console.warn('⚠️ business-info.js: usando datos de fallback', err.message);
            applyBusinessInfo(FALLBACK);
        }
    }

    // ── Ejecutar cuando el DOM esté listo ────────────────────────
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', loadBusinessInfo);
    } else {
        loadBusinessInfo();
    }

    // ── API pública para forzar recarga manual ────────────────────
    window.GV = window.GV || {};
    window.GV.reloadBusinessInfo = () => {
        sessionStorage.removeItem('gv-biz-info');
        loadBusinessInfo();
    };

    // ── Escucha cambios desde el panel de administración ──────────
    // Cuando el admin guarda configuración, escribe 'gv-biz-updated'
    // en localStorage. El evento 'storage' se dispara en TODAS las
    // demás pestañas abiertas del navegador automáticamente.
    window.addEventListener('storage', function(e) {
        if (e.key === 'gv-biz-updated') {
            sessionStorage.removeItem('gv-biz-info');
            loadBusinessInfo();
        }
    });
})();