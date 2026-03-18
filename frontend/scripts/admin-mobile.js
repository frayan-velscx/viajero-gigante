/* ================================================================
   admin-mobile.js — Gigante Viajero
   Agrega: bottom nav, swipe para cerrar sidebar, mejoras móvil
   Incluir al final del <body>: <script src="../scripts/admin-mobile.js"></script>
   ================================================================ */
(function () {
  'use strict';

  /* ── 1. BOTTOM NAVIGATION ────────────────────────────────── */
  var NAV_ITEMS = [
    { section: 'dashboard',    icon: 'fa-chart-line',      label: 'Inicio',    badge: null },
    { section: 'reservations', icon: 'fa-calendar-check',  label: 'Reservas',  badge: 'pendingReservationsBadge' },
    { section: 'reviews',      icon: 'fa-star',            label: 'Reseñas',   badge: 'pendingReviewsBadge' },
    { section: 'destinations', icon: 'fa-map-marked-alt',  label: 'Destinos',  badge: null },
    { section: 'users',        icon: 'fa-users',           label: 'Usuarios',  badge: null },
  ];

  function buildBottomNav() {
    if (document.getElementById('mobileBottomNav')) return;

    var nav = document.createElement('nav');
    nav.className = 'mobile-bottom-nav';
    nav.id = 'mobileBottomNav';

    NAV_ITEMS.forEach(function (item) {
      var btn = document.createElement('button');
      btn.className = 'mobile-nav-item';
      btn.dataset.section = item.section;
      btn.innerHTML =
        '<i class="fas ' + item.icon + '"></i>' +
        '<span>' + item.label + '</span>' +
        (item.badge ? '<span class="mobile-nav-badge" id="mob-badge-' + item.section + '" style="display:none;">0</span>' : '');
      btn.addEventListener('click', function () {
        navigateToSection(item.section);
        closeSidebar();
      });
      nav.appendChild(btn);
    });

    document.body.appendChild(nav);
  }

  /* Sincronizar badges desde el sidebar */
  function syncBadges() {
    NAV_ITEMS.forEach(function (item) {
      if (!item.badge) return;
      var src = document.getElementById(item.badge);
      var dst = document.getElementById('mob-badge-' + item.section);
      if (!src || !dst) return;
      var txt = src.textContent.trim();
      var vis = src.style.display !== 'none' && txt !== '0' && txt !== '';
      dst.textContent = txt;
      dst.style.display = vis ? 'flex' : 'none';
    });
  }

  /* Marcar ítem activo en bottom nav */
  function setActiveBottomNav(section) {
    var items = document.querySelectorAll('.mobile-nav-item');
    items.forEach(function (btn) {
      btn.classList.toggle('active', btn.dataset.section === section);
    });
  }

  /* Observar cambios en badges del sidebar */
  function observeBadges() {
    var targets = ['pendingReservationsBadge', 'pendingReviewsBadge'];
    targets.forEach(function (id) {
      var el = document.getElementById(id);
      if (!el) return;
      new MutationObserver(syncBadges).observe(el, {
        childList: true, characterData: true, subtree: true, attributes: true
      });
    });
  }

  /* ── 2. SIDEBAR MÓVIL ────────────────────────────────────── */
  function getOverlay() { return document.querySelector('.sidebar-overlay'); }
  function getSidebar() { return document.getElementById('sidebar'); }

  function openSidebar() {
    var sb = getSidebar();
    var ov = getOverlay();
    if (sb) sb.classList.add('mobile-open');
    if (ov) ov.classList.add('show');
    document.body.style.overflow = 'hidden';
  }

  function closeSidebar() {
    var sb = getSidebar();
    var ov = getOverlay();
    if (sb) sb.classList.remove('mobile-open');
    if (ov) ov.classList.remove('show');
    document.body.style.overflow = '';
  }

  /* Botón hamburguesa */
  function initHamburger() {
    var btn = document.getElementById('mobileMenuToggle')
           || document.querySelector('.mobile-menu-toggle');
    if (!btn) return;
    btn.addEventListener('click', function () {
      var sb = getSidebar();
      if (sb && sb.classList.contains('mobile-open')) closeSidebar();
      else openSidebar();
    });
  }

  /* Overlay cierra sidebar */
  function initOverlay() {
    var ov = getOverlay();
    if (!ov) {
      ov = document.createElement('div');
      ov.className = 'sidebar-overlay';
      document.body.appendChild(ov);
    }
    ov.addEventListener('click', closeSidebar);
  }

  /* ── 3. SWIPE para cerrar sidebar ───────────────────────── */
  function initSwipeClose() {
    var startX = 0;
    var sb = getSidebar();
    if (!sb) return;

    document.addEventListener('touchstart', function (e) {
      startX = e.touches[0].clientX;
    }, { passive: true });

    document.addEventListener('touchend', function (e) {
      var dx = e.changedTouches[0].clientX - startX;
      if (dx < -60 && sb.classList.contains('mobile-open')) {
        closeSidebar();
      }
    }, { passive: true });
  }

  /* ── 4. INTERCEPTAR navigateToSection ───────────────────── */
  function patchNavigate() {
    var original = window.navigateToSection;
    window.navigateToSection = function (section) {
      if (original) original(section);
      setActiveBottomNav(section);
      /* Cerrar sidebar si está abierto en móvil */
      if (window.innerWidth <= 768) closeSidebar();
    };
  }

  /* ── 5. SIDEBAR: nav items cierran en móvil ─────────────── */
  function initSidebarNavClose() {
    document.querySelectorAll('.sidebar .nav-item').forEach(function (item) {
      item.addEventListener('click', function () {
        if (window.innerWidth <= 768) closeSidebar();
      });
    });
  }

  /* ── 6. MODAL: cerrar con swipe hacia abajo ─────────────── */
  function initModalSwipe() {
    document.addEventListener('touchstart', function (e) {
      var modal = e.target.closest('.modal.active .modal-content');
      if (!modal) return;
      modal._swipeY = e.touches[0].clientY;
    }, { passive: true });

    document.addEventListener('touchend', function (e) {
      var modal = e.target.closest('.modal.active .modal-content');
      if (!modal || modal._swipeY === undefined) return;
      var dy = e.changedTouches[0].clientY - modal._swipeY;
      if (dy > 80) {
        /* Cerrar el modal activo */
        var activeModal = document.querySelector('.modal.active');
        if (activeModal && window.closeModal) {
          window.closeModal(activeModal.id);
        }
      }
      modal._swipeY = undefined;
    }, { passive: true });
  }

  /* ── 7. TOUCH FEEDBACK en botones de la tabla ───────────── */
  function initTouchFeedback() {
    document.addEventListener('touchstart', function (e) {
      var btn = e.target.closest('.action-btn, .btn-primary, .btn-secondary, .dest-filter-btn');
      if (btn) btn.style.opacity = '0.75';
    }, { passive: true });
    document.addEventListener('touchend', function (e) {
      var btn = e.target.closest('.action-btn, .btn-primary, .btn-secondary, .dest-filter-btn');
      if (btn) setTimeout(function () { btn.style.opacity = ''; }, 150);
    }, { passive: true });
  }

  /* ── 8. RESIZE: reset sidebar al pasar a desktop ────────── */
  function initResizeReset() {
    window.addEventListener('resize', function () {
      if (window.innerWidth > 768) {
        closeSidebar();
        document.body.style.overflow = '';
      }
    });
  }

  /* ── INICIALIZAR TODO ────────────────────────────────────── */
  function init() {
    buildBottomNav();
    initHamburger();
    initOverlay();
    initSwipeClose();
    patchNavigate();
    initSidebarNavClose();
    initModalSwipe();
    initTouchFeedback();
    initResizeReset();
    observeBadges();
    syncBadges();

    /* Marcar sección activa inicial */
    var activeNav = document.querySelector('.sidebar .nav-item.active');
    if (activeNav) setActiveBottomNav(activeNav.dataset.section || 'dashboard');
  }

  if (document.readyState !== 'loading') init();
  else document.addEventListener('DOMContentLoaded', init);

})();