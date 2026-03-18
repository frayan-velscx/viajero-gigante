/**
 * gv-header.js — Gigante Viajero
 * Maneja: dropdown usuario, hamburger, logout
 * Incluir en TODAS las páginas: <script src="../scripts/gv-header.js"></script>
 */
(function () {
  'use strict';

  /* ── Helpers ──────────────────────────────────────────────── */
  function ready(fn) {
    if (document.readyState !== 'loading') fn();
    else document.addEventListener('DOMContentLoaded', fn);
  }

  function getUser() {
    try {
      if (typeof authAPI !== 'undefined' && authAPI.isAuthenticated()) {
        var u = authAPI.getUser();
        if (u) return u;
      }
    } catch (e) {}
    try {
      if (localStorage.getItem('gigante_auth') === 'true') {
        var data = localStorage.getItem('gigante_user');
        if (data) {
          var u = JSON.parse(data);
          if (u && u.email) return u;
        }
      }
    } catch (e) {}
    return null;
  }

  /* ── Actualizar header con datos del usuario ──────────────── */
  function updateHeader() {
    var user = getUser();
    var ab   = document.getElementById('authButtons');
    var uc   = document.getElementById('user-menu-container');
    var mas  = document.getElementById('mobile-auth-section');

    if (user) {
      if (ab) ab.style.display = 'none';
      if (uc) uc.style.display = 'block';

      var fn  = user.firstName || 'Usuario';
      var ln  = user.lastName  || '';
      var ini = (fn.charAt(0) + ln.charAt(0)).toUpperCase();

      // Foto o iniciales
      var ie = document.getElementById('user-initials');
      if (ie) {
        if (user.photoURL) {
          ie.style.cssText = 'background:transparent;padding:0;overflow:hidden;border-radius:50%;';
          ie.innerHTML = '<img src="' + user.photoURL + '" '
            + 'style="width:100%;height:100%;object-fit:cover;border-radius:50%;display:block;" '
            + 'onerror="this.parentElement.textContent=\'' + ini + '\';'
            + 'this.parentElement.style.background=\'linear-gradient(135deg,#F4C400,#FFE347)\'">';
        } else {
          ie.textContent = ini;
          ie.style.background = 'linear-gradient(135deg,#F4C400,#FFE347)';
        }
      }

      // Nombre en header
      var ne = document.getElementById('user-name');
      if (ne) ne.textContent = fn;

      // Datos en dropdown
      var dne = document.getElementById('dropdown-user-name');
      if (dne) dne.textContent = (fn + ' ' + ln).trim();

      var dee = document.getElementById('dropdown-user-email');
      if (dee) dee.textContent = user.email || '';

      // Rol
      var re = document.getElementById('dropdown-user-role');
      var ao = document.getElementById('admin-options');
      if (re) {
        if (user.role === 'admin') {
          re.textContent = '🔧 Administrador';
          re.style.cssText = 'background:rgba(244,196,0,.3);color:#F4C400;display:inline-block;padding:3px 10px;border-radius:10px;font-size:12px;font-weight:600;margin-top:8px;';
          if (ao) ao.style.display = 'block';
        } else {
          re.textContent = user.provider === 'google' ? '🔥 Google' : '👤 Cliente';
          re.style.cssText = 'background:rgba(59,130,246,.2);color:#3B82F6;display:inline-block;padding:3px 10px;border-radius:10px;font-size:12px;font-weight:600;margin-top:8px;';
          if (ao) ao.style.display = 'none';
        }
      }

      // Mobile: reemplazar botones login/register por perfil/reservas
      if (mas) {
        mas.innerHTML =
          '<a href="perfil.html" class="mobile-btn-full mobile-btn-login">👤 Mi Perfil</a>' +
          '<a href="mis_reservas.html" class="mobile-btn-full mobile-btn-register">🛍️ Mis Reservas</a>';
      }

    } else {
      // No logueado
      if (uc) uc.style.display = 'none';
      if (ab) ab.style.display = 'flex';
    }
  }

  /* ── Dropdown usuario ─────────────────────────────────────── */
  function initDropdown() {
    var container = document.getElementById('user-menu-container');
    var button    = document.getElementById('user-menu-button');
    var dropdown  = document.getElementById('user-dropdown');
    if (!button || !dropdown || !container) return;

    // Estado inicial: cerrado
    dropdown.classList.add('gv-hidden');
    dropdown.classList.remove('hidden');

    function openDd() {
      dropdown.classList.remove('gv-hidden');
      dropdown.classList.remove('hidden');
      container.classList.add('open');
    }
    function closeDd() {
      dropdown.classList.add('gv-hidden');
      container.classList.remove('open');
    }
    function toggleDd(e) {
      e.stopPropagation();
      dropdown.classList.contains('gv-hidden') ? openDd() : closeDd();
    }

    button.addEventListener('click', toggleDd);
    // Soporte táctil (móvil)
    button.addEventListener('touchend', function (e) {
      e.preventDefault();
      toggleDd(e);
    });

    // Clic fuera → cerrar
    document.addEventListener('click', function (e) {
      if (!container.contains(e.target)) closeDd();
    });

    // ESC → cerrar
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') closeDd();
    });
  }

  /* ── Logout ───────────────────────────────────────────────── */
  function initLogout() {
    var lb = document.getElementById('logout-button');
    if (!lb) return;
    lb.addEventListener('click', async function (e) {
      e.preventDefault();
      // Cerrar dropdown visualmente
      var dd = document.getElementById('user-dropdown');
      if (dd) dd.classList.add('gv-hidden');

      if (typeof window.firebaseLogout === 'function') await window.firebaseLogout();
      if (typeof authAPI !== 'undefined') authAPI.logout();

      ['gigante_user','gigante_token','gigante_auth',
       'token','authToken','user','currentUser','userData']
        .forEach(function (k) { localStorage.removeItem(k); });

      window.location.href = 'index.html';
    });
  }

  /* ── Hamburger ────────────────────────────────────────────── */
  function initHamburger() {
    var hamburger = document.getElementById('hamburger');
    var mobileNav = document.getElementById('mobileNav');
    if (!hamburger || !mobileNav) return;

    hamburger.addEventListener('click', function () {
      hamburger.classList.toggle('open');
      if (mobileNav.classList.contains('open')) {
        mobileNav.classList.remove('open');
        setTimeout(function () { mobileNav.style.display = 'none'; }, 300);
      } else {
        mobileNav.style.display = 'block';
        requestAnimationFrame(function () { mobileNav.classList.add('open'); });
      }
    });

    // Clic en el overlay cierra el panel
    mobileNav.addEventListener('click', function (e) {
      if (e.target === mobileNav) {
        hamburger.classList.remove('open');
        mobileNav.classList.remove('open');
        setTimeout(function () { mobileNav.style.display = 'none'; }, 300);
      }
    });
  }

  /* ── CSS del dropdown (inyectado una sola vez) ────────────── */
  function injectStyles() {
    if (document.getElementById('gv-dropdown-styles')) return;
    var style = document.createElement('style');
    style.id = 'gv-dropdown-styles';
    style.textContent = [
      '#user-dropdown{',
        'position:absolute;top:calc(100% + 12px);right:0;width:280px;',
        'background:#fff;border-radius:16px;',
        'box-shadow:0 20px 50px rgba(0,0,0,.2);',
        'border:1px solid rgba(0,0,0,.08);z-index:99999;overflow:hidden;',
        'transition:opacity .25s,transform .25s,visibility .25s;',
      '}',
      '#user-dropdown:not(.gv-hidden){',
        'opacity:1;visibility:visible;transform:translateY(0);pointer-events:auto;',
      '}',
      '#user-dropdown.gv-hidden,#user-dropdown.hidden{',
        'opacity:0 !important;visibility:hidden !important;',
        'transform:translateY(-10px) !important;pointer-events:none !important;',
      '}',
      /* Chevron rota al abrir */
      '#user-menu-container.open .user-chevron{transform:rotate(180deg);}',
      '.user-chevron{transition:transform .25s;}',
      /* Foto de perfil */
      '#user-initials{',
        'width:36px;height:36px;border-radius:50%;overflow:hidden;',
        'display:flex;align-items:center;justify-content:center;',
        'background:linear-gradient(135deg,#F4C400,#FFE347);',
        'color:#195C33;font-weight:700;font-size:14px;flex-shrink:0;',
      '}',
      '#user-initials img{width:100%;height:100%;object-fit:cover;border-radius:50%;display:block;}',
    ].join('');
    document.head.appendChild(style);
  }

  /* ── Inicializar todo ─────────────────────────────────────── */
  ready(function () {
    injectStyles();
    initDropdown();
    initLogout();
    initHamburger();
    setTimeout(updateHeader, 150);
  });

  // Actualizar si cambia sesión en otra pestaña
  window.addEventListener('storage', function (e) {
    if (['authData','gigante_auth','gigante_user'].includes(e.key)) updateHeader();
  });

})();