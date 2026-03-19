// ═══════════════════════════════════════════════════════════
//  TuriBot · Gigante Viajero — Frontend JS v2.1
//  ✅ Integrado con AuthAPI (techstore-user-data / MongoDB)
//  ✅ Planificador de itinerarios personalizados
// ═══════════════════════════════════════════════════════════

const TURIBOT_API_URL = window.location.hostname === 'localhost'
    ? 'http://localhost:5000/api/chat'
    : 'https://viajero-gigante.onrender.com/api/chat';

// ─────────────────────────────────────────────────────────
//  OBTENER DATOS DEL USUARIO LOGUEADO (desde AuthAPI)
//  Lee el localStorage que llena auth-api.js automáticamente
// ─────────────────────────────────────────────────────────
function getTuribotUserData() {
    try {
        // Usa el mismo método que AuthAPI usa internamente
        const raw = localStorage.getItem("techstore-user-data");
        if (!raw) return { id: null, nombre: null };

        const user = JSON.parse(raw);

        // Toma el nombre más específico disponible
        const nombre =
            user.firstName ||                          // "Carlos"
            user.fullName?.split(" ")[0] ||            // primer nombre del fullName
            user.fullName ||                           // nombre completo si no hay split
            user.displayName ||                        // Google displayName
            null;

        return {
            id:     user.id || user._id || null,
            nombre: nombre,
            email:  user.email || null
        };
    } catch (e) {
        console.warn("TuriBot: no se pudo leer el usuario logueado", e);
        return { id: null, nombre: null };
    }
}

// ─────────────────────────────────────────────────────────
//  TOGGLE DEL CHAT
// ─────────────────────────────────────────────────────────
function toggleTuribot() {
    const bot = document.getElementById("turibot");
    const isOpen = bot.style.display === "flex";
    bot.style.display = isOpen ? "none" : "flex";

    if (!isOpen) {
        const messages = document.getElementById("turibotMessages");
        if (messages.children.length === 0) mostrarBienvenida();
        document.getElementById("turibotInput").focus();
    }
}

// ─────────────────────────────────────────────────────────
//  BIENVENIDA PERSONALIZADA CON EL NOMBRE DEL USUARIO
// ─────────────────────────────────────────────────────────
function mostrarBienvenida() {
    const { nombre } = getTuribotUserData();
    const saludo = nombre
        ? `☕ ¡Hola, <strong>${nombre}</strong>! Soy <strong>TuriBot</strong>, tu guía en Gigante, Huila.`
        : `☕ ¡Hola! Soy <strong>TuriBot</strong>, tu guía en <strong>Gigante, Huila</strong>.`;

    const messages = document.getElementById("turibotMessages");
    messages.innerHTML = `
        <div class="bot-msg bienvenida">
            ${saludo}<br><br>
            Puedo ayudarte con:<br>
            🗺️ <strong>Planes personalizados</strong><br>
            🏔️ <strong>Sitios turísticos</strong><br>
            🍫 <strong>Experiencias de café y cacao</strong><br>
            💰 <strong>Costos y recomendaciones</strong><br><br>
            ¿Qué te gustaría explorar hoy?
        </div>
        <div class="quick-buttons">
            <button onclick="enviarSugerencia('¿Qué hacer un fin de semana en Gigante?')">🗓️ Fin de semana</button>
            <button onclick="enviarSugerencia('Plan romántico en Gigante')">💑 Plan romántico</button>
            <button onclick="enviarSugerencia('¿Cuánto cuesta ir al Quimbo?')">💰 Costos</button>
            <button onclick="abrirPlanificador()">📋 Armar mi plan</button>
        </div>
    `;
}

// ─────────────────────────────────────────────────────────
//  SUGERENCIAS RÁPIDAS
// ─────────────────────────────────────────────────────────
function enviarSugerencia(texto) {
    document.getElementById("turibotInput").value = texto;
    sendTuribotMessage();
}

// ═══════════════════════════════════════════════════════════
//  PLANIFICADOR DE ITINERARIOS 🗺️
// ═══════════════════════════════════════════════════════════
function abrirPlanificador() {
    const messages = document.getElementById("turibotMessages");
    messages.innerHTML += `
        <div class="bot-msg planificador-form">
            <strong>🗺️ Armemos tu plan ideal</strong><br>
            <small>Completa los datos y la IA te arma todo el itinerario:</small>

            <div class="plan-campo">
                <label>💰 ¿Cuánto presupuesto tienes? (COP)</label>
                <input type="number" id="plan-presupuesto" placeholder="Ej: 200000" min="0" />
            </div>

            <div class="plan-campo">
                <label>📅 ¿Cuántos días?</label>
                <div class="plan-botones" id="dias-selector">
                    <button class="plan-op" onclick="seleccionarOpcion(this,'dias-selector')">1 día</button>
                    <button class="plan-op" onclick="seleccionarOpcion(this,'dias-selector')">2 días</button>
                    <button class="plan-op" onclick="seleccionarOpcion(this,'dias-selector')">3 días</button>
                    <button class="plan-op" onclick="seleccionarOpcion(this,'dias-selector')">Fin de semana</button>
                </div>
            </div>

            <div class="plan-campo">
                <label>👥 ¿Con quién viajas?</label>
                <div class="plan-botones" id="conquien-selector">
                    <button class="plan-op" onclick="seleccionarOpcion(this,'conquien-selector')">Solo/a</button>
                    <button class="plan-op" onclick="seleccionarOpcion(this,'conquien-selector')">En pareja</button>
                    <button class="plan-op" onclick="seleccionarOpcion(this,'conquien-selector')">Con familia</button>
                    <button class="plan-op" onclick="seleccionarOpcion(this,'conquien-selector')">Con amigos</button>
                </div>
            </div>

            <div class="plan-campo">
                <label>🎯 ¿Qué tipo de plan?</label>
                <div class="plan-botones" id="tipo-selector">
                    <button class="plan-op" onclick="seleccionarOpcion(this,'tipo-selector')">💑 Romántico</button>
                    <button class="plan-op" onclick="seleccionarOpcion(this,'tipo-selector')">🧗 Aventura</button>
                    <button class="plan-op" onclick="seleccionarOpcion(this,'tipo-selector')">🌿 Ecológico</button>
                    <button class="plan-op" onclick="seleccionarOpcion(this,'tipo-selector')">💰 Económico</button>
                    <button class="plan-op" onclick="seleccionarOpcion(this,'tipo-selector')">👨‍👩‍👧 Familiar</button>
                </div>
            </div>

            <div class="plan-campo">
                <label>🚗 ¿Tienes transporte propio?</label>
                <div class="plan-botones" id="transporte-selector">
                    <button class="plan-op" onclick="seleccionarOpcion(this,'transporte-selector')">✅ Sí</button>
                    <button class="plan-op" onclick="seleccionarOpcion(this,'transporte-selector')">🚌 No, usaré local</button>
                </div>
            </div>

            <button class="plan-generar" onclick="generarItinerario()">
                ✨ Generar mi plan personalizado
            </button>
        </div>
    `;
    messages.scrollTop = messages.scrollHeight;
}

function seleccionarOpcion(btn, grupoId) {
    document.querySelectorAll(`#${grupoId} .plan-op`).forEach(b => b.classList.remove("selected"));
    btn.classList.add("selected");
}

async function generarItinerario() {
    const presupuesto   = document.getElementById("plan-presupuesto")?.value || "";
    const dias          = document.querySelector("#dias-selector .selected")?.textContent?.trim() || "";
    const conQuien      = document.querySelector("#conquien-selector .selected")?.textContent?.trim() || "";
    const tipoViaje     = document.querySelector("#tipo-selector .selected")?.textContent?.trim() || "";
    const transporteEl  = document.querySelector("#transporte-selector .selected");
    const tieneTransporte = transporteEl ? transporteEl.textContent.includes("Sí") : null;

    if (!presupuesto && !dias && !tipoViaje) {
        mostrarMensajeBot("⚠️ Por favor completa al menos algunos campos del formulario.");
        return;
    }

    const partes = [];
    if (presupuesto) partes.push(`tengo ${parseInt(presupuesto).toLocaleString("es-CO")} pesos`);
    if (dias)        partes.push(`voy ${dias}`);
    if (conQuien)    partes.push(`viajo ${conQuien.toLowerCase()}`);
    if (tipoViaje)   partes.push(`quiero un plan ${tipoViaje.replace(/[^\w\sáéíóúñ]/gi,"").toLowerCase()}`);

    const mensajeUsuario = partes.length > 0
        ? `Necesito un itinerario: ${partes.join(", ")}.`
        : "Arma un plan turístico para Gigante";

    const messages = document.getElementById("turibotMessages");
    messages.innerHTML += `<div class="user-msg">📋 ${mensajeUsuario}</div>`;
    messages.scrollTop  = messages.scrollHeight;

    await sendTuribotMessage(mensajeUsuario, {
        presupuesto:        presupuesto || null,
        dias:               dias || null,
        tipoViaje:          tipoViaje || null,
        conQuien:           conQuien || null,
        tieneTransporte:    tieneTransporte,
        quiereRestaurantes: true
    });
}

// ═══════════════════════════════════════════════════════════
//  ENVÍO DE MENSAJES — FUNCIÓN PRINCIPAL
// ═══════════════════════════════════════════════════════════
async function sendTuribotMessage(textoOverride = null, extras = {}) {
    const input    = document.getElementById("turibotInput");
    const messages = document.getElementById("turibotMessages");
    const text     = textoOverride || input.value.trim();

    if (!text) return;

    // Mostrar burbuja del usuario solo si viene del input manual
    if (!textoOverride) {
        messages.innerHTML += `<div class="user-msg">${escapeHtml(text)}</div>`;
        input.value = "";
    }

    // Loader
    const loaderId = "loader-" + Date.now();
    messages.innerHTML += `
        <div class="bot-msg" id="${loaderId}">
            <div class="loader"><span></span><span></span><span></span></div>
        </div>
    `;
    messages.scrollTop = messages.scrollHeight;

    try {
        // ── Lee el usuario del localStorage de AuthAPI ──────
        const { id: userId, nombre: nombreUsuario } = getTuribotUserData();

        const body = {
            message: text,
            userId,           // ID para que el backend consulte la BD
            nombreUsuario,    // Nombre ya resuelto en el frontend (backup rápido)
            ...extras
        };

        const r = await fetch(TURIBOT_API_URL, {
            method:  "POST",
            headers: { "Content-Type": "application/json" },
            body:    JSON.stringify(body)
        });

        if (!r.ok) throw new Error(`HTTP ${r.status}`);

        const data = await r.json();
        const replyHtml = formatearRespuesta(data.reply);
        document.getElementById(loaderId).innerHTML = replyHtml;

        // Botón copiar si fue itinerario
        if (data.modoItinerario) {
            document.getElementById(loaderId).innerHTML += `
                <div class="itinerario-actions">
                    <button onclick="copiarItinerario(this)">📋 Copiar plan</button>
                </div>
            `;
        }

    } catch (e) {
        console.error("TuriBot error:", e);
        document.getElementById(loaderId).innerHTML =
            "⚠️ Error al conectar con el servidor. Intenta de nuevo.";
    }

    messages.scrollTop = messages.scrollHeight;
}

// ─────────────────────────────────────────────────────────
//  UTILIDADES
// ─────────────────────────────────────────────────────────
function mostrarMensajeBot(texto) {
    const messages = document.getElementById("turibotMessages");
    messages.innerHTML += `<div class="bot-msg">${texto}</div>`;
    messages.scrollTop  = messages.scrollHeight;
}

function formatearRespuesta(texto) {
    if (!texto) return "";
    return texto
        .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
        .replace(/\*(.*?)\*/g,     "<em>$1</em>")
        .replace(/\n---\n/g,       "<hr>")
        .replace(/\n/g,            "<br>");
}

function copiarItinerario(btn) {
    const texto = btn.closest(".bot-msg").innerText.replace("📋 Copiar plan","").trim();
    navigator.clipboard.writeText(texto).then(() => {
        btn.textContent = "✅ ¡Copiado!";
        setTimeout(() => { btn.textContent = "📋 Copiar plan"; }, 2000);
    });
}

function escapeHtml(str) {
    const div = document.createElement("div");
    div.appendChild(document.createTextNode(str));
    return div.innerHTML;
}

// ─────────────────────────────────────────────────────────
//  RE-RENDERIZAR BIENVENIDA SI EL USUARIO HACE LOGIN/LOGOUT
//  (escucha los eventos que ya dispara auth-api.js)
// ─────────────────────────────────────────────────────────
window.addEventListener("userLoggedIn", () => {
    const messages = document.getElementById("turibotMessages");
    if (messages && messages.children.length <= 2) {
        // Actualiza la bienvenida con el nombre recién logueado
        mostrarBienvenida();
    }
});

window.addEventListener("userLoggedOut", () => {
    const messages = document.getElementById("turibotMessages");
    if (messages) messages.innerHTML = "";
});

// ─────────────────────────────────────────────────────────
//  ENTER PARA ENVIAR
// ─────────────────────────────────────────────────────────
document.addEventListener("DOMContentLoaded", () => {
    const inputEl = document.getElementById("turibotInput");
    if (inputEl) {
        inputEl.addEventListener("keydown", e => {
            if (e.key === "Enter") { e.preventDefault(); sendTuribotMessage(); }
        });
    }
});