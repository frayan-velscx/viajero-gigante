// =============================================
// scripts/reviews.js  –  Gigante Viajero
// Ruta: frontend/scripts/reviews.js
// =============================================

(function () {
  'use strict';

  const API_BASE = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
      ? 'http://localhost:5000'
      : 'https://viajero-gigante.onrender.com') + '/api';

  // ── Slug del sitio ────────────────────────────────────────
  function getSlug() {
    return document.body.dataset.slug || '';
  }

  // ── Token JWT ─────────────────────────────────────────────
  // ✅ CORRECCIÓN CLAVE: busca en AMBOS lugares
  // Login normal  → 'techstore-auth-token'
  // Login Google  → 'gigante_token'
  function getToken() {
    return localStorage.getItem('techstore-auth-token')
        || localStorage.getItem('gigante_token')
        || null;
  }

  // ── Usuario actual (JWT propio o Google/Firebase) ─────────
  function getCurrentUser() {
    // 1. Login normal (auth-api.js)
    if (typeof authAPI !== 'undefined' && authAPI.isAuthenticated()) {
      const u = authAPI.getUser();
      if (u) return u;
    }
    // 2. Login con Google (gigante_user en localStorage)
    try {
      if (localStorage.getItem('gigante_auth') === 'true') {
        const u = JSON.parse(localStorage.getItem('gigante_user'));
        if (u && u.email) return u;
      }
    } catch(e) {}
    return null;
  }

  // ── ID del usuario ────────────────────────────────────────
  function getUserId(user) {
    if (!user) return '';
    return user.id || user._id || '';
  }

  // ── Estrellas en HTML ─────────────────────────────────────
  function starsHTML(rating, size) {
    size = size || '1rem';
    let h = '';
    for (let i = 1; i <= 5; i++)
      h += `<span style="color:${i <= rating ? '#fdd835' : '#ddd'};font-size:${size};">&#9733;</span>`;
    return h;
  }

  // ── Fecha legible ─────────────────────────────────────────
  function formatDate(iso) {
    return new Date(iso).toLocaleDateString('es-CO', {
      year: 'numeric', month: 'long', day: 'numeric'
    });
  }

  // ── Iniciales del nombre ──────────────────────────────────
  function getInitials(nombre) {
    return (nombre || 'U').split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
  }

  // =========================================================
  // RESUMEN: promedio + barras de distribución
  // =========================================================
  function renderSummary({ promedio, total, distribucion }) {
    const pe = document.getElementById('rv-promedio');
    const se = document.getElementById('rv-stars-display');
    const te = document.getElementById('rv-total');
    const be = document.getElementById('rv-bars');
    if (!pe) return;

    pe.textContent = total > 0 ? Number(promedio).toFixed(1) : '–';
    se.innerHTML   = total > 0 ? starsHTML(Math.round(promedio), '1.6rem') : '';
    te.textContent = total === 0
      ? 'Sin reseñas aún'
      : `${total} reseña${total !== 1 ? 's' : ''}`;

    be.innerHTML = '';
    for (let i = 5; i >= 1; i--) {
      const count = distribucion[i] || 0;
      const pct   = total > 0 ? Math.round((count / total) * 100) : 0;
      be.innerHTML +=
        `<div class="bar-row">
          <span class="bar-label">${i} &#9733;</span>
          <div class="bar-track"><div class="bar-fill" style="width:${pct}%"></div></div>
          <span class="bar-count">${count}</span>
        </div>`;
    }
  }

  // =========================================================
  // FORMULARIO DE RESEÑA
  // =========================================================
  function renderForm(user, userHasReviewed) {
    const c = document.getElementById('review-form-container');
    if (!c) return;

    // Sin sesión → prompt de login
    if (!user) {
      c.innerHTML =
        `<div class="review-login-prompt">
          <p>✍️ ¿Visitaste este lugar? <strong>Inicia sesión</strong> para dejar tu reseña.</p>
          <a href="login.html">Iniciar Sesión</a>
        </div>`;
      return;
    }

    // Ya dejó reseña
    if (userHasReviewed) {
      c.innerHTML =
        `<div class="review-login-prompt">
          <p>✅ <strong>Ya dejaste una reseña</strong> para este sitio. ¡Gracias por tu opinión!</p>
        </div>`;
      return;
    }

    // Badge según proveedor
    const providerBadge = user.provider === 'google'
      ? `<p style="font-size:13px;color:#4285F4;margin-bottom:12px;">🔵 Comentando como <strong>${user.email}</strong> (Google)</p>`
      : `<p style="font-size:13px;color:#195C33;margin-bottom:12px;">🟢 Comentando como <strong>${user.email}</strong></p>`;

    c.innerHTML =
      `<div class="review-form-wrapper">
        <h3>✍️ Deja tu reseña</h3>
        ${providerBadge}
        <p class="form-subtitle">Comparte tu experiencia con otros viajeros.</p>

        <div class="star-selector">
          <input type="radio" name="rv-stars" id="s5" value="5"><label for="s5" title="5 – Excelente">&#9733;</label>
          <input type="radio" name="rv-stars" id="s4" value="4"><label for="s4" title="4 – Muy bueno">&#9733;</label>
          <input type="radio" name="rv-stars" id="s3" value="3"><label for="s3" title="3 – Bueno">&#9733;</label>
          <input type="radio" name="rv-stars" id="s2" value="2"><label for="s2" title="2 – Regular">&#9733;</label>
          <input type="radio" name="rv-stars" id="s1" value="1"><label for="s1" title="1 – Pésimo">&#9733;</label>
        </div>

        <textarea id="rv-comentario" class="review-textarea"
          placeholder="Cuéntanos tu experiencia (mín. 10 caracteres)"
          maxlength="1000"></textarea>
        <div class="review-char-count"><span id="rv-char-count">0</span> / 1000</div>

        <button class="btn-submit-review" id="btn-submit-review">Publicar Reseña</button>
        <div class="review-msg" id="review-msg"></div>
      </div>`;

    document.getElementById('rv-comentario').addEventListener('input', function () {
      document.getElementById('rv-char-count').textContent = this.value.length;
    });

    document.getElementById('btn-submit-review').addEventListener('click', submitReview);
  }

  // =========================================================
  // ENVIAR RESEÑA
  // =========================================================
  async function submitReview() {
    const btn        = document.getElementById('btn-submit-review');
    const msgEl      = document.getElementById('review-msg');
    const slug       = getSlug();
    const token      = getToken();
    const selected   = document.querySelector('input[name="rv-stars"]:checked');
    const comentario = document.getElementById('rv-comentario').value.trim();

    msgEl.className   = 'review-msg';
    msgEl.textContent = '';

    if (!token) {
      msgEl.className   = 'review-msg error';
      msgEl.textContent = '⚠️ Debes iniciar sesión para publicar una reseña.';
      return;
    }
    if (!selected) {
      msgEl.className   = 'review-msg error';
      msgEl.textContent = '⭐ Selecciona una calificación antes de enviar.';
      return;
    }
    if (comentario.length < 10) {
      msgEl.className   = 'review-msg error';
      msgEl.textContent = '📝 El comentario debe tener al menos 10 caracteres.';
      return;
    }

    btn.disabled    = true;
    btn.textContent = 'Enviando...';

    try {
      const res = await fetch(`${API_BASE}/reviews/${slug}`, {
        method:  'POST',
        headers: {
          'Content-Type':  'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          calificacion: parseInt(selected.value),
          comentario
        })
      });

      // Token de Google expirado (duran 1 hora)
      if (res.status === 401) {
        msgEl.className   = 'review-msg error';
        msgEl.textContent = '⚠️ Tu sesión expiró. Por favor vuelve a iniciar sesión.';
        btn.disabled    = false;
        btn.textContent = 'Publicar Reseña';
        return;
      }

      const data = await res.json();

      if (data.ok) {
        msgEl.className   = 'review-msg success';
        msgEl.textContent = '⏳ ¡Gracias por tu reseña! Está en revisión y se publicará pronto.';
        document.getElementById('rv-comentario').value = '';
        document.getElementById('rv-char-count').textContent = '0';
        document.querySelectorAll('input[name="rv-stars"]').forEach(i => i.checked = false);
      } else {
        msgEl.className   = 'review-msg error';
        msgEl.textContent = '⚠️ ' + (data.message || 'Error al publicar la reseña.');
      }
    } catch(e) {
      msgEl.className   = 'review-msg error';
      msgEl.textContent = '⚠️ Error de conexión. Intenta de nuevo.';
    } finally {
      btn.disabled    = false;
      btn.textContent = 'Publicar Reseña';
    }
  }

  // =========================================================
  // LISTA DE RESEÑAS
  // =========================================================
  function renderList(reviews, currentUser) {
    const c = document.getElementById('reviews-list-container');
    if (!c) return;

    if (!reviews.length) {
      c.innerHTML =
        `<div class="reviews-empty">
          <div class="empty-icon">💬</div>
          <p>Sé el primero en reseñar este lugar.</p>
        </div>`;
      return;
    }

    const uid  = getUserId(currentUser);
    const role = currentUser?.role || '';

    const cards = reviews.map(r => {
      const canDel = (r.usuario.id === uid && uid !== '') || role === 'admin';
      const av = r.usuario.foto
        ? `<img src="${r.usuario.foto}" alt="" onerror="this.style.display='none'">`
        : getInitials(r.usuario.nombre);

      return `
        <div class="review-card" id="review-card-${r._id}">
          ${canDel ? `<button class="btn-delete-review" onclick="window._rvDelete('${r._id}')" title="Eliminar">🗑️</button>` : ''}
          <div class="review-card-header">
            <div class="review-avatar">${av}</div>
            <div class="review-meta">
              <div class="review-author">${r.usuario.nombre}</div>
              <div class="review-date">${formatDate(r.createdAt)}</div>
            </div>
            <div class="review-stars">${starsHTML(r.calificacion, '1.2rem')}</div>
          </div>
          <p class="review-text">${r.comentario}</p>
        </div>`;
    }).join('');

    c.innerHTML = `<div class="reviews-list">${cards}</div>`;
  }

  // =========================================================
  // ELIMINAR RESEÑA
  // =========================================================
  window._rvDelete = async function (id) {
    if (!confirm('¿Seguro que quieres eliminar esta reseña?')) return;
    const token = getToken();
    try {
      const res  = await fetch(`${API_BASE}/reviews/${id}`, {
        method:  'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.ok) {
        document.getElementById(`review-card-${id}`)?.remove();
        loadReviews();
      } else {
        alert('Error: ' + data.message);
      }
    } catch(e) {
      alert('Error de conexión.');
    }
  };

  // =========================================================
  // CARGAR TODO
  // =========================================================
  async function loadReviews() {
    const slug = getSlug();
    if (!slug) return;

    try {
      const res  = await fetch(`${API_BASE}/reviews/${slug}`);
      const data = await res.json();
      if (!data.ok) return;

      renderSummary(data);

      const user = getCurrentUser();
      const uid  = getUserId(user);
      const userHasReviewed = uid
        ? data.data.some(r => r.usuario.id === uid)
        : false;

      renderForm(user, userHasReviewed);
      renderList(data.data, user);

    } catch(e) {
      const c = document.getElementById('reviews-list-container');
      if (c) c.innerHTML =
        '<div class="reviews-empty"><p>⚠️ No se pudieron cargar las reseñas.</p></div>';
    }
  }

  // =========================================================
  // INICIO
  // =========================================================
  window.addEventListener('sitioDetailReady', function () {
    loadReviews();
  });

})();