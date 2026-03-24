// =============================================
// PANEL ADMINISTRATIVO — GIGANTE VIAJERO
// ✅ Actualizado: bookingMode + accommodation por cabaña
// =============================================

const API_URL = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? 'http://localhost:5000'
    : 'https://backend-gigante.onrender.com') + '/api';

const adminState = {
    currentSection: 'dashboard',
    sidebarCollapsed: false,
    currentPage: 1,
    itemsPerPage: 10,
    filters: {
        status:  'all',
        service: 'all',
        mode:     'all',   // ✅ NUEVO: entrada | alojamiento | all
        dateFrom: null,
        dateTo:   null
    },
    dashboardPeriod: 'month',
    charts: {},
    updateTimeout: null,
    listenersAttached: false,
    chartsInitialized: false,
    notifications: [],
    lastReservationCount: 0,
    notificationCheckInterval: null,
    processedReservationIds: new Set(),
    processedUserIds: new Set(),
    processedReviewIds: new Set(),
    _allUsers: [],
    _reservasPorEmail: {}
};

// ==================== INICIALIZACIÓN ====================

function showLoader() {
    const loader = document.getElementById('pageLoader');
    if (loader) { loader.style.display = 'flex'; loader.classList.remove('hiding'); }
}

function hideLoader() {
    const loader = document.getElementById('pageLoader');
    if (loader) {
        loader.classList.add('hiding');
        setTimeout(() => { loader.style.display = 'none'; }, 300);
    }
}

document.addEventListener('DOMContentLoaded', function () {
    if (window.adminInitialized) return;
    window.adminInitialized = true;
    initializeAdmin();
});

async function initializeAdmin() {
    console.log('🚀 Iniciando Panel Administrativo...');
    try {
        showLoader();
        if (!checkAdminAuth()) { hideLoader(); return; }

        await initializeNotificationSystem();
        setupEventListeners();

        setTimeout(async () => {
            await loadDashboardData();
            setTimeout(() => {
                if (adminState.currentSection === 'reservations') loadReservations();
                if (adminState.currentSection === 'destinations') loadDestinations();
                if (adminState.currentSection === 'users') loadUsers();
            }, 300);
            setTimeout(() => {
                if (!adminState.chartsInitialized) {
                    initializeCharts();
                    adminState.chartsInitialized = true;
                }
            }, 800);
            hideLoader();
        }, 100);
    } catch (error) {
        console.error('❌ Error en inicialización:', error);
        hideLoader();
    }
}

// ==================== API HELPERS ====================

function authHeaders() {
    const token = localStorage.getItem('techstore-auth-token') || '';
    return {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` })
    };
}

async function fetchBookings(params = {}) {
    try {
        const query    = new URLSearchParams({ limit: 1000, ...params }).toString();
        const response = await fetch(`${API_URL}/Bookings?${query}`);
        const ct = response.headers.get('content-type');
        if (!ct || !ct.includes('application/json')) return [];
        const result = await response.json();
        return result.data || [];
    } catch (error) {
        console.error('❌ Error obteniendo reservas:', error);
        return [];
    }
}

async function fetchUsers() {
    try {
        const response = await fetch(`${API_URL}/users`, { headers: authHeaders() });
        if (response.ok) {
            const result = await response.json();
            const users  = result.data || result.users || (Array.isArray(result) ? result : []);
            if (users.length > 0) return users;
        }
        return JSON.parse(localStorage.getItem('users') || '[]');
    } catch (error) {
        return JSON.parse(localStorage.getItem('users') || '[]');
    }
}

// ==================== SISTEMA DE NOTIFICACIONES ====================

async function initializeNotificationSystem() {
    loadNotifications();

    const reservations = await fetchBookings();
    const users        = await fetchUsers();

    adminState.lastReservationCount = reservations.length;
    const unaHoraAtras = new Date(Date.now() - 60 * 60 * 1000);

    reservations.forEach(r => {
        if (r.bookingCode && new Date(r.createdAt) < unaHoraAtras)
            adminState.processedReservationIds.add(r.bookingCode);
    });
    users.forEach(u => {
        const uid = u.email || u._id || u.id;
        if (uid) adminState.processedUserIds.add(uid);
    });

    try {
        const res = await fetch(`${API_URL}/reviews/admin/pending`, { headers: authHeaders() });
        if (res.ok) {
            const data = await res.json();
            (data.data || []).forEach(r => adminState.processedReviewIds.add(r._id));
            updateReviewsBadge((data.data || []).length);
        }
    } catch (_) {}

    updateNotificationBadge();
    if (adminState.notificationCheckInterval) clearInterval(adminState.notificationCheckInterval);
    adminState.notificationCheckInterval = setInterval(checkForNewData, 10000);
    await checkForNewData();
}

function loadNotifications() {
    const saved = localStorage.getItem('admin-notifications');
    try { adminState.notifications = saved ? JSON.parse(saved) : []; }
    catch { adminState.notifications = []; }
}

function saveNotifications() {
    try { localStorage.setItem('admin-notifications', JSON.stringify(adminState.notifications)); }
    catch (e) { console.error('❌ Error guardando notificaciones:', e); }
}

async function checkForNewData() {
    try {
        const reservations = await fetchBookings();
        reservations.forEach(reservation => {
            const resId = reservation.bookingCode;
            if (resId && !adminState.processedReservationIds.has(resId)) {
                createNotification({
                    type: 'reservation', title: '¡Nueva Reserva Recibida!',
                    message:   `${reservation.personalInfo?.fullName} - ${reservation.destination?.name}`,
                    reservation, timestamp: reservation.createdAt || new Date().toISOString()
                });
                adminState.processedReservationIds.add(resId);
            }
        });

        const users = await fetchUsers();
        users.forEach(user => {
            const uid = user.email || user._id || user.id;
            if (uid && !adminState.processedUserIds.has(uid)) {
                createNotification({
                    type: 'user', title: '¡Nuevo Usuario Registrado!',
                    message:   `${user.fullName || user.email} se ha registrado`,
                    user, timestamp: user.createdAt || new Date().toISOString()
                });
                adminState.processedUserIds.add(uid);
            }
        });

        try {
            const res = await fetch(`${API_URL}/reviews/admin/pending`, { headers: authHeaders() });
            if (res.ok) {
                const data = await res.json(); const reviews = data.data || [];
                updateReviewsBadge(reviews.length);
                reviews.forEach(review => {
                    if (!adminState.processedReviewIds.has(review._id)) {
                        createNotification({
                            type: 'review', title: '⭐ Nueva Reseña Pendiente',
                            message:  `${review.usuario?.nombre || 'Un visitante'} dejó una reseña en "${review.sitioSlug}"`,
                            reviewId: review._id, timestamp: review.createdAt || new Date().toISOString()
                        });
                        adminState.processedReviewIds.add(review._id);
                    }
                });
            }
        } catch (_) {}

        if (reservations.length !== adminState.lastReservationCount) {
            adminState.lastReservationCount = reservations.length;
            await loadDashboardData();
            if (adminState.currentSection === 'reservations') loadReservations();
        }
    } catch (error) { console.error('❌ Error verificando nuevos datos:', error); }
}

function createNotification(data) {
    const notification = { id: 'notif_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9), ...data, read: false };
    adminState.notifications.unshift(notification);
    if (adminState.notifications.length > 50) adminState.notifications = adminState.notifications.slice(0, 50);
    saveNotifications(); updateNotificationBadge(); showNotificationToast(notification); playNotificationSound();
}

function showNotificationToast(notification) {
    const existingToast = document.querySelector('.notification-toast');
    if (existingToast) existingToast.remove();
    const toast = document.createElement('div');
    toast.className = 'notification-toast';
    const iconMap = {
        user:        { class: 'fa-user-plus',      bg: 'linear-gradient(135deg,#8b5cf6,#7c3aed)' },
        reservation: { class: 'fa-calendar-check', bg: 'linear-gradient(135deg,#3b82f6,#2563eb)' },
        review:      { class: 'fa-star',            bg: 'linear-gradient(135deg,#f59e0b,#d97706)' }
    };
    const icon = iconMap[notification.type] || iconMap.reservation;
    toast.innerHTML = `
        <div class="toast-icon" style="background:${icon.bg};"><i class="fas ${icon.class}"></i></div>
        <div class="toast-content">
            <div class="toast-title">${notification.title}</div>
            <div class="toast-message">${notification.message}</div>
        </div>
        <button class="toast-close" onclick="this.parentElement.remove()"><i class="fas fa-times"></i></button>`;
    document.body.appendChild(toast);
    setTimeout(() => {
        if (toast.parentElement) { toast.classList.add('fade-out'); setTimeout(() => { if (toast.parentElement) toast.remove(); }, 300); }
    }, 5000);
}

function playNotificationSound() {
    try {
        const ctx = new (window.AudioContext || window.webkitAudioContext)();
        const osc = ctx.createOscillator(); const gain = ctx.createGain();
        osc.connect(gain); gain.connect(ctx.destination);
        osc.frequency.value = 800; osc.type = 'sine';
        gain.gain.setValueAtTime(0.3, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);
        osc.start(ctx.currentTime); osc.stop(ctx.currentTime + 0.5);
    } catch (_) {}
}

function updateNotificationBadge() {
    const unreadCount = adminState.notifications.filter(n => !n.read).length;
    const badge = document.querySelector('.notification-badge');
    if (badge) { badge.textContent = unreadCount; badge.style.display = unreadCount > 0 ? 'flex' : 'none'; }
}

function updateReviewsBadge(count) {
    const badge = document.getElementById('pendingReviewsBadge');
    if (!badge) return;
    badge.textContent = count; badge.style.display = count > 0 ? 'flex' : 'none';
}

function toggleNotificationsPanel() {
    let panel = document.getElementById('notificationsPanel');
    if (!panel) { panel = createNotificationsPanel(); document.body.appendChild(panel); }
    panel.classList.toggle('active');
    if (panel.classList.contains('active')) renderNotifications();
}

function createNotificationsPanel() {
    const panel = document.createElement('div');
    panel.id = 'notificationsPanel'; panel.className = 'notifications-panel';
    panel.innerHTML = `
        <div class="notifications-header">
            <h3><i class="fas fa-bell"></i> Notificaciones</h3>
            <div class="notifications-actions">
                <button class="btn-mark-read" onclick="markAllAsRead()" title="Marcar todas como leídas"><i class="fas fa-check-double"></i></button>
                <button class="btn-close-panel" onclick="toggleNotificationsPanel()"><i class="fas fa-times"></i></button>
            </div>
        </div>
        <div class="notifications-body" id="notificationsBody"></div>`;
    return panel;
}

function renderNotifications() {
    const body = document.getElementById('notificationsBody');
    if (!body) return;
    if (adminState.notifications.length === 0) {
        body.innerHTML = `<div class="notifications-empty"><i class="fas fa-bell-slash"></i><p>No hay notificaciones</p></div>`;
        return;
    }
    const iconMap = { user: 'fa-user-plus', reservation: 'fa-calendar-check', review: 'fa-star' };
    body.innerHTML = adminState.notifications.map(notif => `
        <div class="notification-item ${notif.read ? 'read' : 'unread'}" onclick="handleNotificationClick('${notif.id}')">
            <div class="notification-icon ${notif.type}"><i class="fas ${iconMap[notif.type] || 'fa-bell'}"></i></div>
            <div class="notification-content">
                <div class="notification-title">${notif.title}</div>
                <div class="notification-message">${notif.message}</div>
                <div class="notification-time">${formatTimeAgo(notif.timestamp)}</div>
            </div>
            ${!notif.read ? '<div class="notification-dot"></div>' : ''}
        </div>`).join('');
}

function handleNotificationClick(notificationId) {
    const notification = adminState.notifications.find(n => n.id === notificationId);
    if (!notification) return;
    notification.read = true; saveNotifications(); updateNotificationBadge();
    if (notification.type === 'user')        { navigateToSection('users'); toggleNotificationsPanel(); }
    else if (notification.type === 'reservation') {
        navigateToSection('reservations'); toggleNotificationsPanel();
        setTimeout(() => { if (notification.reservation?.bookingCode) highlightNewReservation(notification.reservation.bookingCode); }, 500);
    } else if (notification.type === 'review') { navigateToSection('reviews'); toggleNotificationsPanel(); }
}

function highlightNewReservation(bookingCode) {
    document.querySelectorAll('#reservationsTableBody tr').forEach(row => {
        if (row.textContent.includes(bookingCode)) {
            row.classList.add('highlight-animation');
            row.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    });
}

function markAllAsRead() {
    adminState.notifications.forEach(n => n.read = true);
    saveNotifications(); updateNotificationBadge(); renderNotifications();
}

window.clearAllNotifications = function () {
    if (confirm('¿Eliminar todas las notificaciones?')) {
        adminState.notifications = [];
        saveNotifications(); updateNotificationBadge(); renderNotifications();
    }
};

// ==================== AUTENTICACIÓN ====================

function checkAdminAuth() {
    try {
        const currentUser = JSON.parse(localStorage.getItem('techstore-user-data') || 'null');
        if (!currentUser) {
            if (!window.location.pathname.includes('login.html') && !sessionStorage.getItem('redirecting')) {
                sessionStorage.setItem('redirecting', 'true');
                alert('⚠️ Acceso denegado. Solo administradores.');
                window.location.replace('login.html');
            }
            return false;
        }
        const userRole = currentUser.role ? currentUser.role.toLowerCase() : '';
        if (userRole !== 'admin') {
            if (!window.location.pathname.includes('login.html') && !sessionStorage.getItem('redirecting')) {
                sessionStorage.setItem('redirecting', 'true');
                alert('⚠️ Acceso denegado. Solo administradores.');
                window.location.replace('login.html');
            }
            return false;
        }
        sessionStorage.removeItem('redirecting');
        updateAdminInfo(currentUser);
        return true;
    } catch (error) { console.error('❌ Error en autenticación:', error); return false; }
}

function updateAdminInfo(user) {
    const fullName = user.fullName || `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'Administrador';
    const initials = getInitials(fullName);
    document.querySelectorAll('.admin-avatar, .user-avatar').forEach(el => el.textContent = initials);
    document.querySelectorAll('.admin-name, .user-name').forEach(el => el.textContent = fullName);
}

function getInitials(name) {
    if (!name) return 'AD';
    return name.split(' ').map(w => w[0]).join('').toUpperCase().substring(0, 2);
}

// ==================== EVENT LISTENERS ====================

function setupEventListeners() {
    if (adminState.listenersAttached) return;
    adminState.listenersAttached = true;

    const sidebarToggle    = document.getElementById('sidebarToggle');
    const mobileMenuToggle = document.getElementById('mobileMenuToggle');
    if (sidebarToggle)    sidebarToggle.onclick    = toggleSidebar;
    if (mobileMenuToggle) mobileMenuToggle.onclick = toggleMobileSidebar;

    document.querySelectorAll('.nav-item').forEach(item => {
        item.onclick = function (e) {
            e.preventDefault();
            const section = this.dataset.section;
            if (section) navigateToSection(section);
        };
    });

    const notificationBtn = document.getElementById('notificationBtn');
    if (notificationBtn) notificationBtn.onclick = (e) => { e.stopPropagation(); toggleNotificationsPanel(); };

    document.addEventListener('click', (e) => {
        const panel = document.getElementById('notificationsPanel');
        const notifBtn = document.getElementById('notificationBtn');
        if (panel && panel.classList.contains('active'))
            if (!panel.contains(e.target) && notifBtn && !notifBtn.contains(e.target))
                panel.classList.remove('active');
    });

    const userMenuToggle = document.getElementById('userMenuToggle');
    const userDropdown   = document.getElementById('userDropdown');
    if (userMenuToggle && userDropdown) {
        userMenuToggle.onclick = (e) => { e.stopPropagation(); userDropdown.classList.toggle('active'); };
        document.onclick = (e) => {
            if (!userMenuToggle.contains(e.target) && !userDropdown.contains(e.target))
                userDropdown.classList.remove('active');
        };
    }

    const btnLogout = document.getElementById('btnLogout');
    if (btnLogout) btnLogout.onclick = handleLogout;

    // ── Filtros de reservas ───────────────────────────────────
    const filterStatus   = document.getElementById('filterStatus');
    const filterService  = document.getElementById('filterService');
    const filterDateFrom = document.getElementById('filterDateFrom');
    const filterDateTo   = document.getElementById('filterDateTo');
    // ✅ NUEVO: filtro por modo (entrada / alojamiento)
    const filterMode     = document.getElementById('filterMode');

    if (filterStatus)   filterStatus.onchange   = function () { adminState.filters.status   = this.value; loadReservations(); };
    if (filterService)  filterService.onchange  = function () { adminState.filters.service  = this.value; loadReservations(); };
    if (filterDateFrom) filterDateFrom.onchange = function () { adminState.filters.dateFrom = this.value || null; loadReservations(); };
    if (filterDateTo)   filterDateTo.onchange   = function () { adminState.filters.dateTo   = this.value || null; loadReservations(); };
    if (filterMode)     filterMode.onchange     = function () { adminState.filters.mode     = this.value; loadReservations(); };

    const btnExport = document.getElementById('btnExportReservations');
    if (btnExport) btnExport.onclick = exportReservations;

    const btnAddDest = document.getElementById('btnAddDestination');
    if (btnAddDest) btnAddDest.onclick = () => openDestinationModal();

    const destForm = document.getElementById('destinationForm');
    if (destForm) destForm.addEventListener('submit', handleDestinationSubmit);

    const btnAddUser = document.getElementById('btnAddUser');
    if (btnAddUser) btnAddUser.onclick = () => openNewUserModal();

    const searchUsers = document.getElementById('searchUsers');
    if (searchUsers) searchUsers.oninput = debounce(function () { filterUsersTable(this.value.trim().toLowerCase()); }, 300);

    const periodSelector = document.getElementById('dashboardPeriodSelector');
    if (periodSelector) {
        periodSelector.onchange = debounce(function () {
            if (adminState.dashboardPeriod !== this.value) {
                adminState.dashboardPeriod = this.value;
                updateDashboardWithPeriod();
            }
        }, 500);
    }

    const newUserForm = document.getElementById('newUserForm');
    if (newUserForm) {
        newUserForm.addEventListener('submit', async function (e) {
            e.preventDefault();
            const firstName = document.getElementById('newUserFirstName').value.trim();
            const lastName  = document.getElementById('newUserLastName').value.trim();
            const email     = document.getElementById('newUserEmail').value.trim();
            const phone     = document.getElementById('newUserPhone').value.trim();
            const password  = document.getElementById('newUserPassword').value;
            const role      = document.getElementById('newUserRole').value;
            const errorEl   = document.getElementById('newUserError');
            const submitBtn = document.getElementById('newUserSubmitBtn');

            errorEl.style.display = 'none';
            submitBtn.disabled    = true;
            submitBtn.innerHTML   = '<i class="fas fa-spinner fa-spin"></i> Creando...';

            try {
                const response = await fetch(`${API_URL}/auth/register`, {
                    method: 'POST', headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ firstName, lastName, email, phone, password, role })
                });
                const result = await response.json();
                if (result.success || result.user) {
                    closeModal('newUserModal');
                    showSuccessToast(`✅ Usuario "${firstName} ${lastName}" creado exitosamente`);
                    await loadUsers();
                } else {
                    errorEl.textContent = result.error || result.message || 'Error al crear usuario';
                    errorEl.style.display = 'block';
                }
            } catch (error) {
                errorEl.textContent = 'Error de conexión con el servidor';
                errorEl.style.display = 'block';
            }
            submitBtn.disabled  = false;
            submitBtn.innerHTML = '<i class="fas fa-save"></i> Crear Usuario';
        });
    }
}

function debounce(func, wait) {
    let timeout;
    return function (...args) { clearTimeout(timeout); timeout = setTimeout(() => func.apply(this, args), wait); };
}

// ==================== NAVEGACIÓN ====================

function toggleSidebar() {
    document.querySelector('.sidebar').classList.toggle('collapsed');
    adminState.sidebarCollapsed = !adminState.sidebarCollapsed;
}
function toggleMobileSidebar() { document.querySelector('.sidebar').classList.toggle('active'); }

function navigateToSection(sectionName) {
    document.querySelectorAll('.content-section').forEach(s => s.classList.remove('active'));
    const targetSection = document.getElementById(`${sectionName}-section`);
    if (targetSection) targetSection.classList.add('active');

    document.querySelectorAll('.nav-item').forEach(i => i.classList.remove('active'));
    const activeNav = document.querySelector(`[data-section="${sectionName}"]`);
    if (activeNav) activeNav.classList.add('active');

    const titles = {
        dashboard: 'Dashboard', reservations: 'Gestión de Reservas',
        destinations: 'Gestión de Destinos', users: 'Gestión de Usuarios',
        analytics: 'Análisis y Estadísticas', reports: 'Reportes',
        settings: 'Configuración', reviews: 'Moderación de Reseñas'
    };
    const pageTitle = document.querySelector('.page-title');
    if (pageTitle) pageTitle.textContent = titles[sectionName] || 'Panel Administrativo';

    adminState.currentSection = sectionName;
    if (sectionName === 'reservations') loadReservations();
    if (sectionName === 'destinations') loadDestinations();
    if (sectionName === 'users')        loadUsers();
    if (sectionName === 'analytics')    loadAnalytics();
    if (sectionName === 'reports')      loadReports();
    if (sectionName === 'settings')     loadSettingsSection();
    if (sectionName === 'reviews' && window._rvMod) window._rvMod.load();
    if (window.innerWidth <= 968) document.querySelector('.sidebar').classList.remove('active');
}

function handleLogout() {
    if (confirm('¿Cerrar sesión?')) {
        if (adminState.notificationCheckInterval) clearInterval(adminState.notificationCheckInterval);
        if (window.authAPI) { window.authAPI.logout(); }
        else { localStorage.removeItem('techstore-auth-token'); localStorage.removeItem('techstore-user-data'); localStorage.removeItem('techstore-login-time'); }
        window.location.href = 'login.html';
    }
}

// ==================== DASHBOARD ====================

function getDateRangeForPeriod(period) {
    const now = new Date(); const startDate = new Date();
    switch (period) {
        case 'week':     startDate.setDate(now.getDate() - 7);   break;
        case 'biweekly': startDate.setDate(now.getDate() - 14);  break;
        case 'month':    startDate.setMonth(now.getMonth() - 1); break;
        default:         startDate.setDate(now.getDate() - 7);
    }
    return { startDate, endDate: now };
}

function filterByDateRange(reservations, startDate, endDate) {
    return reservations.filter(r => {
        const date = new Date(r.createdAt || r.timestamp);
        return date >= startDate && date <= endDate;
    });
}

function updateDashboardWithPeriod() {
    if (adminState.updateTimeout) clearTimeout(adminState.updateTimeout);
    adminState.updateTimeout = setTimeout(async () => {
        await loadDashboardData();
        if (adminState.chartsInitialized) updateCharts();
    }, 300);
}

async function loadDashboardData() {
    try {
        const allReservations = await fetchBookings();
        const users           = await fetchUsers();
        const { startDate, endDate } = getDateRangeForPeriod(adminState.dashboardPeriod);
        const reservations    = filterByDateRange(allReservations, startDate, endDate);

        const total   = reservations.length;
        const pending = reservations.filter(r => r.status === 'pending').length;
        const revenue = reservations.filter(r => r.status !== 'cancelled').reduce((sum, r) => sum + (r.pricing?.total || 0), 0);

        // ✅ NUEVO: contadores por modo en el período
        const entradas      = reservations.filter(r => r.bookingMode === 'entrada'      || !r.bookingMode).length;
        const alojamientos  = reservations.filter(r => r.bookingMode === 'alojamiento').length;

        const totalEl   = document.getElementById('totalReservations');
        const pendingEl = document.getElementById('pendingReservations');
        const revenueEl = document.getElementById('totalRevenue');
        const usersEl   = document.getElementById('totalUsers');

        if (totalEl)   totalEl.textContent  = total;
        if (pendingEl) pendingEl.textContent = pending;
        if (revenueEl) revenueEl.textContent = formatCurrency(revenue);
        if (usersEl)   usersEl.textContent   = users.length;

        // ✅ NUEVO: mini-badges de modo en la stat card
        const modeBreakdownEl = document.getElementById('modeBreakdown');
        if (modeBreakdownEl) {
            modeBreakdownEl.innerHTML = `
                <span style="background:#dbeafe;color:#1d4ed8;padding:2px 8px;border-radius:20px;font-size:11px;font-weight:700;margin-right:4px;">
                    <i class="fas fa-ticket-alt"></i> ${entradas} entradas
                </span>
                <span style="background:#fef3c7;color:#92400e;padding:2px 8px;border-radius:20px;font-size:11px;font-weight:700;">
                    <i class="fas fa-bed"></i> ${alojamientos} alojam.
                </span>`;
        }

        const badge = document.getElementById('pendingReservationsBadge');
        if (badge) { badge.textContent = pending; badge.style.display = pending > 0 ? 'flex' : 'none'; }

        loadRecentActivity(allReservations);
    } catch (error) { console.error('❌ Error en dashboard:', error); }
}

function loadRecentActivity(reservations) {
    const container = document.getElementById('recentActivity');
    if (!container) return;
    const recent = [...reservations]
        .sort((a, b) => new Date(b.createdAt || b.timestamp) - new Date(a.createdAt || a.timestamp))
        .slice(0, 3);
    if (recent.length === 0) {
        container.innerHTML = '<p style="text-align:center;color:#6b7280;padding:20px;">Sin actividad reciente</p>';
        return;
    }
    container.innerHTML = recent.map(r => {
        const iconBg = r.status === 'pending' ? '#f59e0b' : r.status === 'confirmed' ? '#10b981' : '#ef4444';
        // ✅ NUEVO: muestra tipo de reserva en actividad reciente
        const tipoLabel = r.bookingMode === 'alojamiento'
            ? `${r.accommodation?.nombre || 'Alojamiento'}`
            : 'Visita de día';
        return `
            <div class="activity-item">
                <div class="activity-icon" style="background:${iconBg};"><i class="fas fa-calendar-check"></i></div>
                <div class="activity-content">
                    <div class="activity-title">Reserva de ${r.personalInfo?.fullName || 'Cliente'}</div>
                    <div class="activity-time">${formatTimeAgo(r.createdAt || r.timestamp)} · ${r.destination?.name || ''} · ${tipoLabel}</div>
                </div>
            </div>`;
    }).join('');
}

// ==================== RESERVAS ====================

async function loadReservations() {
    const tbody = document.getElementById('reservationsTableBody');
    if (tbody) {
        tbody.innerHTML = `<tr><td colspan="12" style="text-align:center;padding:40px;color:#6b7280;">
            <i class="fas fa-spinner fa-spin" style="font-size:24px;margin-bottom:10px;display:block;"></i>Cargando reservas...</td></tr>`;
    }

    let reservations = await fetchBookings();

    if (adminState.filters.status  !== 'all') reservations = reservations.filter(r => r.status === adminState.filters.status);
    if (adminState.filters.service !== 'all') reservations = reservations.filter(r => r.serviceType === adminState.filters.service);

    // ✅ CAMBIO 3: filtros de fecha (dateFrom / dateTo) sobre checkIn
    if (adminState.filters.dateFrom) {
        const _from = new Date(adminState.filters.dateFrom + 'T00:00:00');
        reservations = reservations.filter(r => new Date(r.checkIn) >= _from);
    }
    if (adminState.filters.dateTo) {
        const _to = new Date(adminState.filters.dateTo + 'T23:59:59');
        reservations = reservations.filter(r => new Date(r.checkIn) <= _to);
    }

    // ✅ NUEVO: filtro por modo (entrada / alojamiento)
    if (adminState.filters.mode !== 'all') {
        reservations = reservations.filter(r => {
            const mode = r.bookingMode || 'entrada';
            return mode === adminState.filters.mode;
        });
    }

    displayReservations(reservations);
}

// ✅ ACTUALIZADO: tabla con columnas Modo y Alojamiento
function displayReservations(reservations) {
    const tbody = document.getElementById('reservationsTableBody');
    if (!tbody) return;
    if (reservations.length === 0) {
        tbody.innerHTML = `<tr><td colspan="12" style="text-align:center;padding:40px;color:#6b7280;">
            <i class="fas fa-inbox" style="font-size:48px;margin-bottom:16px;display:block;"></i>No hay reservas</td></tr>`;
        return;
    }
    reservations.sort((a, b) => new Date(b.createdAt || b.timestamp) - new Date(a.createdAt || a.timestamp));

    tbody.innerHTML = reservations.map(r => {
        const statusText = { pending: 'Pendiente', confirmed: 'Confirmada', 'in-progress': 'En Curso', completed: 'Completada', cancelled: 'Cancelada' }[r.status] || 'Pendiente';

        // ✅ NUEVO: badge de modo de reserva
        const isAloj  = r.bookingMode === 'alojamiento';
        const modeBadge = isAloj
            ? `<span style="display:inline-flex;align-items:center;gap:4px;background:#fef3c7;color:#92400e;padding:3px 8px;border-radius:20px;font-size:11px;font-weight:700;white-space:nowrap;">
                   <i class="fas fa-bed"></i> Alojam.
               </span>`
            : `<span style="display:inline-flex;align-items:center;gap:4px;background:#dbeafe;color:#1d4ed8;padding:3px 8px;border-radius:20px;font-size:11px;font-weight:700;white-space:nowrap;">
                   <i class="fas fa-ticket-alt"></i> Entrada
               </span>`;

        // ✅ NUEVO: nombre de la cabaña/glamping o "—"
        const accomCell = isAloj && r.accommodation?.nombre
            ? `<div style="font-size:12px;">
                   <div style="font-weight:700;color:#374151;">${r.accommodation.nombre}</div>
                   <div style="color:#9ca3af;font-size:10px;text-transform:capitalize;">${r.accommodation.tipo || ''}</div>
               </div>`
            : `<span style="color:#d1d5db;">—</span>`;

        return `
            <tr>
                <td><strong style="font-family:monospace;font-size:12px;">${r.bookingCode}</strong></td>
                <td>${r.personalInfo?.fullName || 'N/A'}</td>
                <td>${r.destination?.name || 'N/A'}</td>
                <td>${getServiceLabel(r.serviceType)}</td>
                <td>${modeBadge}</td>
                <td>${accomCell}</td>
                <td>${formatDate(r.checkIn)}</td>
                <td>${formatDate(r.checkOut)}</td>
                <td>${r.numPeople}</td>
                <td><strong>${formatCurrency(r.pricing?.total || 0)} COP</strong></td>
                <td><span class="status-badge status-${r.status || 'pending'}">${statusText}</span></td>
                <td>
                    <button class="action-btn btn-view" onclick="viewReservationDetails('${r.bookingCode}')" title="Ver"><i class="fas fa-eye"></i></button>
                    ${r.status === 'pending' ? `
                        <button class="action-btn btn-edit" onclick="confirmReservation('${r.bookingCode}')" title="Confirmar"><i class="fas fa-check"></i></button>
                        <button class="action-btn btn-delete" onclick="cancelReservation('${r.bookingCode}')" title="Cancelar"><i class="fas fa-times"></i></button>` : ''}
                </td>
            </tr>`;
    }).join('');
}

// ✅ ACTUALIZADO: modal de detalles muestra bloque de alojamiento si corresponde
async function viewReservationDetails(bookingCode) {
    try {
        const response = await fetch(`${API_URL}/Bookings/${bookingCode}`);
        const result   = await response.json();
        const r        = result.data;
        if (!r) return;
        const modal   = document.getElementById('reservationDetailsModal');
        const content = document.getElementById('reservationDetailsContent');
        if (!modal || !content) return;

        const isAloj = r.bookingMode === 'alojamiento';

        // ✅ NUEVO: bloque de alojamiento (solo si es alojamiento)
        const accomBlock = isAloj && r.accommodation ? `
            <div>
                <h3 style="font-size:16px;font-weight:700;color:#195C33;margin-bottom:12px;border-bottom:2px solid #f3f4f6;padding-bottom:8px;">
                    <i class="fas fa-bed"></i> Alojamiento
                </h3>
                <div style="background:linear-gradient(135deg,#fef3c7,#fde68a);border-radius:10px;padding:14px;">
                    <div style="display:grid;grid-template-columns:repeat(2,1fr);gap:10px;">
                        <div>
                            <strong style="color:#92400e;font-size:11px;">CABAÑA / GLAMPING</strong>
                            <div style="font-size:15px;font-weight:800;color:#78350f;">${r.accommodation.nombre}</div>
                        </div>
                        <div>
                            <strong style="color:#92400e;font-size:11px;">TIPO</strong>
                            <div style="font-size:14px;font-weight:700;color:#78350f;text-transform:capitalize;">${r.accommodation.tipo || '—'}</div>
                        </div>
                        <div>
                            <strong style="color:#92400e;font-size:11px;">CAPACIDAD MÁX.</strong>
                            <div style="font-size:14px;font-weight:700;color:#78350f;">${r.accommodation.capacidadMax ? r.accommodation.capacidadMax + ' personas' : '—'}</div>
                        </div>
                        <div>
                            <strong style="color:#92400e;font-size:11px;">DESAYUNO</strong>
                            <div style="font-size:14px;font-weight:700;color:${r.accommodation.incluyeDesayuno ? '#166534' : '#6b7280'};">
                                ${r.accommodation.incluyeDesayuno ? '✅ Incluido' : '❌ No incluido'}
                            </div>
                        </div>
                    </div>
                    ${r.accommodation.amenidades?.length ? `
                        <div style="margin-top:10px;padding-top:10px;border-top:1px solid rgba(0,0,0,0.08);">
                            <strong style="color:#92400e;font-size:11px;">AMENIDADES</strong>
                            <div style="margin-top:6px;display:flex;flex-wrap:wrap;gap:6px;">
                                ${r.accommodation.amenidades.map(a => `<span style="background:rgba(255,255,255,0.6);color:#78350f;padding:2px 8px;border-radius:20px;font-size:11px;font-weight:600;">${a}</span>`).join('')}
                            </div>
                        </div>` : ''}
                </div>
            </div>` : `
            <div style="background:#dbeafe;border-radius:10px;padding:12px;display:flex;align-items:center;gap:10px;">
                <i class="fas fa-ticket-alt" style="font-size:20px;color:#1d4ed8;"></i>
                <div>
                    <div style="font-weight:700;color:#1e40af;font-size:14px;">Visita de día / Entrada</div>
                    <div style="color:#3b82f6;font-size:12px;">Sin alojamiento asociado</div>
                </div>
            </div>`;

        content.innerHTML = `
            <div style="display:grid;gap:20px;">
                <div style="background:linear-gradient(135deg,#F4C400,#FFE347);padding:20px;border-radius:12px;text-align:center;">
                    <div style="font-size:14px;color:#195C33;font-weight:600;margin-bottom:8px;">Código de Reserva</div>
                    <div style="font-size:28px;font-weight:800;color:#195C33;font-family:monospace;">${r.bookingCode}</div>
                    <div style="margin-top:8px;">
                        ${isAloj
                            ? `<span style="background:rgba(255,255,255,0.7);color:#92400e;padding:4px 12px;border-radius:20px;font-size:12px;font-weight:700;"><i class="fas fa-bed"></i> Alojamiento · ${r.nights} noche${r.nights > 1 ? 's' : ''}</span>`
                            : `<span style="background:rgba(255,255,255,0.7);color:#1d4ed8;padding:4px 12px;border-radius:20px;font-size:12px;font-weight:700;"><i class="fas fa-ticket-alt"></i> Visita de día</span>`
                        }
                    </div>
                </div>

                <div>
                    <h3 style="font-size:16px;font-weight:700;color:#195C33;margin-bottom:12px;border-bottom:2px solid #f3f4f6;padding-bottom:8px;"><i class="fas fa-user"></i> Cliente</h3>
                    <div style="display:grid;grid-template-columns:repeat(2,1fr);gap:12px;">
                        <div><strong style="color:#6b7280;font-size:12px;">NOMBRE</strong><div style="font-size:14px;font-weight:600;">${r.personalInfo?.fullName}</div></div>
                        <div><strong style="color:#6b7280;font-size:12px;">EMAIL</strong><div style="font-size:14px;font-weight:600;">${r.personalInfo?.email}</div></div>
                        <div><strong style="color:#6b7280;font-size:12px;">TELÉFONO</strong><div style="font-size:14px;font-weight:600;">${r.personalInfo?.phone}</div></div>
                        <div><strong style="color:#6b7280;font-size:12px;">DOCUMENTO</strong><div style="font-size:14px;font-weight:600;">${r.personalInfo?.documentType} · ${r.personalInfo?.documentNumber}</div></div>
                    </div>
                </div>

                ${accomBlock}

                <div>
                    <h3 style="font-size:16px;font-weight:700;color:#195C33;margin-bottom:12px;border-bottom:2px solid #f3f4f6;padding-bottom:8px;"><i class="fas fa-calendar-alt"></i> Fechas y Destino</h3>
                    <div style="display:grid;grid-template-columns:repeat(2,1fr);gap:12px;">
                        <div><strong style="color:#6b7280;font-size:12px;">DESTINO</strong><div style="font-size:14px;font-weight:600;">${r.destination?.name}</div></div>
                        <div><strong style="color:#6b7280;font-size:12px;">SERVICIO</strong><div style="font-size:14px;font-weight:600;">${getServiceLabel(r.serviceType)}</div></div>
                        <div><strong style="color:#6b7280;font-size:12px;">CHECK-IN</strong><div style="font-size:14px;font-weight:600;">${formatDate(r.checkIn)}</div></div>
                        <div><strong style="color:#6b7280;font-size:12px;">CHECK-OUT</strong><div style="font-size:14px;font-weight:600;">${formatDate(r.checkOut)}</div></div>
                        <div><strong style="color:#6b7280;font-size:12px;">NOCHES</strong><div style="font-size:14px;font-weight:600;">${r.nights}</div></div>
                        <div><strong style="color:#6b7280;font-size:12px;">PERSONAS</strong><div style="font-size:14px;font-weight:600;">${r.numPeople}</div></div>
                    </div>
                </div>

                <div>
                    <h3 style="font-size:16px;font-weight:700;color:#195C33;margin-bottom:12px;border-bottom:2px solid #f3f4f6;padding-bottom:8px;"><i class="fas fa-dollar-sign"></i> Desglose de Pago</h3>
                    <div style="background:#f9fafb;padding:16px;border-radius:8px;">
                        <div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid #e5e7eb;"><span style="color:#6b7280;">Subtotal:</span><strong>${formatCurrency(r.pricing?.subtotal || 0)} COP</strong></div>
                        <div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid #e5e7eb;"><span style="color:#6b7280;">Tarifa de servicio:</span><strong>${formatCurrency(r.pricing?.serviceFee || 0)} COP</strong></div>
                        <div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid #e5e7eb;"><span style="color:#6b7280;">Impuestos (IVA):</span><strong>${formatCurrency(r.pricing?.tax || 0)} COP</strong></div>
                        <div style="display:flex;justify-content:space-between;padding:12px 0;font-size:18px;font-weight:800;color:#195C33;"><span>TOTAL:</span><span>${formatCurrency(r.pricing?.total || 0)} COP</span></div>
                    </div>
                </div>

                ${r.personalInfo?.comments ? `
                <div style="background:#f0fdf4;border-left:4px solid #10b981;padding:12px 16px;border-radius:0 8px 8px 0;">
                    <strong style="font-size:12px;color:#166534;">COMENTARIOS DEL CLIENTE</strong>
                    <p style="margin:6px 0 0;font-size:13px;color:#374151;">${r.personalInfo.comments}</p>
                </div>` : ''}

                ${r.status === 'pending' ? `
                <div style="display:flex;gap:12px;">
                    <button class="btn-primary" onclick="confirmReservation('${r.bookingCode}');closeModal('reservationDetailsModal');" style="flex:1;"><i class="fas fa-check"></i> Confirmar</button>
                    <button class="btn-secondary" onclick="cancelReservation('${r.bookingCode}');closeModal('reservationDetailsModal');" style="flex:1;background:#fee2e2;color:#991b1b;"><i class="fas fa-times"></i> Cancelar</button>
                </div>` : ''}
            </div>`;
        modal.classList.add('active');
    } catch (error) { console.error('❌ Error obteniendo detalles de reserva:', error); }
}

async function confirmReservation(bookingCode) {
    if (!confirm('¿Confirmar reserva?')) return;
    try {
        const response = await fetch(`${API_URL}/Bookings/${bookingCode}/status`, {
            method: 'PATCH', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: 'confirmed' })
        });
        const result = await response.json();
        if (result.success) { await loadReservations(); await loadDashboardData(); alert('✅ Reserva confirmada'); }
        else alert('❌ Error al confirmar: ' + result.message);
    } catch (error) { alert('❌ Error de conexión con el servidor'); }
}

async function cancelReservation(bookingCode) {
    if (!confirm('¿Cancelar reserva?')) return;
    try {
        const response = await fetch(`${API_URL}/Bookings/${bookingCode}/cancel`, {
            method: 'PATCH', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ reason: 'Cancelada desde el panel administrativo' })
        });
        const result = await response.json();
        if (result.success) { await loadReservations(); await loadDashboardData(); alert('✅ Reserva cancelada'); }
        else alert('❌ Error al cancelar: ' + result.message);
    } catch (error) { alert('❌ Error de conexión con el servidor'); }
}

// ✅ ACTUALIZADO: exportación incluye modo y alojamiento
async function exportReservations() {
    const reservations = await fetchBookings();
    if (reservations.length === 0) { alert('No hay reservas para exportar'); return; }
    const headers = ['Código','Cliente','Email','Destino','Servicio','Modo','Alojamiento','Check-in','Check-out','Noches','Total','Estado'];
    const rows    = reservations.map(r => [
        r.bookingCode,
        r.personalInfo?.fullName || '',
        r.personalInfo?.email || '',
        r.destination?.name || '',
        getServiceLabel(r.serviceType),
        r.bookingMode === 'alojamiento' ? 'Alojamiento' : 'Entrada',
        r.accommodation?.nombre || '—',
        new Date(r.checkIn).toLocaleDateString('es-CO'),
        new Date(r.checkOut).toLocaleDateString('es-CO'),
        r.nights || '',
        r.pricing?.total || 0,
        r.status
    ]);
    const csv  = headers.join(',') + '\n' + rows.map(row => row.join(',')).join('\n');
    const link = document.createElement('a');
    link.href     = URL.createObjectURL(new Blob(['\uFEFF' + csv], { type: 'text/csv' }));
    link.download = `reservas_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    alert('✅ Exportado');
}

// ==================== DESTINOS ====================

function _getDestFormValues() {
    const toArray = (str) => str.split(',').map(s => s.trim()).filter(Boolean);
    const lat = parseFloat(document.getElementById('destLat').value);
    const lng = parseFloat(document.getElementById('destLng').value);

    return {
        nombre:            document.getElementById('destName').value.trim(),
        categorias:        [document.getElementById('destType').value],
        descripcion:       document.getElementById('destDescription').value.trim(),
        imagen:            document.getElementById('destImage').value.trim(),
        precioBaseReserva: parseFloat(document.getElementById('destPrice').value) || 0,
        ubicacion: {
            municipio:    document.getElementById('destMunicipio').value.trim()    || 'Gigante',
            departamento: document.getElementById('destDepartamento').value.trim() || 'Huila',
            referencia:   document.getElementById('destLocation').value.trim(),
            ...(!isNaN(lat) && !isNaN(lng) && lat !== 0 && lng !== 0 && { coordenadas: { lat, lng } })
        },
        entrada: {
            precio:          parseFloat(document.getElementById('destEntradaPrecio').value) || 0,
            incluyeAlmuerzo: document.getElementById('destIncluyeAlmuerzo').checked,
            notas:           document.getElementById('destEntradaNotas').value.trim()
        },
        horario:     document.getElementById('destHorario').value.trim(),
        petFriendly: document.getElementById('destPetFriendly').checked,
        servicios:   toArray(document.getElementById('destServicios').value),
        atracciones: toArray(document.getElementById('destAtracciones').value),
        contacto: {
            telefono:  document.getElementById('destTelefono').value.trim(),
            email:     document.getElementById('destEmail').value.trim(),
            instagram: document.getElementById('destInstagram').value.trim(),
            facebook:  document.getElementById('destFacebook').value.trim()
        },
        mapCategoria:  document.getElementById('destMapCategoria').value,
        mapTipo:       document.getElementById('destMapTipo').value.trim(),
        mapIcono:      document.getElementById('destMapIcono').value.trim() || '📍',
        paginaDetalle: document.getElementById('destPaginaDetalle').value.trim(),
        qrImageUrl:    (document.getElementById('destQrImageUrl')?.value || '').trim()
    };
}

function _fillDestForm(d) {
    document.getElementById('destName').value         = d.nombre           || '';
    document.getElementById('destType').value         = d.categorias?.[0]  || '';
    document.getElementById('destPrice').value        = d.precioBaseReserva ?? d.entrada?.precio ?? '';
    document.getElementById('destDescription').value  = d.descripcion      || '';
    document.getElementById('destImage').value        = d.imagen           || '';
    document.getElementById('destMunicipio').value    = d.ubicacion?.municipio    || '';
    document.getElementById('destDepartamento').value = d.ubicacion?.departamento || '';
    document.getElementById('destLocation').value     = d.ubicacion?.referencia   || '';
    document.getElementById('destLat').value          = d.ubicacion?.coordenadas?.lat ?? '';
    document.getElementById('destLng').value          = d.ubicacion?.coordenadas?.lng ?? '';
    document.getElementById('destEntradaPrecio').value     = d.entrada?.precio ?? '';
    document.getElementById('destIncluyeAlmuerzo').checked = d.entrada?.incluyeAlmuerzo || false;
    document.getElementById('destEntradaNotas').value      = d.entrada?.notas || '';
    document.getElementById('destHorario').value       = d.horario     || '';
    document.getElementById('destPetFriendly').checked = d.petFriendly || false;
    document.getElementById('destServicios').value     = (d.servicios   || []).join(', ');
    document.getElementById('destAtracciones').value   = (d.atracciones || []).join(', ');
    document.getElementById('destTelefono').value   = d.contacto?.telefono  || '';
    document.getElementById('destEmail').value      = d.contacto?.email     || '';
    document.getElementById('destInstagram').value  = d.contacto?.instagram || '';
    document.getElementById('destFacebook').value   = d.contacto?.facebook  || '';
    document.getElementById('destMapCategoria').value  = d.mapCategoria  || '';
    document.getElementById('destMapTipo').value       = d.mapTipo       || '';
    document.getElementById('destMapIcono').value      = d.mapIcono      || '';
    document.getElementById('destPaginaDetalle').value = d.paginaDetalle || '';

    const qrInput = document.getElementById('destQrImageUrl');
    if (qrInput) {
        qrInput.value = d.qrImageUrl || '';
        const statusEl = document.getElementById('qrCurrentStatus');
        if (statusEl) statusEl.style.display = d.qrImageUrl ? 'flex' : 'none';
        updateQrPreview();
    }
}

async function loadDestinations() {
    const grid = document.getElementById('destinationsGrid');
    if (!grid) return;
    grid.innerHTML = `<div style="grid-column:1/-1;text-align:center;padding:60px 20px;color:#6b7280;"><i class="fas fa-spinner fa-spin" style="font-size:40px;margin-bottom:16px;display:block;color:#195C33;"></i>Cargando destinos...</div>`;
    try {
        const res  = await fetch(`${API_URL}/sitios`, { headers: authHeaders() });
        const data = await res.json();
        if (!data.ok || !data.data?.length) {
            grid.innerHTML = `<div style="grid-column:1/-1;text-align:center;padding:60px 20px;color:#6b7280;"><i class="fas fa-map-marked-alt" style="font-size:64px;margin-bottom:20px;opacity:.3;display:block;"></i><h3 style="margin:0 0 10px;font-size:20px;">No hay destinos registrados</h3><p>Haz clic en <strong>"+ Nuevo Destino"</strong> para agregar el primero.</p></div>`;
            return;
        }
        grid.innerHTML = data.data.map(d => {
            const type     = d.categorias?.[0] || '';
            const price    = d.precioBaseReserva ?? d.entrada?.precio ?? 0;
            const location = d.ubicacion?.referencia || `${d.ubicacion?.municipio || ''}, ${d.ubicacion?.departamento || ''}`;
            const extras   = [];
            if (d.petFriendly) extras.push('🐾 Pet Friendly');
            if (d.horario)     extras.push(`🕐 ${d.horario}`);
            if (d.contacto?.telefono) extras.push(`📞 ${d.contacto.telefono}`);
            const qrBadge = d.qrImageUrl
                ? `<span style="display:inline-flex;align-items:center;gap:4px;background:#d1fae5;color:#059669;padding:2px 8px;border-radius:20px;font-size:11px;font-weight:700;margin-top:6px;"><i class="fas fa-qrcode"></i> QR configurado</span>`
                : `<span style="display:inline-flex;align-items:center;gap:4px;background:#f3f4f6;color:#9ca3af;padding:2px 8px;border-radius:20px;font-size:11px;margin-top:6px;"><i class="fas fa-qrcode"></i> Sin QR</span>`;
            return `
                <div class="destination-card" data-slug="${d.slug}" data-type="${type}">
                    <img src="${d.imagen || '../assets/img/placeholder.jpg'}" alt="${d.nombre}" class="destination-image" onerror="this.src='../assets/img/placeholder.jpg'">
                    <div class="destination-content">
                        <span class="destination-type">${getServiceLabel(type)}</span>
                        <h3 class="destination-name">${d.nombre}</h3>
                        <div class="destination-location"><i class="fas fa-map-marker-alt"></i> ${location}</div>
                        <div class="destination-price">${formatCurrency(price)} COP</div>
                        ${extras.length ? `<div style="font-size:11px;color:#6b7280;margin-top:6px;line-height:1.6;">${extras.join(' &nbsp;·&nbsp; ')}</div>` : ''}
                        ${qrBadge}
                        <div class="destination-actions">
                            <button class="btn-secondary" onclick="editDestination('${d.slug}')"><i class="fas fa-edit"></i> Editar</button>
                            <button class="btn-danger" onclick="deleteDestination('${d.slug}','${d.nombre.replace(/'/g, "\\'")}')"><i class="fas fa-trash-alt"></i> Eliminar</button>
                        </div>
                    </div>
                </div>`;
        }).join('');
    } catch (err) {
        console.error('❌ Error cargando destinos:', err);
        grid.innerHTML = `<div style="grid-column:1/-1;text-align:center;padding:60px 20px;color:#ef4444;"><i class="fas fa-exclamation-triangle" style="font-size:48px;margin-bottom:16px;display:block;"></i><strong>Error al cargar destinos</strong><br><small style="color:#6b7280;">${err.message}</small><br><br><button class="btn-secondary" onclick="loadDestinations()"><i class="fas fa-sync-alt"></i> Reintentar</button></div>`;
    }
}

function openDestinationModal(dest = null) {
    const modal = document.getElementById('destinationModal');
    const title = document.getElementById('destinationModalTitle');
    const form  = document.getElementById('destinationForm');
    form.reset();
    delete form.dataset.slug;
    const qrInput  = document.getElementById('destQrImageUrl');
    const statusEl = document.getElementById('qrCurrentStatus');
    if (qrInput)  qrInput.value = '';
    if (statusEl) statusEl.style.display = 'none';
    _resetQrPreview();
    if (dest) {
        title.textContent = 'Editar Destino';
        form.dataset.slug = dest.slug;
        _fillDestForm(dest);
    } else {
        title.textContent = 'Nuevo Destino';
        document.getElementById('destMapIcono').value     = '📍';
        document.getElementById('destDepartamento').value = 'Huila';
        document.getElementById('destMunicipio').value    = 'Gigante';
    }
    modal.classList.add('active');
    const modalBody = modal.querySelector('.modal-body');
    if (modalBody) modalBody.scrollTop = 0;
}

async function handleDestinationSubmit(e) {
    e.preventDefault();
    const form   = document.getElementById('destinationForm');
    const slug   = form.dataset.slug;
    const values = _getDestFormValues();

    if (!values.nombre)              { alert('⚠️ El nombre es obligatorio.');       return; }
    if (!values.categorias[0])       { alert('⚠️ Selecciona un tipo de servicio.'); return; }
    if (!values.descripcion)         { alert('⚠️ La descripción es obligatoria.');  return; }
    if (!values.ubicacion.municipio) { alert('⚠️ El municipio es obligatorio.');    return; }

    const isEdit = Boolean(slug);
    const url    = isEdit ? `${API_URL}/sitios/${slug}` : `${API_URL}/sitios`;
    const method = isEdit ? 'PUT' : 'POST';

    const submitBtn = form.querySelector('[type="submit"]');
    const original  = submitBtn.innerHTML;
    submitBtn.disabled  = true;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Guardando...';

    try {
        const res    = await fetch(url, { method, headers: authHeaders(), body: JSON.stringify(values) });
        const result = await res.json();
        if (result.ok) {
            closeModal('destinationModal');
            const qrMsg = values.qrImageUrl ? ' · QR de pago guardado ✓' : '';
            showSuccessToast(`✅ Destino "${values.nombre}" ${isEdit ? 'actualizado' : 'creado'} exitosamente${qrMsg}`);
            await loadDestinations();
        } else {
            alert('❌ ' + (result.message || 'Error al guardar el destino'));
        }
    } catch (err) {
        alert('❌ Error de conexión con el servidor');
    }
    submitBtn.disabled  = false;
    submitBtn.innerHTML = original;
}

async function editDestination(slug) {
    try {
        const res    = await fetch(`${API_URL}/sitios/${slug}`, { headers: authHeaders() });
        const result = await res.json();
        if (!result.ok || !result.data) { alert('❌ No se encontró el destino.'); return; }
        openDestinationModal(result.data);
    } catch (err) { alert('❌ Error de conexión con el servidor'); }
}

async function deleteDestination(slug, nombre) {
    if (!confirm(`¿Desactivar "${nombre}"?\n\nEl destino quedará invisible en el sitio pero sus datos se conservarán.`)) return;
    const card = document.querySelector(`[data-slug="${slug}"]`);
    if (card) { card.style.transition = 'all 0.3s ease'; card.style.transform = 'scale(0.9)'; card.style.opacity = '0'; }
    try {
        const res    = await fetch(`${API_URL}/sitios/${slug}`, { method: 'DELETE', headers: authHeaders() });
        const result = await res.json();
        if (result.ok) { showSuccessToast(`✅ Destino "${nombre}" desactivado`); setTimeout(() => loadDestinations(), 300); }
        else { if (card) { card.style.transform = ''; card.style.opacity = '1'; } alert('❌ ' + (result.message || 'No se pudo desactivar')); }
    } catch (err) {
        if (card) { card.style.transform = ''; card.style.opacity = '1'; }
        alert('❌ Error de conexión con el servidor');
    }
}

// ================================================================
// QR DE PAGO — FUNCIONES
// ================================================================

function updateQrPreview() {
    const url    = (document.getElementById('destQrImageUrl')?.value || '').trim();
    const img    = document.getElementById('qrPreviewImg');
    const empty  = document.getElementById('qrPreviewEmpty');
    const status = document.getElementById('qrPreviewStatus');
    const box    = document.getElementById('qrPreviewBox');
    if (!img || !empty) return;
    if (url) {
        img.src             = url;
        img.style.display   = 'block';
        empty.style.display = 'none';
        if (box)    box.style.borderColor = '#10b981';
        if (status) { status.textContent = '⏳ Verificando...'; status.style.color = '#6b7280'; }
        img.onload = () => {
            if (status) { status.textContent = '✅ QR válido'; status.style.color = '#059669'; }
            if (box)    box.style.borderStyle = 'solid';
        };
    } else {
        _resetQrPreview();
    }
}

function handleQrImgError() {
    const img    = document.getElementById('qrPreviewImg');
    const empty  = document.getElementById('qrPreviewEmpty');
    const status = document.getElementById('qrPreviewStatus');
    const box    = document.getElementById('qrPreviewBox');
    if (img)   { img.style.display = 'none'; img.src = ''; }
    if (empty) {
        empty.style.display  = 'flex';
        empty.innerHTML = `<i class="fas fa-exclamation-triangle" style="font-size:30px;color:#fbbf24;"></i><span style="font-size:10px;text-align:center;color:#d97706;margin-top:4px;line-height:1.3;">URL<br>inválida</span>`;
    }
    if (status) { status.textContent = '❌ No se pudo cargar'; status.style.color = '#ef4444'; }
    if (box)    { box.style.borderColor = '#fca5a5'; box.style.borderStyle = 'dashed'; }
}

function _resetQrPreview() {
    const img    = document.getElementById('qrPreviewImg');
    const empty  = document.getElementById('qrPreviewEmpty');
    const status = document.getElementById('qrPreviewStatus');
    const box    = document.getElementById('qrPreviewBox');
    if (img)   { img.style.display = 'none'; img.src = ''; }
    if (empty) {
        empty.style.display = 'flex';
        empty.innerHTML = `<i class="fas fa-qrcode" style="font-size:42px;color:#d1fae5;"></i><span style="font-size:10px;text-align:center;line-height:1.3;">Sin QR<br>configurado</span>`;
    }
    if (status) { status.textContent = ''; }
    if (box)    { box.style.borderColor = '#d1fae5'; box.style.borderStyle = 'dashed'; }
}

// ==================== UTILIDADES DE UI ====================

function showSuccessToast(message) {
    const existing = document.querySelector('.success-toast');
    if (existing) existing.remove();
    const toast = document.createElement('div');
    toast.className = 'success-toast';
    toast.style.cssText = `position:fixed;top:80px;right:20px;background:linear-gradient(135deg,#10b981,#059669);color:white;padding:16px 24px;border-radius:12px;box-shadow:0 4px 12px rgba(16,185,129,.4);z-index:10000;display:flex;align-items:center;gap:12px;font-weight:600;animation:slideInRight .3s ease;`;
    toast.innerHTML = `<i class="fas fa-check-circle" style="font-size:20px;"></i><span>${message}</span>`;
    document.body.appendChild(toast);
    setTimeout(() => { if (toast.parentElement) toast.remove(); }, 3000);
}

if (!document.getElementById('toast-animations')) {
    const style = document.createElement('style');
    style.id = 'toast-animations';
    style.textContent = `@keyframes slideInRight{from{transform:translateX(400px);opacity:0}to{transform:translateX(0);opacity:1}}`;
    document.head.appendChild(style);
}

// ==================== USUARIOS ====================

async function loadUsers() {
    const tbody = document.getElementById('usersTableBody');
    if (!tbody) return;
    tbody.innerHTML = `<tr><td colspan="9" style="text-align:center;padding:40px;color:#6b7280;"><i class="fas fa-spinner fa-spin" style="font-size:24px;margin-bottom:10px;display:block;"></i>Cargando usuarios...</td></tr>`;
    try {
        const [users, bookings] = await Promise.all([fetchUsers(), fetchBookings()]);
        if (users.length === 0) {
            tbody.innerHTML = `<tr><td colspan="9" style="text-align:center;padding:40px;color:#6b7280;"><i class="fas fa-users" style="font-size:48px;margin-bottom:16px;display:block;opacity:0.3;"></i>Sin usuarios registrados</td></tr>`;
            return;
        }
        const reservasPorEmail = {};
        bookings.forEach(b => { const email = b.personalInfo?.email; if (email) reservasPorEmail[email] = (reservasPorEmail[email] || 0) + 1; });
        adminState._allUsers         = users;
        adminState._reservasPorEmail = reservasPorEmail;
        const usersEl = document.getElementById('totalUsers');
        if (usersEl) usersEl.textContent = users.length;
        renderUsersTable(users);
    } catch (error) {
        tbody.innerHTML = `<tr><td colspan="9" style="text-align:center;padding:40px;color:#ef4444;"><i class="fas fa-exclamation-triangle" style="font-size:32px;margin-bottom:12px;display:block;"></i><strong>Error al cargar usuarios</strong><br><small>${error.message}</small><br><br><button class="btn-secondary" onclick="loadUsers()"><i class="fas fa-sync-alt"></i> Reintentar</button></td></tr>`;
    }
}

function renderUsersTable(users) {
    const tbody = document.getElementById('usersTableBody');
    if (!tbody) return;
    if (users.length === 0) { tbody.innerHTML = `<tr><td colspan="9" style="text-align:center;padding:20px;color:#6b7280;">No se encontraron usuarios</td></tr>`; return; }
    tbody.innerHTML = users.map(u => {
        const fullName    = u.fullName || `${u.firstName || ''} ${u.lastName || ''}`.trim() || 'N/A';
        const initials    = getInitials(fullName);
        const role        = u.role || 'customer';
        const phone       = u.phone || u.phoneNumber || 'N/A';
        const created     = formatDate(u.createdAt || new Date().toISOString());
        const email       = u.email || 'N/A';
        const userId      = u._id  || u.id || '';
        const numReservas = adminState._reservasPorEmail?.[email] || 0;
        return `
            <tr>
                <td><div style="width:40px;height:40px;border-radius:50%;background:linear-gradient(135deg,#195C33,#0d3d20);color:white;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:14px;">${initials}</div></td>
                <td><strong>${fullName}</strong></td>
                <td>${email}</td>
                <td>${phone}</td>
                <td><span class="status-badge ${role === 'admin' ? 'status-confirmed' : 'status-pending'}">${role === 'admin' ? 'Admin' : 'Cliente'}</span></td>
                <td>${numReservas > 0 ? `<span style="background:#dcfce7;color:#166534;padding:4px 10px;border-radius:20px;font-weight:700;font-size:13px;">${numReservas}</span>` : `<span style="color:#9ca3af;">0</span>`}</td>
                <td>${created}</td>
                <td><span class="status-badge status-confirmed">Activo</span></td>
                <td style="display:flex;gap:6px;align-items:center;">
                    <button class="action-btn btn-view" onclick="viewUserDetails('${userId}','${fullName.replace(/'/g,"\\'")}','${email}','${phone}','${role}','${created}',${numReservas})" title="Ver detalles"><i class="fas fa-eye"></i></button>
                    <button class="action-btn btn-delete" onclick="deleteUser('${userId}','${fullName.replace(/'/g,"\\'")}')" title="Eliminar" style="background:#fee2e2;color:#991b1b;border:none;padding:6px 10px;border-radius:6px;cursor:pointer;"><i class="fas fa-trash-alt"></i></button>
                </td>
            </tr>`;
    }).join('');
}

function filterUsersTable(query) {
    const users = adminState._allUsers || [];
    if (!query) { renderUsersTable(users); return; }
    const filtered = users.filter(u => {
        const fullName = (u.fullName || `${u.firstName || ''} ${u.lastName || ''}`).toLowerCase();
        return fullName.includes(query) || (u.email || '').toLowerCase().includes(query);
    });
    renderUsersTable(filtered);
}

function viewUserDetails(id, name, email, phone, role, created, reservas) {
    const modal   = document.getElementById('userDetailsModal');
    const content = document.getElementById('userDetailsContent');
    if (!modal || !content) return;
    content.innerHTML = `
        <div style="display:grid;gap:16px;">
            <div style="background:linear-gradient(135deg,#195C33,#0d3d20);padding:24px;border-radius:12px;text-align:center;">
                <div style="width:64px;height:64px;border-radius:50%;background:rgba(255,255,255,0.2);color:white;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:24px;margin:0 auto 12px;">${getInitials(name)}</div>
                <div style="color:white;font-size:20px;font-weight:700;">${name}</div>
                <div style="color:rgba(255,255,255,0.7);font-size:13px;margin-top:4px;">${role === 'admin' ? '🔧 Administrador' : '👤 Cliente'}</div>
            </div>
            <div style="display:grid;grid-template-columns:repeat(2,1fr);gap:12px;">
                <div style="background:#f9fafb;padding:14px;border-radius:10px;"><div style="color:#6b7280;font-size:11px;font-weight:600;margin-bottom:4px;">EMAIL</div><div style="font-size:13px;font-weight:600;word-break:break-all;">${email}</div></div>
                <div style="background:#f9fafb;padding:14px;border-radius:10px;"><div style="color:#6b7280;font-size:11px;font-weight:600;margin-bottom:4px;">TELÉFONO</div><div style="font-size:13px;font-weight:600;">${phone}</div></div>
                <div style="background:#f9fafb;padding:14px;border-radius:10px;"><div style="color:#6b7280;font-size:11px;font-weight:600;margin-bottom:4px;">REGISTRO</div><div style="font-size:13px;font-weight:600;">${created}</div></div>
                <div style="background:#dcfce7;padding:14px;border-radius:10px;"><div style="color:#166534;font-size:11px;font-weight:600;margin-bottom:4px;">RESERVAS</div><div style="font-size:24px;font-weight:800;color:#166534;">${reservas}</div></div>
            </div>
        </div>`;
    modal.classList.add('active');
}

async function deleteUser(userId, userName) {
    if (!userId) { alert('❌ ID de usuario no válido'); return; }
    if (!confirm(`¿Eliminar al usuario "${userName}"?\n\n⚠️ Esta acción no se puede deshacer.`)) return;
    try {
        const response = await fetch(`${API_URL}/users/${userId}`, { method: 'DELETE', headers: authHeaders() });
        const result   = await response.json();
        if (result.success) { showSuccessToast(`✅ Usuario "${userName}" eliminado`); await loadUsers(); }
        else alert('❌ Error: ' + result.message);
    } catch (error) { alert('❌ Error de conexión con el servidor'); }
}

function openNewUserModal() {
    const form    = document.getElementById('newUserForm');
    const errorEl = document.getElementById('newUserError');
    if (form)    form.reset();
    if (errorEl) errorEl.style.display = 'none';
    document.getElementById('newUserModal').classList.add('active');
}

// ==================== GRÁFICOS ====================

async function initializeCharts() {
    if (adminState.charts.reservations || adminState.charts.services) { updateCharts(); return; }
    const allRes = await fetchBookings();
    const reservationsCtx = document.getElementById('reservationsChart');
    if (reservationsCtx) {
        const { labels, data } = getChartData(allRes, adminState.dashboardPeriod);
        adminState.charts.reservations = new Chart(reservationsCtx, {
            type: 'line',
            data: { labels, datasets: [{ label: 'Reservas', data, borderColor: '#195C33', backgroundColor: 'rgba(25,92,51,0.1)', tension: 0.4, fill: true, pointRadius: 4, pointHoverRadius: 6 }] },
            options: { responsive: true, maintainAspectRatio: true, aspectRatio: 2, animation: { duration: 300 }, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, ticks: { precision: 0, maxTicksLimit: 6 } }, x: { ticks: { maxTicksLimit: 8 } } } }
        });
    }
    const servicesCtx = document.getElementById('servicesChart');
    if (servicesCtx) {
        const { startDate, endDate } = getDateRangeForPeriod(adminState.dashboardPeriod);
        const res    = filterByDateRange(allRes, startDate, endDate);
        const counts = { parque: 0, mirador: 0, glamping: 0, hospedaje: 0 };
        res.forEach(r => { if (counts[r.serviceType] !== undefined) counts[r.serviceType]++; });
        adminState.charts.services = new Chart(servicesCtx, {
            type: 'doughnut',
            data: { labels: ['Parques', 'Miradores', 'Glamping', 'Hospedaje'], datasets: [{ data: [counts.parque, counts.mirador, counts.glamping, counts.hospedaje], backgroundColor: ['#10b981', '#3b82f6', '#f59e0b', '#8b5cf6'], borderWidth: 2, borderColor: '#ffffff' }] },
            options: { responsive: true, maintainAspectRatio: true, aspectRatio: 1.5, animation: { duration: 300 }, plugins: { legend: { position: 'bottom', labels: { padding: 15, font: { size: 12 } } } } }
        });
    }

    // ✅ NUEVO: gráfico de entrada vs alojamiento
    const modeCtx = document.getElementById('modeBreakdownChart');
    if (modeCtx) {
        const { startDate, endDate } = getDateRangeForPeriod(adminState.dashboardPeriod);
        const res      = filterByDateRange(allRes, startDate, endDate);
        const entradas = res.filter(r => (r.bookingMode || 'entrada') === 'entrada').length;
        const alojam   = res.filter(r => r.bookingMode === 'alojamiento').length;
        adminState.charts.mode = new Chart(modeCtx, {
            type: 'doughnut',
            data: {
                labels: ['Visitas de día', 'Alojamientos'],
                datasets: [{ data: [entradas, alojam], backgroundColor: ['#3b82f6', '#f59e0b'], borderWidth: 2, borderColor: '#ffffff' }]
            },
            options: { responsive: true, maintainAspectRatio: true, aspectRatio: 1.5, animation: { duration: 300 }, plugins: { legend: { position: 'bottom', labels: { padding: 15, font: { size: 12 } } } } }
        });
    }
}

function getChartData(reservations, period) {
    const labels = [], data = [];
    if (period === 'week') {
        for (let i = 6; i >= 0; i--) {
            const date = new Date(); date.setDate(date.getDate() - i);
            labels.push(date.toLocaleDateString('es', { weekday: 'short' }));
            data.push(reservations.filter(r => new Date(r.createdAt || r.timestamp).toDateString() === date.toDateString()).length);
        }
    } else if (period === 'biweekly') {
        for (let i = 6; i >= 0; i--) {
            const date = new Date(); date.setDate(date.getDate() - (i * 2));
            labels.push(`${date.getDate()}/${date.getMonth() + 1}`);
            const d2 = new Date(date); d2.setDate(date.getDate() + 1);
            data.push(reservations.filter(r => { const rDate = new Date(r.createdAt || r.timestamp); return rDate.toDateString() === date.toDateString() || rDate.toDateString() === d2.toDateString(); }).length);
        }
    } else {
        for (let i = 3; i >= 0; i--) {
            const start = new Date(); start.setDate(start.getDate() - (i * 7 + 6));
            const end   = new Date(); end.setDate(end.getDate() - (i * 7));
            labels.push(`Sem ${4 - i}`);
            data.push(reservations.filter(r => { const rDate = new Date(r.createdAt || r.timestamp); return rDate >= start && rDate <= end; }).length);
        }
    }
    return { labels, data };
}

async function updateCharts() {
    const allRes = await fetchBookings();
    if (adminState.charts.reservations) {
        const { labels, data } = getChartData(allRes, adminState.dashboardPeriod);
        adminState.charts.reservations.data.labels            = labels;
        adminState.charts.reservations.data.datasets[0].data = data;
        adminState.charts.reservations.update('none');
    }
    if (adminState.charts.services) {
        const { startDate, endDate } = getDateRangeForPeriod(adminState.dashboardPeriod);
        const res    = filterByDateRange(allRes, startDate, endDate);
        const counts = { parque: 0, mirador: 0, glamping: 0, hospedaje: 0 };
        res.forEach(r => { if (counts[r.serviceType] !== undefined) counts[r.serviceType]++; });
        adminState.charts.services.data.datasets[0].data = [counts.parque, counts.mirador, counts.glamping, counts.hospedaje];
        adminState.charts.services.update('none');
    }
    // ✅ NUEVO: actualizar gráfico de modo
    if (adminState.charts.mode) {
        const { startDate, endDate } = getDateRangeForPeriod(adminState.dashboardPeriod);
        const res      = filterByDateRange(allRes, startDate, endDate);
        const entradas = res.filter(r => (r.bookingMode || 'entrada') === 'entrada').length;
        const alojam   = res.filter(r => r.bookingMode === 'alojamiento').length;
        adminState.charts.mode.data.datasets[0].data = [entradas, alojam];
        adminState.charts.mode.update('none');
    }
}

// ==================== MODALES ====================

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) modal.classList.remove('active');
}

document.addEventListener('click', (e) => {
    if (e.target.classList.contains('modal-overlay'))
        e.target.closest('.modal').classList.remove('active');
});

// ==================== UTILIDADES ====================

function formatCurrency(amount) { return new Intl.NumberFormat('es-CO').format(Math.round(amount)); }

function formatDate(dateString) {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('es-CO', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function formatTimeAgo(timestamp) {
    if (!timestamp) return '';
    const diff    = Date.now() - new Date(timestamp);
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(diff / 60000);
    const hours   = Math.floor(diff / 3600000);
    const days    = Math.floor(diff / 86400000);
    if (seconds < 60) return `Hace ${seconds}s`;
    if (minutes < 60) return `Hace ${minutes}m`;
    if (hours   < 24) return `Hace ${hours}h`;
    return `Hace ${days}d`;
}

function getServiceLabel(type) {
    return { parque: 'Parque', mirador: 'Mirador', glamping: 'Glamping', hospedaje: 'Hospedaje' }[type] || (type || '—');
}

// ================================================================
// SECCIÓN ANÁLISIS
// ================================================================

const analyticsCharts = {};

function initAnalyticsDates() {
    const end   = new Date(); const start = new Date();
    start.setMonth(start.getMonth() - 1);
    const fmt = d => d.toISOString().split('T')[0];
    const startEl = document.getElementById('analyticsStartDate');
    const endEl   = document.getElementById('analyticsEndDate');
    if (startEl && !startEl.value) startEl.value = fmt(start);
    if (endEl   && !endEl.value)   endEl.value   = fmt(end);
}

function getAnalyticsRange() {
    const startVal = document.getElementById('analyticsStartDate')?.value;
    const endVal   = document.getElementById('analyticsEndDate')?.value;
    return {
        start: startVal ? new Date(startVal + 'T00:00:00') : null,
        end:   endVal   ? new Date(endVal   + 'T23:59:59') : null
    };
}

function filterByAnalyticsRange(reservations) {
    const { start, end } = getAnalyticsRange();
    return reservations.filter(r => {
        const d = new Date(r.createdAt || r.timestamp);
        if (start && d < start) return false;
        if (end   && d > end)   return false;
        return true;
    });
}

function destroyChart(key) {
    if (analyticsCharts[key]) { analyticsCharts[key].destroy(); delete analyticsCharts[key]; }
}

async function loadAnalytics() {
    initAnalyticsDates();
    showAnalyticsLoading(true);
    try {
        const allBookings = await fetchBookings();
        const filtered    = filterByAnalyticsRange(allBookings);
        renderAnalyticsKpis(filtered, allBookings);
        renderTopDestinationsChart(filtered);
        renderRevenueByServiceChart(filtered);
        renderMonthlyCharts(allBookings);
        renderTopClientsTable(filtered);
        renderStatusChart(filtered);
        // ✅ NUEVO: gráfico de entrada vs alojamiento en analítica
        renderModeChart(filtered);
    } catch (err) { console.error('❌ Error cargando análisis:', err); }
    showAnalyticsLoading(false);
    attachAnalyticsListeners();
}

function showAnalyticsLoading(on) {
    ['topDestinationsChart','revenueByServiceChart','occupancyChart','revenueMonthlyChart','statusChart','modeAnalyticsChart'].forEach(id => {
        const canvas = document.getElementById(id);
        if (canvas) canvas.style.opacity = on ? '0.3' : '1';
    });
}

let _analyticsListenersReady = false;
function attachAnalyticsListeners() {
    if (_analyticsListenersReady) return;
    _analyticsListenersReady = true;
    const btnApply = document.getElementById('btnApplyAnalytics');
    const btnReset = document.getElementById('btnResetAnalytics');
    if (btnApply) btnApply.onclick = () => loadAnalytics();
    if (btnReset) btnReset.onclick = () => {
        const end = new Date(); const start = new Date();
        start.setMonth(start.getMonth() - 1);
        const fmt = d => d.toISOString().split('T')[0];
        document.getElementById('analyticsStartDate').value = fmt(start);
        document.getElementById('analyticsEndDate').value   = fmt(end);
        loadAnalytics();
    };
}

function renderAnalyticsKpis(filtered, all) {
    const confirmed = filtered.filter(r => r.status !== 'cancelled');
    const revenue   = confirmed.reduce((s, r) => s + (r.pricing?.total || 0), 0);
    const avg       = confirmed.length ? revenue / confirmed.length : 0;
    const rate      = filtered.length  ? (confirmed.length / filtered.length) * 100 : 0;
    const { start, end } = getAnalyticsRange();
    let prevLabel = '';
    if (start && end) {
        const dur = end - start; const pEnd = new Date(start.getTime() - 1); const pStart = new Date(pEnd.getTime() - dur);
        const prev = all.filter(r => { const d = new Date(r.createdAt || r.timestamp); return d >= pStart && d <= pEnd && r.status !== 'cancelled'; });
        const prevRev = prev.reduce((s, r) => s + (r.pricing?.total || 0), 0);
        if (prevRev > 0) { const diff = ((revenue - prevRev) / prevRev) * 100; prevLabel = `${diff >= 0 ? '▲' : '▼'} ${Math.abs(diff).toFixed(1)}% vs período anterior`; }
    }
    const set = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
    set('aKpiRevenue',        `$${formatCurrency(revenue)}`);
    set('aKpiBookings',       filtered.length);
    set('aKpiAvg',            `$${formatCurrency(avg)}`);
    set('aKpiConversion',     `${rate.toFixed(1)}%`);
    set('aKpiRevenueChange',  prevLabel || 'vs período anterior');
    set('aKpiBookingsChange', `${confirmed.length} confirmadas · ${filtered.filter(r => r.status === 'cancelled').length} canceladas`);
}

function renderTopDestinationsChart(reservations) {
    destroyChart('topDest');
    const ctx = document.getElementById('topDestinationsChart');
    if (!ctx) return;
    const counts = {};
    reservations.forEach(r => { const name = r.destination?.name || 'Sin nombre'; counts[name] = (counts[name] || 0) + 1; });
    const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 6);
    if (sorted.length === 0) { renderEmptyChart(ctx, 'Sin reservas en el período'); return; }
    const colors = ['#195C33','#2d8653','#10b981','#34d399','#6ee7b7','#a7f3d0'];
    analyticsCharts.topDest = new Chart(ctx, {
        type: 'bar',
        data: { labels: sorted.map(([k]) => k), datasets: [{ label: 'Reservas', data: sorted.map(([, v]) => v), backgroundColor: colors, borderRadius: 6, borderSkipped: false }] },
        options: { indexAxis: 'y', responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false }, tooltip: { callbacks: { label: c => ` ${c.raw} reservas` } } }, scales: { x: { beginAtZero: true, ticks: { precision: 0 }, grid: { color: '#f3f4f6' } }, y: { grid: { display: false } } } }
    });
}

function renderRevenueByServiceChart(reservations) {
    destroyChart('revService');
    const ctx = document.getElementById('revenueByServiceChart');
    if (!ctx) return;
    const sums = { parque: 0, mirador: 0, glamping: 0, hospedaje: 0 };
    reservations.filter(r => r.status !== 'cancelled').forEach(r => { if (sums[r.serviceType] !== undefined) sums[r.serviceType] += r.pricing?.total || 0; });
    const data = [sums.parque, sums.mirador, sums.glamping, sums.hospedaje];
    if (data.every(v => v === 0)) { renderEmptyChart(ctx, 'Sin ingresos en el período'); return; }
    analyticsCharts.revService = new Chart(ctx, {
        type: 'doughnut',
        data: { labels: ['Parques', 'Miradores', 'Glamping', 'Hospedaje'], datasets: [{ data, backgroundColor: ['#195C33','#3b82f6','#f59e0b','#8b5cf6'], borderWidth: 3, borderColor: '#ffffff', hoverOffset: 8 }] },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom', labels: { padding: 16, font: { size: 12 } } }, tooltip: { callbacks: { label: c => ` $${formatCurrency(c.raw)} COP` } } } }
    });
}

function renderMonthlyCharts(allBookings) {
    const now = new Date(); const labels = []; const counts = []; const revenues = [];
    for (let i = 11; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        labels.push(d.toLocaleDateString('es-CO', { month: 'short', year: '2-digit' }));
        const mb = allBookings.filter(r => { const rd = new Date(r.createdAt || r.timestamp); return rd.getFullYear() === d.getFullYear() && rd.getMonth() === d.getMonth(); });
        counts.push(mb.length);
        revenues.push(mb.filter(r => r.status !== 'cancelled').reduce((s, r) => s + (r.pricing?.total || 0), 0));
    }
    destroyChart('occupancy');
    const ctx1 = document.getElementById('occupancyChart');
    if (ctx1) analyticsCharts.occupancy = new Chart(ctx1, { type: 'bar', data: { labels, datasets: [{ label: 'Reservas', data: counts, backgroundColor: 'rgba(25,92,51,0.15)', borderColor: '#195C33', borderWidth: 2, borderRadius: 5, borderSkipped: false }] }, options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, ticks: { precision: 0 } }, x: { grid: { display: false } } } } });
    destroyChart('revMonthly');
    const ctx2 = document.getElementById('revenueMonthlyChart');
    if (ctx2) analyticsCharts.revMonthly = new Chart(ctx2, { type: 'line', data: { labels, datasets: [{ label: 'Ingresos COP', data: revenues, borderColor: '#f59e0b', backgroundColor: 'rgba(245,158,11,0.1)', tension: 0.4, fill: true, pointRadius: 4, pointHoverRadius: 7, pointBackgroundColor: '#f59e0b' }] }, options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false }, tooltip: { callbacks: { label: c => ` $${formatCurrency(c.raw)} COP` } } }, scales: { y: { beginAtZero: true, ticks: { callback: v => `$${formatCurrency(v)}` } }, x: { grid: { display: false } } } } });
}

function renderStatusChart(reservations) {
    destroyChart('status');
    const ctx = document.getElementById('statusChart');
    if (!ctx) return;
    const counts = { pending: 0, confirmed: 0, completed: 0, cancelled: 0, 'in-progress': 0 };
    reservations.forEach(r => { if (counts[r.status] !== undefined) counts[r.status]++; });
    if (Object.values(counts).every(v => v === 0)) { renderEmptyChart(ctx, 'Sin reservas en el período'); return; }
    analyticsCharts.status = new Chart(ctx, { type: 'pie', data: { labels: ['Pendientes','Confirmadas','Completadas','Canceladas','En Curso'], datasets: [{ data: [counts.pending, counts.confirmed, counts.completed, counts.cancelled, counts['in-progress']], backgroundColor: ['#f59e0b','#10b981','#3b82f6','#ef4444','#8b5cf6'], borderWidth: 3, borderColor: '#ffffff', hoverOffset: 8 }] }, options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom', labels: { padding: 12, font: { size: 12 } } }, tooltip: { callbacks: { label: c => ` ${c.raw} reservas (${((c.raw / reservations.length) * 100).toFixed(1)}%)` } } } } });
}

// ✅ NUEVO: gráfico de entrada vs alojamiento en analítica
function renderModeChart(reservations) {
    destroyChart('modeAnalytics');
    const ctx = document.getElementById('modeAnalyticsChart');
    if (!ctx) return;
    const entradas = reservations.filter(r => (r.bookingMode || 'entrada') === 'entrada').length;
    const alojam   = reservations.filter(r => r.bookingMode === 'alojamiento').length;
    if (entradas === 0 && alojam === 0) { renderEmptyChart(ctx, 'Sin reservas en el período'); return; }
    analyticsCharts.modeAnalytics = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: ['Visitas de día', 'Alojamientos'],
            datasets: [{
                label: 'Reservas',
                data: [entradas, alojam],
                backgroundColor: ['#3b82f6', '#f59e0b'],
                borderRadius: 8,
                borderSkipped: false
            }]
        },
        options: {
            responsive: true, maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: { callbacks: { label: c => ` ${c.raw} reservas` } }
            },
            scales: { y: { beginAtZero: true, ticks: { precision: 0 } }, x: { grid: { display: false } } }
        }
    });
}

function renderTopClientsTable(reservations) {
    const container = document.getElementById('topClientsTable');
    if (!container) return;
    const counts = {};
    reservations.forEach(r => {
        const key = r.personalInfo?.email || 'desconocido'; const name = r.personalInfo?.fullName || key;
        if (!counts[key]) counts[key] = { name, email: key, total: 0, revenue: 0 };
        counts[key].total++;
        if (r.status !== 'cancelled') counts[key].revenue += r.pricing?.total || 0;
    });
    const top = Object.values(counts).sort((a, b) => b.total - a.total).slice(0, 8);
    if (top.length === 0) { container.innerHTML = `<p style="text-align:center;color:#6b7280;padding:24px;">Sin datos en el período</p>`; return; }
    container.innerHTML = `<table style="width:100%;border-collapse:collapse;font-size:13px;"><thead><tr style="border-bottom:2px solid #f3f4f6;"><th style="text-align:left;padding:8px 6px;color:#6b7280;font-weight:600;">#</th><th style="text-align:left;padding:8px 6px;color:#6b7280;font-weight:600;">Cliente</th><th style="text-align:center;padding:8px 6px;color:#6b7280;font-weight:600;">Reservas</th><th style="text-align:right;padding:8px 6px;color:#6b7280;font-weight:600;">Ingresos</th></tr></thead><tbody>${top.map((c, i) => `<tr style="border-bottom:1px solid #f9fafb;"><td style="padding:10px 6px;"><div style="width:26px;height:26px;border-radius:50%;background:${i < 3 ? 'linear-gradient(135deg,#F4C400,#d97706)' : 'linear-gradient(135deg,#195C33,#0d3d20)'};color:white;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:12px;">${i + 1}</div></td><td style="padding:10px 6px;"><div style="font-weight:600;color:#111827;">${c.name}</div><div style="color:#9ca3af;font-size:11px;">${c.email}</div></td><td style="text-align:center;padding:10px 6px;"><span style="background:#dcfce7;color:#166534;padding:3px 10px;border-radius:20px;font-weight:700;">${c.total}</span></td><td style="text-align:right;padding:10px 6px;font-weight:700;color:#195C33;">$${formatCurrency(c.revenue)}</td></tr>`).join('')}</tbody></table>`;
}

function renderEmptyChart(ctx, message) {
    const parent = ctx.parentElement; ctx.style.display = 'none';
    const existing = parent.querySelector('.analytics-empty-msg');
    if (existing) existing.remove();
    const msg = document.createElement('div');
    msg.className = 'analytics-empty-msg';
    msg.style.cssText = 'text-align:center;padding:40px 20px;color:#9ca3af;font-size:14px;';
    msg.innerHTML = `<i class="fas fa-chart-bar" style="font-size:36px;margin-bottom:12px;display:block;opacity:.3;"></i>${message}`;
    parent.appendChild(msg);
}

// ================================================================
// MÓDULO REPORTES
// ================================================================

const reportsState = {
    type: null, allBookings: [], allUsers: [], filtered: [], headers: [], rows: [], listenersOk: false
};

async function loadReports() {
    initReportDates();
    attachReportListeners();
    try {
        reportsState.allBookings = await fetchBookings();
        reportsState.allUsers    = await fetchUsers();
        updateReportCardCounts(reportsState.allBookings);
    } catch (e) { console.error('❌ Error precargando reportes:', e); }
}

function initReportDates() {
    const end = new Date(); const start = new Date();
    start.setDate(start.getDate() - 30);
    const fmt = d => d.toISOString().split('T')[0];
    const s = document.getElementById('reportStartDate'); const e = document.getElementById('reportEndDate');
    if (s && !s.value) s.value = fmt(start);
    if (e && !e.value) e.value = fmt(end);
}

function attachReportListeners() {
    if (reportsState.listenersOk) return;
    reportsState.listenersOk = true;
    const quick = document.getElementById('reportQuickPeriod');
    if (quick) { quick.onchange = function () { const days = parseInt(this.value); if (days === 0) return; const end = new Date(); const start = new Date(); start.setDate(start.getDate() - days); const fmt = d => d.toISOString().split('T')[0]; document.getElementById('reportStartDate').value = fmt(start); document.getElementById('reportEndDate').value = fmt(end); }; }
    const btn = document.getElementById('btnGenerateReports');
    if (btn) btn.onclick = () => generateSelectedReport();
}

function updateReportCardCounts(bookings) {
    const { start, end } = getReportRange();
    const filtered = bookings.filter(b => { const d = new Date(b.createdAt || b.timestamp); return d >= start && d <= end; });
    const destCount   = new Set(filtered.map(b => b.destination?.name)).size;
    const clientCount = new Set(filtered.map(b => b.personalInfo?.email)).size;
    const set = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
    set('reportCount-reservations', `${filtered.length} reservas`);
    set('reportCount-revenue',      `${filtered.filter(b => b.status !== 'cancelled').length} confirmadas`);
    set('reportCount-destinations', `${destCount} destinos activos`);
    set('reportCount-clients',      `${clientCount} clientes únicos`);
}

function getReportRange() {
    const sv = document.getElementById('reportStartDate')?.value; const ev = document.getElementById('reportEndDate')?.value;
    return { start: sv ? new Date(sv + 'T00:00:00') : new Date(0), end: ev ? new Date(ev + 'T23:59:59') : new Date() };
}

function filterBookingsByRange(bookings) {
    const { start, end } = getReportRange();
    return bookings.filter(b => { const d = new Date(b.createdAt || b.timestamp); return d >= start && d <= end; });
}

function selectReportType(type) {
    reportsState.type = type;
    document.querySelectorAll('.report-type-card').forEach(c => c.classList.remove('active'));
    const card = document.getElementById(`reportCard-${type}`);
    if (card) card.classList.add('active');
}

async function generateSelectedReport() {
    if (!reportsState.type) { alert('⚠️ Selecciona un tipo de reporte primero.'); return; }
    const btn = document.getElementById('btnGenerateReports'); const orig = btn.innerHTML;
    btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Generando...';
    try {
        reportsState.allBookings = await fetchBookings(); reportsState.allUsers = await fetchUsers();
        reportsState.filtered = filterBookingsByRange(reportsState.allBookings);
        updateReportCardCounts(reportsState.allBookings);
        switch (reportsState.type) {
            case 'reservations': buildReservationsReport(); break;
            case 'revenue':      buildRevenueReport();      break;
            case 'destinations': buildDestinationsReport(); break;
            case 'clients':      buildClientsReport();      break;
        }
        document.getElementById('reportEmptyState').style.display  = 'none';
        document.getElementById('reportPreviewArea').style.display = 'block';
    } catch (e) { console.error('❌ Error generando reporte:', e); alert('❌ Error al generar el reporte.'); }
    btn.disabled = false; btn.innerHTML = orig;
}

// ✅ ACTUALIZADO: reporte de reservas incluye Modo y Alojamiento
function buildReservationsReport() {
    const bookings = reportsState.filtered; const { start, end } = getReportRange();
    setReportTitle('<i class="fas fa-calendar-check" style="color:#3b82f6;"></i> Reporte de Reservas', `Del ${fmtReportDate(start)} al ${fmtReportDate(end)} · ${bookings.length} registros`);
    const confirmed   = bookings.filter(b => b.status === 'confirmed' || b.status === 'completed');
    const cancelled   = bookings.filter(b => b.status === 'cancelled');
    const revenue     = confirmed.reduce((s, b) => s + (b.pricing?.total || 0), 0);
    const alojamCount = bookings.filter(b => b.bookingMode === 'alojamiento').length;
    renderReportKpis([
        { value: bookings.length, label: 'Total Reservas', color: '#3b82f6' },
        { value: confirmed.length, label: 'Confirmadas', color: '#10b981' },
        { value: cancelled.length, label: 'Canceladas', color: '#ef4444' },
        { value: `$${fmtMoney(revenue)}`, label: 'Ingresos Totales', color: '#195C33' }
    ]);
    // ✅ Columnas actualizadas
    const headers = ['Código','Cliente','Email','Destino','Servicio','Modo','Alojamiento','Check-in','Check-out','Noches','Personas','Total COP','Estado'];
    const rows = bookings.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).map(b => [
        b.bookingCode,
        b.personalInfo?.fullName || '—',
        b.personalInfo?.email || '—',
        b.destination?.name || '—',
        getServiceLabel(b.serviceType),
        b.bookingMode === 'alojamiento' ? '🛏 Alojamiento' : '🎫 Entrada',
        b.accommodation?.nombre || '—',
        fmtReportDate(new Date(b.checkIn)),
        fmtReportDate(new Date(b.checkOut)),
        b.nights || '—',
        b.numPeople,
        fmtMoney(b.pricing?.total || 0),
        statusLabel(b.status)
    ]);
    reportsState.headers = headers; reportsState.rows = rows;
    renderReportTable(headers, rows); setTableFooter(`${rows.length} reservas · ${alojamCount} alojamientos · ${rows.length - alojamCount} visitas de día · Generado el ${fmtReportDateTime(new Date())}`);
}

function buildRevenueReport() {
    const confirmed = reportsState.filtered.filter(b => b.status !== 'cancelled'); const { start, end } = getReportRange();
    setReportTitle('<i class="fas fa-dollar-sign" style="color:#10b981;"></i> Reporte de Ingresos', `Del ${fmtReportDate(start)} al ${fmtReportDate(end)}`);
    const byDay = {};
    confirmed.forEach(b => { const day = new Date(b.createdAt || b.timestamp).toISOString().split('T')[0]; if (!byDay[day]) byDay[day] = { count: 0, revenue: 0, services: {} }; byDay[day].count++; byDay[day].revenue += b.pricing?.total || 0; const svc = b.serviceType || 'otro'; byDay[day].services[svc] = (byDay[day].services[svc] || 0) + (b.pricing?.total || 0); });
    const totalRevenue = confirmed.reduce((s, b) => s + (b.pricing?.total || 0), 0);
    const avgPerDay    = Object.keys(byDay).length ? totalRevenue / Object.keys(byDay).length : 0;
    renderReportKpis([{ value: `$${fmtMoney(totalRevenue)}`, label: 'Ingresos Totales', color: '#10b981' }, { value: confirmed.length, label: 'Reservas Activas', color: '#3b82f6' }, { value: `$${fmtMoney(totalRevenue / (confirmed.length || 1))}`, label: 'Ticket Promedio', color: '#f59e0b' }, { value: `$${fmtMoney(avgPerDay)}`, label: 'Promedio Diario', color: '#8b5cf6' }]);
    const headers = ['Fecha','Reservas','Ingresos COP','Parques','Miradores','Glamping','Hospedaje','Acumulado'];
    let acum = 0;
    const rows = Object.entries(byDay).sort((a, b) => a[0].localeCompare(b[0])).map(([day, d]) => { acum += d.revenue; return [day, d.count, fmtMoney(d.revenue), fmtMoney(d.services.parque || 0), fmtMoney(d.services.mirador || 0), fmtMoney(d.services.glamping || 0), fmtMoney(d.services.hospedaje || 0), fmtMoney(acum)]; });
    reportsState.headers = headers; reportsState.rows = rows;
    renderReportTable(headers, rows); setTableFooter(`${rows.length} días · Total: $${fmtMoney(totalRevenue)} COP`);
}

function buildDestinationsReport() {
    const bookings = reportsState.filtered; const { start, end } = getReportRange();
    setReportTitle('<i class="fas fa-map-marked-alt" style="color:#f59e0b;"></i> Reporte de Destinos', `Del ${fmtReportDate(start)} al ${fmtReportDate(end)}`);
    const byDest = {};
    bookings.forEach(b => {
        const key = b.destination?.name || 'Sin nombre';
        if (!byDest[key]) byDest[key] = { count: 0, confirmed: 0, cancelled: 0, revenue: 0, people: 0, entradas: 0, alojamientos: 0 };
        byDest[key].count++;
        byDest[key].people += parseInt(b.numPeople) || 0;
        // ✅ NUEVO: contar por modo
        if (b.bookingMode === 'alojamiento') byDest[key].alojamientos++;
        else byDest[key].entradas++;
        if (b.status === 'cancelled') byDest[key].cancelled++;
        else { byDest[key].confirmed++; byDest[key].revenue += b.pricing?.total || 0; }
    });
    const sorted = Object.entries(byDest).sort((a, b) => b[1].revenue - a[1].revenue);
    const totalRevenue = sorted.reduce((s, [, d]) => s + d.revenue, 0);
    renderReportKpis([{ value: sorted.length, label: 'Destinos Activos', color: '#f59e0b' }, { value: bookings.length, label: 'Reservas Totales', color: '#3b82f6' }, { value: `$${fmtMoney(totalRevenue)}`, label: 'Ingresos Totales', color: '#10b981' }, { value: sorted[0]?.[0] || '—', label: '🏆 Más Popular', color: '#195C33' }]);
    // ✅ Columnas actualizadas con entradas y alojamientos
    const headers = ['Destino','Total','Confirmadas','Canceladas','Entradas','Alojam.','Visitantes','Ingresos COP','% Total'];
    const rows = sorted.map(([name, d]) => [name, d.count, d.confirmed, d.cancelled, d.entradas, d.alojamientos, d.people, fmtMoney(d.revenue), totalRevenue > 0 ? `${((d.revenue / totalRevenue) * 100).toFixed(1)}%` : '0%']);
    reportsState.headers = headers; reportsState.rows = rows;
    renderReportTable(headers, rows); setTableFooter(`${sorted.length} destinos · Total: $${fmtMoney(totalRevenue)} COP`);
}

function buildClientsReport() {
    const bookings = reportsState.filtered; const { start, end } = getReportRange();
    setReportTitle('<i class="fas fa-users" style="color:#8b5cf6;"></i> Reporte de Clientes', `Del ${fmtReportDate(start)} al ${fmtReportDate(end)}`);
    const byClient = {};
    bookings.forEach(b => {
        const email = b.personalInfo?.email || 'desconocido';
        const name  = b.personalInfo?.fullName || email;
        const phone = b.personalInfo?.phone || '—';
        if (!byClient[email]) byClient[email] = { name, email, phone, count: 0, confirmed: 0, revenue: 0, lastDate: null, dests: new Set() };
        byClient[email].count++;
        byClient[email].dests.add(b.destination?.name);
        const d = new Date(b.createdAt || b.timestamp);
        if (!byClient[email].lastDate || d > byClient[email].lastDate) byClient[email].lastDate = d;
        if (b.status !== 'cancelled') { byClient[email].confirmed++; byClient[email].revenue += b.pricing?.total || 0; }
    });
    const sorted = Object.values(byClient).sort((a, b) => b.revenue - a.revenue);
    const totalRevenue = sorted.reduce((s, c) => s + c.revenue, 0);
    const repeatClients = sorted.filter(c => c.count > 1).length;
    renderReportKpis([{ value: sorted.length, label: 'Clientes Únicos', color: '#8b5cf6' }, { value: repeatClients, label: 'Clientes Repetidos', color: '#3b82f6' }, { value: `$${fmtMoney(totalRevenue)}`, label: 'Ingresos Totales', color: '#10b981' }, { value: `$${fmtMoney(totalRevenue / (sorted.length || 1))}`, label: 'LTV Promedio', color: '#f59e0b' }]);
    const headers = ['Cliente','Email','Teléfono','Reservas','Confirmadas','Destinos','Ingresos COP','Última Reserva'];
    const rows = sorted.map(c => [c.name, c.email, c.phone, c.count, c.confirmed, c.dests.size, fmtMoney(c.revenue), c.lastDate ? fmtReportDate(c.lastDate) : '—']);
    reportsState.headers = headers; reportsState.rows = rows;
    renderReportTable(headers, rows); setTableFooter(`${sorted.length} clientes · ${repeatClients} recurrentes · Total: $${fmtMoney(totalRevenue)} COP`);
}

function setReportTitle(title, subtitle) { const t = document.getElementById('reportPreviewTitle'); const s = document.getElementById('reportPreviewSubtitle'); if (t) t.innerHTML = title; if (s) s.textContent = subtitle; }
function renderReportKpis(kpis) { const c = document.getElementById('reportKpis'); if (!c) return; c.innerHTML = kpis.map(k => `<div class="report-kpi-mini"><div class="rk-value" style="color:${k.color};">${k.value}</div><div class="rk-label">${k.label}</div></div>`).join(''); }
function renderReportTable(headers, rows) {
    const thead = document.getElementById('reportPreviewHead'); const tbody = document.getElementById('reportPreviewBody');
    if (!thead || !tbody) return;
    thead.innerHTML = `<tr>${headers.map(h => `<th>${h}</th>`).join('')}</tr>`;
    if (rows.length === 0) { tbody.innerHTML = `<tr><td colspan="${headers.length}" style="text-align:center;padding:32px;color:#9ca3af;"><i class="fas fa-inbox" style="font-size:32px;display:block;margin-bottom:12px;opacity:.3;"></i>Sin datos en el período</td></tr>`; return; }
    tbody.innerHTML = rows.map(row => `<tr>${row.map((cell, ci) => `<td style="${typeof cell === 'number' && ci > 0 ? 'text-align:right;' : ''}">${cell ?? '—'}</td>`).join('')}</tr>`).join('');
}
function setTableFooter(text) { const el = document.getElementById('reportTableFooter'); if (el) el.textContent = text; }

function exportReportCSV() {
    const { headers, rows } = reportsState; if (!headers.length) { alert('Genera un reporte primero.'); return; }
    const escape = v => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const csv = [headers.map(escape).join(','), ...rows.map(row => row.map(escape).join(','))].join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a'); link.href = URL.createObjectURL(blob); link.download = `reporte-${reportsState.type}-${new Date().toISOString().split('T')[0]}.csv`; link.click();
    showSuccessToast('✅ CSV exportado correctamente');
}

function exportReportPDF() {
    const { headers, rows } = reportsState; if (!headers.length) { alert('Genera un reporte primero.'); return; }
    const title    = document.getElementById('reportPreviewTitle')?.innerText || 'Reporte';
    const subtitle = document.getElementById('reportPreviewSubtitle')?.textContent || '';
    const tableHTML = `<table style="width:100%;border-collapse:collapse;font-size:11px;"><thead><tr style="background:#195C33;color:white;">${headers.map(h => `<th style="padding:8px 10px;text-align:left;font-weight:600;">${h}</th>`).join('')}</tr></thead><tbody>${rows.map((row, i) => `<tr style="background:${i % 2 === 0 ? '#fff' : '#f9fafb'};border-bottom:1px solid #e5e7eb;">${row.map(cell => `<td style="padding:7px 10px;">${cell ?? '—'}</td>`).join('')}</tr>`).join('')}</tbody></table>`;
    const win = window.open('', '_blank');
    win.document.write(`<!DOCTYPE html><html><head><meta charset="UTF-8"><title>${title}</title><style>body{font-family:Arial,sans-serif;margin:32px;color:#111;}h1{font-size:20px;color:#195C33;margin-bottom:4px;}p{font-size:12px;color:#6b7280;margin:0 0 20px;}.meta{font-size:11px;color:#9ca3af;margin-top:24px;border-top:1px solid #e5e7eb;padding-top:8px;}@media print{body{margin:16px;}}</style></head><body><h1>${title}</h1><p>${subtitle}</p>${tableHTML}<div class="meta">Generado por Gigante Viajero Admin · ${fmtReportDateTime(new Date())}</div><script>setTimeout(()=>{window.print();window.close();},400);<\/script></body></html>`);
    win.document.close();
}

function printReport() { exportReportPDF(); }
function fmtReportDate(d) { if (!d || isNaN(new Date(d))) return '—'; return new Date(d).toLocaleDateString('es-CO', { day: '2-digit', month: '2-digit', year: 'numeric' }); }
function fmtReportDateTime(d) { return new Date(d).toLocaleString('es-CO', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }); }
function fmtMoney(n) { return new Intl.NumberFormat('es-CO').format(Math.round(n || 0)); }
function statusLabel(s) { return { pending: 'Pendiente', confirmed: 'Confirmada', 'in-progress': 'En Curso', completed: 'Completada', cancelled: 'Cancelada' }[s] || s || '—'; }

// ================================================================
// MÓDULO CONFIGURACIÓN
// ================================================================

const SETTINGS_KEY = 'gv-admin-settings';

const defaultSettings = {
    serviceFeePercentage: 5,
    taxPercentage: 19,
    notificationEmail: 'info@giganteviajero.com',
    autoConfirmEmail: true,
    freeCancelHours: 48,
    partialRefundPercent: 50,
    partialRefundHours: 24,
    businessName: 'Gigante Viajero',
    businessPhone: '',
    businessAddress: '',
    businessLogo: '',
    businessInstagram: '',
    businessFacebook: '',
    businessWhatsapp: '',
    nequiNumber: '',
    nequiName: ''
};

function loadSettings() {
    try { const saved = localStorage.getItem(SETTINGS_KEY); return saved ? { ...defaultSettings, ...JSON.parse(saved) } : { ...defaultSettings }; }
    catch { return { ...defaultSettings }; }
}

async function loadSettingsFromBackend() {
    try {
        const res = await fetch(`${API_URL}/settings`, { headers: authHeaders() });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const result = await res.json();
        if (result.ok && result.data) {
            const merged = { ...defaultSettings, ...result.data };
            localStorage.setItem(SETTINGS_KEY, JSON.stringify(merged));
            return merged;
        }
    } catch (err) { console.warn('⚠️ No se pudo cargar settings desde backend:', err.message); }
    return loadSettings();
}

async function saveSettings(newSettings) {
    const current = loadSettings();
    const merged  = { ...current, ...newSettings };
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(merged));

    try {
        const res = await fetch(`${API_URL}/settings`, {
            method: 'PUT',
            headers: authHeaders(),
            body: JSON.stringify(newSettings)
        });

        if (!res.ok) {
            const errBody = await res.json().catch(() => ({}));
            console.error(`❌ PUT /settings: ${errBody.message || `HTTP ${res.status}`}`);
            return null;
        }

        const result = await res.json();
        if (result.ok && result.data) {
            const serverMerged = { ...defaultSettings, ...result.data };
            localStorage.setItem(SETTINGS_KEY, JSON.stringify(serverMerged));
            sessionStorage.removeItem('gv-biz-info');
            localStorage.setItem('gv-biz-updated', Date.now().toString());
            return serverMerged;
        }

        return null;
    } catch (e) {
        console.error('❌ Error de red guardando ajustes:', e.message);
        return null;
    }
}

function _setVal(id, val) { const el = document.getElementById(id); if (el) el.value = val ?? ''; }
function _setChk(id, val) { const el = document.getElementById(id); if (el) el.checked = !!val; }

function populateSettingsForm() {
    const s = loadSettings();
    _setVal('serviceFeePercentage', s.serviceFeePercentage);
    _setVal('taxPercentage',        s.taxPercentage);
    _setVal('notificationEmail',    s.notificationEmail);
    _setChk('autoConfirmEmail',     s.autoConfirmEmail);
    _setVal('freeCancelHours',      s.freeCancelHours);
    _setVal('partialRefundPercent', s.partialRefundPercent);
    _setVal('partialRefundHours',   s.partialRefundHours);
    _setVal('businessName',         s.businessName);
    _setVal('businessPhone',        s.businessPhone);
    _setVal('businessAddress',      s.businessAddress);
    _setVal('businessLogo',         s.businessLogo);
    _setVal('businessInstagram',    s.businessInstagram);
    _setVal('businessFacebook',     s.businessFacebook);
    _setVal('businessWhatsapp',     s.businessWhatsapp);
    updateLogoPreview(s.businessLogo);
    updatePricePreview();
    updateCancelPreview();
}

function updateLogoPreview(url) {
    const preview = document.getElementById('logoPreview'); if (!preview) return;
    preview.innerHTML = url
        ? `<img src="${url}" alt="Logo" style="max-height:80px;max-width:200px;object-fit:contain;border-radius:8px;" onerror="this.parentElement.innerHTML='<span style=color:#ef4444;font-size:12px;>URL inválida</span>'">`
        : `<div style="color:#9ca3af;font-size:13px;"><i class="fas fa-image" style="font-size:28px;display:block;margin-bottom:6px;opacity:.3;"></i>Sin logo</div>`;
}

function updatePricePreview() {
    const detail = document.getElementById('pricePreviewDetail'); if (!detail) return;
    const fee = parseFloat(document.getElementById('serviceFeePercentage')?.value) || 0;
    const tax = parseFloat(document.getElementById('taxPercentage')?.value) || 0;
    const base = 100000; const feeAmt = base * fee / 100; const taxAmt = (base + feeAmt) * tax / 100; const total = base + feeAmt + taxAmt;
    detail.innerHTML = `Base: <strong>$${new Intl.NumberFormat('es-CO').format(base)}</strong> + Tarifa ${fee}%: <strong>$${new Intl.NumberFormat('es-CO').format(feeAmt)}</strong> + IVA ${tax}%: <strong>$${new Intl.NumberFormat('es-CO').format(taxAmt)}</strong> = <strong style="color:#195C33;">$${new Intl.NumberFormat('es-CO').format(total)}</strong>`;
}

function updateCancelPreview() {
    const el = document.getElementById('cancelPreviewText'); if (!el) return;
    const free = document.getElementById('freeCancelHours')?.value || 48;
    const pct  = document.getElementById('partialRefundPercent')?.value || 50;
    const part = document.getElementById('partialRefundHours')?.value || 24;
    el.textContent = `Gratis si cancela ${free}h antes · ${pct}% de reembolso si cancela ${part}h antes · Sin reembolso después de eso`;
}

function updateNequiQrPreview() {
    const num = (document.getElementById('nequiNumber')?.value || '').trim();
    const box = document.getElementById('nequiQrPreviewImg');
    if (!box) return;
    if (!num || num.length < 7) {
        box.innerHTML = `
            <div style="width:110px;height:110px;background:#ede9fe;border-radius:10px;display:flex;align-items:center;justify-content:center;">
                <i class="fas fa-qrcode" style="font-size:40px;color:#c4b5fd;"></i>
            </div>
            <p style="font-size:10px;color:#9ca3af;margin:6px 0 0;">Escribe el número para ver la vista previa</p>`;
        return;
    }
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=${encodeURIComponent('nequi:' + num)}&color=5b21b6&bgcolor=f5f3ff&margin=6`;
    box.innerHTML = `
        <img src="${qrUrl}" alt="QR Nequi" style="width:110px;height:110px;border-radius:10px;border:2px solid #c4b5fd;display:block;"
             onerror="this.parentElement.innerHTML='<span style=color:#ef4444;font-size:11px;>Error generando QR</span>'">
        <p style="font-size:11px;color:#7c3aed;margin:6px 0 0;font-weight:600;">${num}</p>`;
}

async function saveSettingsSection(fields, btnId) {
    const btn = document.getElementById(btnId); const orig = btn ? btn.innerHTML : '';
    if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Guardando...'; }
    const data = {};
    fields.forEach(f => {
        const el = document.getElementById(f); if (!el) return;
        data[f] = el.type === 'checkbox' ? el.checked : el.type === 'number' ? (parseFloat(el.value) || 0) : el.value.trim();
    });
    const result = await saveSettings(data);
    if (btn) {
        btn.disabled = false;
        if (result) {
            btn.innerHTML = '<i class="fas fa-check"></i> Guardado en servidor ✓';
            btn.style.background = 'linear-gradient(135deg,#10b981,#059669)';
            showSuccessToast('✅ Guardado en servidor correctamente');
        } else {
            btn.innerHTML = '<i class="fas fa-exclamation-triangle"></i> Error al guardar';
            btn.style.background = 'linear-gradient(135deg,#ef4444,#dc2626)';
            setTimeout(() => {
                alert('❌ No se pudo guardar en el servidor.\n\nPosibles causas:\n• Token expirado (cierra sesión y vuelve a entrar)\n• El servidor no está corriendo\n• Error de CORS\n\nRevisa la consola (F12) para ver el error exacto.');
            }, 100);
        }
        setTimeout(() => { if (btn) { btn.innerHTML = orig; btn.style.background = ''; } }, 4000);
    }
}

async function loadSettingsSection() {
    renderSettingsHTML();
    attachSettingsListeners();
    const loadingToast = document.createElement('div');
    loadingToast.id = 'settingsLoadingToast';
    loadingToast.style.cssText = 'position:fixed;bottom:80px;right:20px;background:#195C33;color:white;padding:12px 20px;border-radius:10px;font-size:13px;font-weight:600;z-index:9999;display:flex;align-items:center;gap:10px;box-shadow:0 4px 12px rgba(0,0,0,.2);';
    loadingToast.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Cargando configuración...';
    document.body.appendChild(loadingToast);
    await loadSettingsFromBackend();
    loadingToast.remove();
    populateSettingsForm();
}

let _settingsListenersReady = false;
function attachSettingsListeners() {
    if (_settingsListenersReady) return;
    _settingsListenersReady = true;
    const on = (id, fn) => { const el = document.getElementById(id); if (el) el.onclick = fn; };
    on('btnSavePrices',   () => saveSettingsSection(['serviceFeePercentage','taxPercentage'], 'btnSavePrices'));
    on('btnSaveEmail',    () => saveSettingsSection(['notificationEmail','autoConfirmEmail'], 'btnSaveEmail'));
    on('btnSaveCancel',   () => saveSettingsSection(['freeCancelHours','partialRefundPercent','partialRefundHours'], 'btnSaveCancel'));
    on('btnSaveBusiness', () => saveSettingsSection(['businessName','businessPhone','businessAddress','businessLogo','businessInstagram','businessFacebook','businessWhatsapp'], 'btnSaveBusiness'));
    on('btnResetSettings', () => {
        if (!confirm('¿Restaurar TODOS los ajustes a los valores por defecto?')) return;
        localStorage.removeItem(SETTINGS_KEY);
        populateSettingsForm();
        showSuccessToast('✅ Ajustes restaurados a valores por defecto');
    });
    ['serviceFeePercentage','taxPercentage'].forEach(id => { const el = document.getElementById(id); if (el) el.oninput = updatePricePreview; });
    ['freeCancelHours','partialRefundPercent','partialRefundHours'].forEach(id => { const el = document.getElementById(id); if (el) el.oninput = updateCancelPreview; });
    const logoInput  = document.getElementById('businessLogo');
    if (logoInput)  logoInput.oninput  = () => updateLogoPreview(logoInput.value.trim());
}

function renderSettingsHTML() {
    const section = document.getElementById('settings-section');
    if (!section || section.dataset.rendered) return;
    section.dataset.rendered = 'true';
    section.innerHTML = `
    <div class="section-header" style="margin-bottom:28px;">
        <div>
            <h2 style="margin:0;"><i class="fas fa-cog"></i> Configuración del Sistema</h2>
            <p style="margin:4px 0 0;color:#6b7280;font-size:13px;">Los cambios se guardan en el navegador y se sincronizan con el servidor.</p>
        </div>
        <button class="btn-secondary" id="btnResetSettings" style="color:#ef4444;border-color:#fca5a5;display:flex;align-items:center;gap:8px;">
            <i class="fas fa-undo"></i> Restaurar Defaults
        </button>
    </div>

    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(320px,1fr));gap:20px;">

        <!-- ── PRECIOS ─────────────────────────────────────── -->
        <div class="chart-card" style="border-top:4px solid #10b981;">
            <div style="display:flex;align-items:center;gap:12px;margin-bottom:20px;">
                <div style="width:44px;height:44px;background:linear-gradient(135deg,#10b981,#059669);border-radius:12px;display:flex;align-items:center;justify-content:center;color:white;font-size:20px;flex-shrink:0;"><i class="fas fa-dollar-sign"></i></div>
                <div><h3 style="margin:0;font-size:16px;font-weight:700;color:#111827;">Precios y Tarifas</h3><p style="margin:2px 0 0;font-size:12px;color:#6b7280;">Se aplican al calcular el total de cada reserva</p></div>
            </div>
            <div style="margin-bottom:16px;">
                <label style="display:block;font-size:13px;font-weight:600;color:#374151;margin-bottom:6px;">Tarifa de Servicio <span style="color:#10b981;">(%)</span></label>
                <div style="position:relative;"><input type="number" id="serviceFeePercentage" min="0" max="100" step="0.1" style="width:100%;padding:10px 40px 10px 14px;border:2px solid #e5e7eb;border-radius:8px;font-size:14px;box-sizing:border-box;" onfocus="this.style.borderColor='#195C33'" onblur="this.style.borderColor='#e5e7eb'" oninput="updatePricePreview()"><span style="position:absolute;right:12px;top:50%;transform:translateY(-50%);color:#6b7280;font-weight:700;pointer-events:none;">%</span></div>
            </div>
            <div style="margin-bottom:16px;">
                <label style="display:block;font-size:13px;font-weight:600;color:#374151;margin-bottom:6px;">Impuesto IVA <span style="color:#10b981;">(%)</span></label>
                <div style="position:relative;"><input type="number" id="taxPercentage" min="0" max="100" step="0.1" style="width:100%;padding:10px 40px 10px 14px;border:2px solid #e5e7eb;border-radius:8px;font-size:14px;box-sizing:border-box;" onfocus="this.style.borderColor='#195C33'" onblur="this.style.borderColor='#e5e7eb'" oninput="updatePricePreview()"><span style="position:absolute;right:12px;top:50%;transform:translateY(-50%);color:#6b7280;font-weight:700;pointer-events:none;">%</span></div>
            </div>
            <div style="background:#f0fdf4;border-radius:8px;padding:12px;margin-bottom:16px;font-size:12px;color:#166534;">
                <strong><i class="fas fa-calculator"></i> Ejemplo con base $100.000:</strong>
                <div id="pricePreviewDetail" style="margin-top:6px;line-height:1.6;"></div>
            </div>
            <button class="btn-primary" id="btnSavePrices" style="width:100%;"><i class="fas fa-save"></i> Guardar Tarifas</button>
        </div>

        <!-- ── EMAIL ──────────────────────────────────────── -->
        <div class="chart-card" style="border-top:4px solid #3b82f6;">
            <div style="display:flex;align-items:center;gap:12px;margin-bottom:20px;">
                <div style="width:44px;height:44px;background:linear-gradient(135deg,#3b82f6,#2563eb);border-radius:12px;display:flex;align-items:center;justify-content:center;color:white;font-size:20px;flex-shrink:0;"><i class="fas fa-envelope"></i></div>
                <div><h3 style="margin:0;font-size:16px;font-weight:700;color:#111827;">Notificaciones Email</h3><p style="margin:2px 0 0;font-size:12px;color:#6b7280;">Configuración de correos automáticos</p></div>
            </div>
            <div style="margin-bottom:16px;">
                <label style="display:block;font-size:13px;font-weight:600;color:#374151;margin-bottom:6px;">Email de Notificaciones</label>
                <input type="email" id="notificationEmail" placeholder="correo@ejemplo.com" style="width:100%;padding:10px 14px;border:2px solid #e5e7eb;border-radius:8px;font-size:14px;box-sizing:border-box;" onfocus="this.style.borderColor='#195C33'" onblur="this.style.borderColor='#e5e7eb'">
            </div>
            <div style="background:#f9fafb;border-radius:10px;padding:14px;margin-bottom:16px;">
                <label style="display:flex;align-items:flex-start;gap:12px;cursor:pointer;">
                    <input type="checkbox" id="autoConfirmEmail" style="width:18px;height:18px;accent-color:#195C33;cursor:pointer;margin-top:2px;flex-shrink:0;">
                    <div><div style="font-size:13px;font-weight:600;color:#111827;">Confirmación automática al cliente</div><div style="font-size:11px;color:#6b7280;margin-top:2px;">Envía un email de confirmación inmediatamente al crear la reserva</div></div>
                </label>
            </div>
            <button class="btn-primary" id="btnSaveEmail" style="width:100%;background:linear-gradient(135deg,#3b82f6,#2563eb);"><i class="fas fa-save"></i> Guardar Notificaciones</button>
        </div>

        <!-- ── CANCELACIÓN ────────────────────────────────── -->
        <div class="chart-card" style="border-top:4px solid #f59e0b;">
            <div style="display:flex;align-items:center;gap:12px;margin-bottom:20px;">
                <div style="width:44px;height:44px;background:linear-gradient(135deg,#f59e0b,#d97706);border-radius:12px;display:flex;align-items:center;justify-content:center;color:white;font-size:20px;flex-shrink:0;"><i class="fas fa-calendar-times"></i></div>
                <div><h3 style="margin:0;font-size:16px;font-weight:700;color:#111827;">Política de Cancelación</h3><p style="margin:2px 0 0;font-size:12px;color:#6b7280;">Reglas de reembolso para los clientes</p></div>
            </div>
            <div style="margin-bottom:16px;">
                <label style="display:block;font-size:13px;font-weight:600;color:#374151;margin-bottom:6px;">Cancelación gratuita — horas antes del check-in</label>
                <input type="number" id="freeCancelHours" min="0" style="width:100%;padding:10px 14px;border:2px solid #e5e7eb;border-radius:8px;font-size:14px;box-sizing:border-box;" onfocus="this.style.borderColor='#195C33'" onblur="this.style.borderColor='#e5e7eb'" oninput="updateCancelPreview()">
            </div>
            <div style="background:#f9fafb;border-radius:10px;padding:14px;margin-bottom:16px;">
                <p style="margin:0 0 10px;font-size:13px;font-weight:700;color:#374151;"><i class="fas fa-percentage" style="color:#f59e0b;"></i> Reembolso Parcial</p>
                <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
                    <div><label style="display:block;font-size:11px;font-weight:600;color:#6b7280;margin-bottom:4px;">% de reembolso</label><input type="number" id="partialRefundPercent" min="0" max="100" style="width:100%;padding:8px 10px;border:2px solid #e5e7eb;border-radius:6px;font-size:13px;box-sizing:border-box;" onfocus="this.style.borderColor='#195C33'" onblur="this.style.borderColor='#e5e7eb'" oninput="updateCancelPreview()"></div>
                    <div><label style="display:block;font-size:11px;font-weight:600;color:#6b7280;margin-bottom:4px;">Si cancela con X horas</label><input type="number" id="partialRefundHours" min="0" style="width:100%;padding:8px 10px;border:2px solid #e5e7eb;border-radius:6px;font-size:13px;box-sizing:border-box;" onfocus="this.style.borderColor='#195C33'" onblur="this.style.borderColor='#e5e7eb'" oninput="updateCancelPreview()"></div>
                </div>
            </div>
            <div style="background:#fffbeb;border-radius:8px;padding:12px;margin-bottom:16px;font-size:12px;color:#92400e;line-height:1.5;"><i class="fas fa-info-circle"></i> <span id="cancelPreviewText"></span></div>
            <button class="btn-primary" id="btnSaveCancel" style="width:100%;background:linear-gradient(135deg,#f59e0b,#d97706);"><i class="fas fa-save"></i> Guardar Política</button>
        </div>

        <!-- ── DATOS DEL NEGOCIO ──────────────────────────── -->
        <div class="chart-card" style="border-top:4px solid #8b5cf6;">
            <div style="display:flex;align-items:center;gap:12px;margin-bottom:20px;">
                <div style="width:44px;height:44px;background:linear-gradient(135deg,#8b5cf6,#7c3aed);border-radius:12px;display:flex;align-items:center;justify-content:center;color:white;font-size:20px;flex-shrink:0;"><i class="fas fa-building"></i></div>
                <div><h3 style="margin:0;font-size:16px;font-weight:700;color:#111827;">Datos del Negocio</h3><p style="margin:2px 0 0;font-size:12px;color:#6b7280;">Información pública y redes sociales</p></div>
            </div>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:12px;">
                <div><label style="display:block;font-size:12px;font-weight:600;color:#374151;margin-bottom:5px;"><i class="fas fa-store" style="color:#8b5cf6;"></i> Nombre</label><input type="text" id="businessName" placeholder="Gigante Viajero" style="width:100%;padding:9px 12px;border:2px solid #e5e7eb;border-radius:8px;font-size:13px;box-sizing:border-box;" onfocus="this.style.borderColor='#195C33'" onblur="this.style.borderColor='#e5e7eb'"></div>
                <div><label style="display:block;font-size:12px;font-weight:600;color:#374151;margin-bottom:5px;"><i class="fas fa-phone" style="color:#195C33;"></i> Teléfono</label><input type="tel" id="businessPhone" placeholder="3201234567" style="width:100%;padding:9px 12px;border:2px solid #e5e7eb;border-radius:8px;font-size:13px;box-sizing:border-box;" onfocus="this.style.borderColor='#195C33'" onblur="this.style.borderColor='#e5e7eb'"></div>
            </div>
            <div style="margin-bottom:12px;"><label style="display:block;font-size:12px;font-weight:600;color:#374151;margin-bottom:5px;"><i class="fab fa-whatsapp" style="color:#25d366;"></i> WhatsApp</label><input type="tel" id="businessWhatsapp" placeholder="573201234567" style="width:100%;padding:9px 12px;border:2px solid #e5e7eb;border-radius:8px;font-size:13px;box-sizing:border-box;" onfocus="this.style.borderColor='#195C33'" onblur="this.style.borderColor='#e5e7eb'"></div>
            <div style="margin-bottom:12px;"><label style="display:block;font-size:12px;font-weight:600;color:#374151;margin-bottom:5px;"><i class="fas fa-map-marker-alt" style="color:#ef4444;"></i> Dirección</label><input type="text" id="businessAddress" placeholder="Gigante, Huila, Colombia" style="width:100%;padding:9px 12px;border:2px solid #e5e7eb;border-radius:8px;font-size:13px;box-sizing:border-box;" onfocus="this.style.borderColor='#195C33'" onblur="this.style.borderColor='#e5e7eb'"></div>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:12px;">
                <div><label style="display:block;font-size:12px;font-weight:600;color:#374151;margin-bottom:5px;"><i class="fab fa-instagram" style="color:#e1306c;"></i> Instagram</label><input type="text" id="businessInstagram" placeholder="@giganteviajero" style="width:100%;padding:9px 12px;border:2px solid #e5e7eb;border-radius:8px;font-size:13px;box-sizing:border-box;" onfocus="this.style.borderColor='#195C33'" onblur="this.style.borderColor='#e5e7eb'"></div>
                <div><label style="display:block;font-size:12px;font-weight:600;color:#374151;margin-bottom:5px;"><i class="fab fa-facebook" style="color:#1877f2;"></i> Facebook</label><input type="text" id="businessFacebook" placeholder="giganteviajero" style="width:100%;padding:9px 12px;border:2px solid #e5e7eb;border-radius:8px;font-size:13px;box-sizing:border-box;" onfocus="this.style.borderColor='#195C33'" onblur="this.style.borderColor='#e5e7eb'"></div>
            </div>
            <div style="margin-bottom:12px;"><label style="display:block;font-size:12px;font-weight:600;color:#374151;margin-bottom:5px;"><i class="fas fa-image" style="color:#195C33;"></i> URL del Logo</label><input type="url" id="businessLogo" placeholder="https://..." style="width:100%;padding:9px 12px;border:2px solid #e5e7eb;border-radius:8px;font-size:13px;box-sizing:border-box;" onfocus="this.style.borderColor='#195C33'" onblur="this.style.borderColor='#e5e7eb'"></div>
            <div id="logoPreview" style="text-align:center;padding:14px;background:#f9fafb;border-radius:8px;min-height:60px;display:flex;align-items:center;justify-content:center;margin-bottom:16px;"></div>
            <button class="btn-primary" id="btnSaveBusiness" style="width:100%;background:linear-gradient(135deg,#8b5cf6,#7c3aed);"><i class="fas fa-save"></i> Guardar Datos del Negocio</button>
        </div>

    </div>

    <!-- ── ESTADO DEL SISTEMA ─────────────────────────────── -->
    <div class="chart-card" style="margin-top:20px;border-top:4px solid #195C33;">
        <div style="display:flex;align-items:center;gap:12px;margin-bottom:20px;">
            <div style="width:44px;height:44px;background:linear-gradient(135deg,#195C33,#0d3d20);border-radius:12px;display:flex;align-items:center;justify-content:center;color:white;font-size:20px;"><i class="fas fa-server"></i></div>
            <div><h3 style="margin:0;font-size:16px;font-weight:700;color:#111827;">Estado del Sistema</h3><p style="margin:2px 0 0;font-size:12px;color:#6b7280;">Información de la sesión y conexión actual</p></div>
        </div>
        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:12px;" id="systemStatusGrid"></div>
    </div>`;

    renderSystemStatus();
}

function renderSystemStatus() {
    const grid = document.getElementById('systemStatusGrid'); if (!grid) return;
    const user     = JSON.parse(localStorage.getItem('techstore-user-data') || '{}');
    const token    = localStorage.getItem('techstore-auth-token');
  const loginTs = localStorage.getItem('techstore-login-time');
const loginTime = loginTs ? new Date(loginTs).toLocaleString('es-CO') : '—';
    const s = loadSettings();
    const items = [
        { icon: 'fa-user-shield', color: '#195C33', label: 'Admin activo',    value: user.fullName || user.email || '—' },
        { icon: 'fa-key',         color: '#3b82f6', label: 'Token de sesión', value: token ? '✅ Activo' : '❌ No encontrado' },
        { icon: 'fa-clock',       color: '#f59e0b', label: 'Último acceso',   value: loginTime },
        { icon: 'fa-server',      color: '#8b5cf6', label: 'API URL',         value: API_URL },
        { icon: 'fa-percentage',  color: '#10b981', label: 'Tarifa servicio', value: `${s.serviceFeePercentage}%` },
        { icon: 'fa-receipt',     color: '#ef4444', label: 'IVA configurado', value: `${s.taxPercentage}%` }
    ];
    grid.innerHTML = items.map(it => `
        <div style="background:#f9fafb;border-radius:10px;padding:14px;display:flex;align-items:center;gap:12px;">
            <div style="width:36px;height:36px;background:${it.color}22;border-radius:8px;display:flex;align-items:center;justify-content:center;flex-shrink:0;">
                <i class="fas ${it.icon}" style="color:${it.color};font-size:15px;"></i>
            </div>
            <div style="min-width:0;">
                <div style="font-size:10px;font-weight:600;color:#9ca3af;text-transform:uppercase;">${it.label}</div>
                <div style="font-size:13px;font-weight:700;color:#111827;margin-top:2px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;" title="${it.value}">${it.value}</div>
            </div>
        </div>`).join('');
}

console.log('✅ admin_dashboard.js cargado — bookingMode + accommodation + dateFrom/dateTo actualizados');