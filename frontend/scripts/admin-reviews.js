// =============================================
// scripts/admin-reviews.js  —  Gigante Viajero
// Módulo completo de moderación de reseñas.
// Reemplaza la versión legacy (reviews-mod-root).
// =============================================

(function () {
    'use strict';

    const API = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
        ? 'http://localhost:5000'
        : 'https://backend-gigante.onrender.com') + '/api';
    const ITEMS_PER_PAGE = 9;

    // Estado interno del módulo
    const state = {
        all: [],          // todas las reseñas cargadas
        filtered: [],     // resultado después de aplicar filtros
        page: 1,
        loading: false,
        destinations: new Set()
    };

    // ── Helpers ────────────────────────────────────────────────

    function getToken() {
        return localStorage.getItem('techstore-auth-token') ||
               localStorage.getItem('token') || '';
    }

    function authH() {
        return { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` };
    }

    function fmt(ts) {
        if (!ts) return '—';
        return new Date(ts).toLocaleDateString('es-CO', {
            year: 'numeric', month: 'short', day: 'numeric'
        });
    }

    function starsHTML(n, size = 15) {
        return Array.from({ length: 5 }, (_, i) =>
            `<span class="star${i >= n ? ' empty' : ''}" style="font-size:${size}px;">★</span>`
        ).join('');
    }

    function statusBadge(status) {
        const map = {
            pending:  { cls: 'pending',  icon: 'fa-clock',       label: 'Pendiente' },
            approved: { cls: 'approved', icon: 'fa-check-circle', label: 'Aprobada'  },
            rejected: { cls: 'rejected', icon: 'fa-times-circle', label: 'Rechazada' }
        };
        const s = map[status] || map.pending;
        return `<span class="review-card-status ${s.cls}"><i class="fas ${s.icon}"></i> ${s.label}</span>`;
    }

    // ── Toast ──────────────────────────────────────────────────

    function toast(msg, ok = true) {
        const t = document.createElement('div');
        t.style.cssText = `
            position:fixed;bottom:28px;right:28px;z-index:99999;
            padding:14px 22px;border-radius:12px;font-weight:600;font-size:14px;
            color:white;box-shadow:0 8px 24px rgba(0,0,0,.2);
            background:${ok
                ? 'linear-gradient(135deg,#195C33,#2e7d32)'
                : 'linear-gradient(135deg,#e53935,#c62828)'};
            animation:rvSlideIn .3s ease;display:flex;align-items:center;gap:10px;`;
        t.innerHTML = `<i class="fas fa-${ok ? 'check-circle' : 'exclamation-circle'}"></i>${msg}`;
        document.body.appendChild(t);
        setTimeout(() => t.remove(), 3500);
    }

    // ── Render principal ───────────────────────────────────────

    function renderShell() {
        const section = document.getElementById('reviews-section');
        if (!section) return;

        section.innerHTML = `
        <!-- Stats bar -->
        <div class="section-header">
            <h2><i class="fas fa-star"></i> Reseñas</h2>
            <button class="btn-secondary" id="btnRefreshReviews" style="display:flex;align-items:center;gap:8px;">
                <i class="fas fa-sync-alt"></i> Actualizar
            </button>
        </div>

        <div class="reviews-stats-bar" id="reviewStatsBar">
            <div class="reviews-stat-card">
                <div class="reviews-stat-icon yellow"><i class="fas fa-star"></i></div>
                <div class="reviews-stat-info">
                    <div class="stat-num" id="reviewAvgRating">—</div>
                    <div class="stat-lbl">Promedio</div>
                    <div class="reviews-avg-stars" id="reviewAvgStars"></div>
                </div>
            </div>
            <div class="reviews-stat-card">
                <div class="reviews-stat-icon blue"><i class="fas fa-comments"></i></div>
                <div class="reviews-stat-info">
                    <div class="stat-num" id="reviewTotal">0</div>
                    <div class="stat-lbl">Total reseñas</div>
                </div>
            </div>
            <div class="reviews-stat-card">
                <div class="reviews-stat-icon amber"><i class="fas fa-hourglass-half"></i></div>
                <div class="reviews-stat-info">
                    <div class="stat-num" id="reviewPending">0</div>
                    <div class="stat-lbl">Pendientes</div>
                </div>
            </div>
            <div class="reviews-stat-card">
                <div class="reviews-stat-icon green"><i class="fas fa-check-circle"></i></div>
                <div class="reviews-stat-info">
                    <div class="stat-num" id="reviewApproved">0</div>
                    <div class="stat-lbl">Aprobadas</div>
                </div>
            </div>
        </div>

        <!-- Toolbar de filtros -->
        <div class="reviews-toolbar">
            <div class="reviews-search-wrap">
                <i class="fas fa-search"></i>
                <input type="text" id="reviewSearchInput" placeholder="Buscar por autor, destino o comentario...">
            </div>
            <select id="reviewFilterStatus" class="reviews-filter-select">
                <option value="all">Todos los estados</option>
                <option value="pending">Pendientes</option>
                <option value="approved">Aprobadas</option>
                <option value="rejected">Rechazadas</option>
            </select>
            <select id="reviewFilterRating" class="reviews-filter-select">
                <option value="all">Todas las estrellas</option>
                <option value="5">★★★★★ (5)</option>
                <option value="4">★★★★☆ (4)</option>
                <option value="3">★★★☆☆ (3)</option>
                <option value="2">★★☆☆☆ (2)</option>
                <option value="1">★☆☆☆☆ (1)</option>
            </select>
            <select id="reviewFilterDestination" class="reviews-filter-select">
                <option value="all">Todos los destinos</option>
            </select>
            <div class="reviews-date-range">
                <i class="fas fa-calendar-alt" style="color:#9ca3af;font-size:12px;"></i>
                <input type="date" id="reviewDateFrom" title="Desde">
                <span class="date-sep">–</span>
                <input type="date" id="reviewDateTo" title="Hasta">
            </div>
        </div>

        <!-- Grid de reseñas -->
        <div class="reviews-grid" id="reviewsGrid">
            <div class="reviews-empty">
                <span class="empty-icon"><i class="fas fa-spinner fa-spin" style="font-size:48px;color:#195C33;"></i></span>
                <p>Cargando reseñas...</p>
            </div>
        </div>

        <!-- Paginación -->
        <div class="reviews-pagination" id="reviewsPagination"></div>

        <!-- Legacy root — oculto -->
        <div id="reviews-mod-root" style="display:none!important;"></div>`;

        attachListeners();
    }

    // ── Listeners ──────────────────────────────────────────────

    function attachListeners() {
        const on = (id, ev, fn) => {
            const el = document.getElementById(id);
            if (el) el.addEventListener(ev, fn);
        };

        on('btnRefreshReviews', 'click', () => loadReviews());
        on('reviewSearchInput',       'input',  applyFilters);
        on('reviewFilterStatus',      'change', applyFilters);
        on('reviewFilterRating',      'change', applyFilters);
        on('reviewFilterDestination', 'change', applyFilters);
        on('reviewDateFrom',          'change', applyFilters);
        on('reviewDateTo',            'change', applyFilters);
    }

    // ── Carga de datos ─────────────────────────────────────────

    async function loadReviews() {
        if (state.loading) return;
        state.loading = true;

        const grid = document.getElementById('reviewsGrid');
        if (grid) grid.innerHTML = `
            <div class="reviews-empty">
                <span class="empty-icon"><i class="fas fa-spinner fa-spin" style="font-size:48px;color:#195C33;"></i></span>
                <p>Cargando reseñas...</p>
            </div>`;

        try {
            // Intentar cargar todas las reseñas (admin endpoint)
            const res  = await fetch(`${API}/reviews/admin/all`, { headers: authH() });
            const data = await res.json();
            state.all  = data.data || [];
        } catch (_) {
            // Fallback: solo pendientes
            try {
                const res  = await fetch(`${API}/reviews/admin/pending`, { headers: authH() });
                const data = await res.json();
                state.all  = data.data || [];
            } catch (err) {
                console.error('❌ Error cargando reseñas:', err);
                state.all = [];
            }
        }

        // Poblar selector de destinos
        state.destinations.clear();
        state.all.forEach(r => { if (r.sitioSlug) state.destinations.add(r.sitioSlug); });
        const destSelect = document.getElementById('reviewFilterDestination');
        if (destSelect) {
            const current = destSelect.value;
            destSelect.innerHTML = '<option value="all">Todos los destinos</option>' +
                [...state.destinations].map(d => `<option value="${d}">${d}</option>`).join('');
            if (current && current !== 'all') destSelect.value = current;
        }

        state.page = 1;
        updateStats();
        applyFilters();
        updateSidebarBadge();
        state.loading = false;
    }

    // ── Stats ──────────────────────────────────────────────────

    function updateStats() {
        const reviews  = state.all;
        const total    = reviews.length;
        const pending  = reviews.filter(r => r.status === 'pending' || !r.status).length;
        const approved = reviews.filter(r => r.status === 'approved').length;
        const withRating = reviews.filter(r => r.calificacion);
        const avg = withRating.length
            ? (withRating.reduce((s, r) => s + r.calificacion, 0) / withRating.length).toFixed(1)
            : '—';

        const set = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
        set('reviewTotal',     total);
        set('reviewPending',   pending);
        set('reviewApproved',  approved);
        set('reviewAvgRating', avg);

        const starsEl = document.getElementById('reviewAvgStars');
        if (starsEl && avg !== '—') {
            starsEl.innerHTML = starsHTML(Math.round(parseFloat(avg)), 13);
        }

        updateSidebarBadge(pending);
    }

    function updateSidebarBadge(n) {
        const badge = document.getElementById('pendingReviewsBadge');
        if (!badge) return;
        const count = n !== undefined ? n : state.all.filter(r => r.status === 'pending' || !r.status).length;
        badge.textContent = count;
        badge.style.display = count > 0 ? 'flex' : 'none';
    }

    // ── Filtros ────────────────────────────────────────────────

    function applyFilters() {
        const search  = (document.getElementById('reviewSearchInput')?.value || '').toLowerCase().trim();
        const status  = document.getElementById('reviewFilterStatus')?.value  || 'all';
        const rating  = document.getElementById('reviewFilterRating')?.value  || 'all';
        const dest    = document.getElementById('reviewFilterDestination')?.value || 'all';
        const from    = document.getElementById('reviewDateFrom')?.value;
        const to      = document.getElementById('reviewDateTo')?.value;

        state.filtered = state.all.filter(r => {
            const rStatus = r.status || 'pending';

            if (status !== 'all' && rStatus !== status) return false;
            if (rating !== 'all' && r.calificacion !== parseInt(rating)) return false;
            if (dest   !== 'all' && r.sitioSlug !== dest) return false;

            if (from) {
                const d = new Date(r.createdAt);
                if (d < new Date(from + 'T00:00:00')) return false;
            }
            if (to) {
                const d = new Date(r.createdAt);
                if (d > new Date(to + 'T23:59:59')) return false;
            }

            if (search) {
                const name    = (r.usuario?.nombre || '').toLowerCase();
                const comment = (r.comentario || '').toLowerCase();
                const slug    = (r.sitioSlug  || '').toLowerCase();
                if (!name.includes(search) && !comment.includes(search) && !slug.includes(search)) return false;
            }

            return true;
        });

        state.page = 1;
        renderGrid();
    }

    // ── Render tarjetas ────────────────────────────────────────

    function renderGrid() {
        const grid = document.getElementById('reviewsGrid');
        if (!grid) return;

        if (state.filtered.length === 0) {
            grid.innerHTML = `
                <div class="reviews-empty" style="grid-column:1/-1;">
                    <span class="empty-icon">📭</span>
                    <p>No se encontraron reseñas con los filtros actuales.</p>
                </div>`;
            renderPagination(0);
            return;
        }

        const start = (state.page - 1) * ITEMS_PER_PAGE;
        const page  = state.filtered.slice(start, start + ITEMS_PER_PAGE);

        grid.innerHTML = page.map(r => buildCard(r)).join('');
        renderPagination(state.filtered.length);
    }

    function buildCard(r) {
        const status   = r.status || 'pending';
        const initial  = (r.usuario?.nombre || 'A').charAt(0).toUpperCase();
        const isPending = status === 'pending';

        const actions = isPending ? `
            <button class="review-btn-approve" onclick="window._reviews.approve('${r._id}')">
                <i class="fas fa-check"></i> Aprobar
            </button>
            <button class="review-btn-reject" onclick="window._reviews.reject('${r._id}', '${(r.usuario?.nombre || '').replace(/'/g, "\\'")}')">
                <i class="fas fa-times"></i> Rechazar
            </button>` : `
            <button class="review-btn-delete" onclick="window._reviews.remove('${r._id}')">
                <i class="fas fa-trash-alt"></i> Eliminar
            </button>`;

        return `
        <div class="review-card ${status}" id="rv2-card-${r._id}">
            <div class="review-card-header">
                <div class="review-card-user">
                    <div class="review-avatar">${initial}</div>
                    <div>
                        <div class="review-user-name">${r.usuario?.nombre || 'Anónimo'}</div>
                        <div class="review-meta">
                            <span><i class="fas fa-map-marker-alt"></i> ${r.sitioSlug || '—'}</span>
                            <span><i class="fas fa-calendar"></i> ${fmt(r.createdAt)}</span>
                        </div>
                    </div>
                </div>
                <div class="review-stars">${starsHTML(r.calificacion || 0)}</div>
            </div>
            ${statusBadge(status)}
            <div class="review-body">"${r.comentario || ''}"</div>
            <div class="review-card-actions">${actions}</div>
        </div>`;
    }

    // ── Paginación ─────────────────────────────────────────────

    function renderPagination(total) {
        const pag = document.getElementById('reviewsPagination');
        if (!pag) return;
        const pages = Math.ceil(total / ITEMS_PER_PAGE);
        if (pages <= 1) { pag.innerHTML = ''; return; }

        let html = `<button onclick="window._reviews.goPage(${state.page - 1})" ${state.page === 1 ? 'disabled' : ''}>
                        <i class="fas fa-chevron-left"></i>
                    </button>`;

        for (let i = 1; i <= pages; i++) {
            if (pages > 7 && Math.abs(i - state.page) > 2 && i !== 1 && i !== pages) {
                if (i === 2 || i === pages - 1) html += `<button disabled>…</button>`;
                continue;
            }
            html += `<button class="${i === state.page ? 'active' : ''}" onclick="window._reviews.goPage(${i})">${i}</button>`;
        }

        html += `<button onclick="window._reviews.goPage(${state.page + 1})" ${state.page === pages ? 'disabled' : ''}>
                     <i class="fas fa-chevron-right"></i>
                 </button>`;
        pag.innerHTML = html;
    }

    // ── Acciones ───────────────────────────────────────────────

    async function approve(id) {
        try {
            const res  = await fetch(`${API}/reviews/admin/${id}/approve`, { method: 'PATCH', headers: authH() });
            const data = await res.json();
            if (!data.ok) throw new Error(data.message);

            // Actualizar estado local
            const r = state.all.find(r => r._id === id);
            if (r) r.status = 'approved';

            animateCard(id, 'out-right');
            setTimeout(() => { applyFilters(); updateStats(); }, 380);
            toast('✅ Reseña aprobada y publicada');
        } catch (err) {
            toast('⚠️ Error al aprobar: ' + err.message, false);
        }
    }

    async function reject(id, nombre) {
        if (!confirm(`¿Rechazar la reseña de "${nombre}"?\nSerá marcada como rechazada.`)) return;
        try {
            const res  = await fetch(`${API}/reviews/admin/${id}/reject`, { method: 'DELETE', headers: authH() });
            const data = await res.json();
            if (!data.ok) throw new Error(data.message);

            state.all = state.all.filter(r => r._id !== id);
            animateCard(id, 'out-left');
            setTimeout(() => { applyFilters(); updateStats(); }, 380);
            toast('❌ Reseña rechazada y eliminada');
        } catch (err) {
            toast('⚠️ Error al rechazar: ' + err.message, false);
        }
    }

    async function remove(id) {
        if (!confirm('¿Eliminar esta reseña permanentemente?')) return;
        try {
            const res  = await fetch(`${API}/reviews/admin/${id}`, { method: 'DELETE', headers: authH() });
            const data = await res.json();
            if (!data.ok) throw new Error(data.message);

            state.all = state.all.filter(r => r._id !== id);
            animateCard(id, 'out-left');
            setTimeout(() => { applyFilters(); updateStats(); }, 380);
            toast('🗑️ Reseña eliminada');
        } catch (err) {
            toast('⚠️ Error al eliminar: ' + err.message, false);
        }
    }

    function animateCard(id, dir) {
        const card = document.getElementById(`rv2-card-${id}`);
        if (!card) return;
        card.style.transition = 'all .35s ease';
        card.style.opacity    = '0';
        card.style.transform  = `translateX(${dir === 'out-right' ? '40px' : '-40px'})`;
    }

    function goPage(n) {
        const pages = Math.ceil(state.filtered.length / ITEMS_PER_PAGE);
        if (n < 1 || n > pages) return;
        state.page = n;
        renderGrid();
        document.getElementById('reviews-section')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    // ── Inicialización ─────────────────────────────────────────

    function init() {
        // Inyectar animaciones si no existen
        if (!document.getElementById('rv2-styles')) {
            const s = document.createElement('style');
            s.id = 'rv2-styles';
            s.textContent = `
                @keyframes rvSlideIn { from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:translateY(0)} }
            `;
            document.head.appendChild(s);
        }

        // Exponer API global
        window._reviews = { load: loadAll, approve, reject, remove, goPage };
        // Backward compat con el módulo legacy
        window._rvMod   = { load: loadAll, approve, reject };

        // Cargar badge inicial
        setTimeout(async () => {
            try {
                const res  = await fetch(`${API}/reviews/admin/pending`, { headers: authH() });
                const data = await res.json();
                updateSidebarBadge((data.data || []).length);
            } catch (_) {}
        }, 2000);

        // Escuchar navegación al apartado de reseñas
        document.querySelectorAll('.nav-item[data-section="reviews"]').forEach(btn => {
            btn.addEventListener('click', () => setTimeout(loadAll, 50));
        });
    }

    function loadAll() {
        renderShell();
        loadReviews();
    }

    document.addEventListener('DOMContentLoaded', init);

})();