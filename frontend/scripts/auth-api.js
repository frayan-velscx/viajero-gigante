// =============================================
// AUTH API - CONEXIÓN CON BACKEND
// Gigante Viagero - Sistema de Autenticación
// ✨ VERSIÓN FINAL - Con Google Login → MongoDB
// =============================================

console.log('🔐 Inicializando auth-api.js FINAL');

const BACKEND_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? 'http://localhost:5000'
    : 'https://backend-gigante.onrender.com';

const AUTH_CONFIG = {
    baseURL: `${BACKEND_URL}/api/auth`,
    timeout: 10000,
    storage: {
        tokenKey: 'techstore-auth-token',
        userKey:  'techstore-user-data',
        loginTimeKey: 'techstore-login-time'
    }
};

class AuthAPI {

    constructor() {
        console.log('🔐 AuthAPI inicializada');
        this.baseURL = AUTH_CONFIG.baseURL;
        this.timeout = AUTH_CONFIG.timeout;
    }

    // =============================================
    // MÉTODO: REGISTRO DE USUARIO
    // =============================================

    async register(userData) {
        console.log('📝 Intentando registrar usuario:', userData.email);
        try {
            const response = await fetch(`${this.baseURL}/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(userData)
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.error || data.message || 'Error al registrar usuario');
            console.log('✅ Usuario registrado exitosamente:', data.user.email);
            this.syncUserToLocalStorage(data.user, true);
            this.saveAuthData(data.token, data.user);
            return { success: true, user: data.user, token: data.token, message: 'Usuario registrado exitosamente' };
        } catch (error) {
            console.error('❌ Error en register():', error);
            return { success: false, error: error.message || 'Error de conexión con el servidor' };
        }
    }

    // =============================================
    // MÉTODO: LOGIN CON EMAIL/PASSWORD
    // =============================================

    async login(email, password) {
        console.log('🔑 Intentando login:', email);
        try {
            const response = await fetch(`${this.baseURL}/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password })
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.error || data.message || 'Credenciales inválidas');
            console.log('✅ Login exitoso:', data.user.email);
            this.syncUserToLocalStorage(data.user, false);
            this.saveAuthData(data.token, data.user);
            return { success: true, user: data.user, token: data.token, message: 'Inicio de sesión exitoso' };
        } catch (error) {
            console.error('❌ Error en login():', error);
            return { success: false, error: error.message || 'Error de conexión con el servidor' };
        }
    }

    // =============================================
    // ✨ NUEVO: LOGIN CON GOOGLE → GUARDA EN MONGODB
    // =============================================

    /**
     * Envía el idToken de Firebase al backend para verificar
     * y crear/actualizar el usuario en MongoDB.
     * 
     * @param {string} idToken - Token de Firebase obtenido con getIdToken()
     * @returns {Object} { success, user, token, message } o { success: false, error }
     */
    async googleLogin(idToken) {
        console.log('🔥 Enviando token de Google al backend...');
        try {
            const response = await fetch(`${this.baseURL}/google`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ idToken })
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.error || 'Error al autenticar con Google');

            console.log('✅ Usuario de Google guardado en MongoDB:', data.user.email);

            // Guardar en localStorage con el token JWT del backend
            this.syncUserToLocalStorage(data.user, false);
            this.saveAuthData(data.token, data.user);

            return { success: true, user: data.user, token: data.token, message: data.message };
        } catch (error) {
            console.error('❌ Error en googleLogin():', error);
            return { success: false, error: error.message || 'Error de conexión con el servidor' };
        }
    }

    // =============================================
    // MÉTODO: OBTENER PERFIL DEL USUARIO
    // =============================================

    async getProfile() {
        console.log('👤 Obteniendo perfil del usuario');
        const token = this.getToken();
        if (!token) return { success: false, error: 'No autenticado' };
        const user = this.getUser();
        if (!user || !user.id) return { success: false, error: 'No hay datos de usuario' };
        try {
            const response = await fetch(`${this.baseURL}/profile?userId=${user.id}`, {
                method: 'GET',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }
            });
            const data = await response.json();
            if (!response.ok) {
                if (response.status === 401) this.logout();
                throw new Error(data.error || data.message || 'Error al obtener perfil');
            }
            console.log('✅ Perfil obtenido:', data.user.email);
            this.syncUserToLocalStorage(data.user, false);
            this.saveUser(data.user);
            return { success: true, user: data.user };
        } catch (error) {
            console.error('❌ Error en getProfile():', error);
            return { success: false, error: error.message || 'Error de conexión con el servidor' };
        }
    }

    // =============================================
    // MÉTODO: ACTUALIZAR PERFIL
    // =============================================

    async updateProfile(updateData) {
        console.log('📝 Actualizando perfil del usuario:', updateData);
        const token = this.getToken();
        if (!token) return { success: false, error: 'No autenticado' };
        const currentUser = this.getUser();
        if (!currentUser || !currentUser.id) return { success: false, error: 'No hay datos de usuario' };
        try {
            const response = await fetch(`${this.baseURL}/profile`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ userId: currentUser.id, ...updateData })
            });
            const data = await response.json();
            if (!response.ok) {
                if (response.status === 401) this.logout();
                throw new Error(data.error || data.message || 'Error al actualizar perfil');
            }
            console.log('✅ Perfil actualizado exitosamente:', data.user.email);
            const updatedUser = { ...currentUser, ...data.user };
            this.syncUserToLocalStorage(updatedUser, false);
            this.saveUser(updatedUser);
            window.dispatchEvent(new CustomEvent('userProfileUpdated', { detail: { user: updatedUser } }));
            return { success: true, user: updatedUser, message: 'Perfil actualizado exitosamente' };
        } catch (error) {
            console.error('❌ Error en updateProfile():', error);
            return { success: false, error: error.message || 'Error de conexión con el servidor' };
        }
    }

    // =============================================
    // MÉTODO: LOGOUT
    // =============================================

    logout() {
        console.log('🚪 Cerrando sesión...');
        localStorage.removeItem(AUTH_CONFIG.storage.tokenKey);
        localStorage.removeItem(AUTH_CONFIG.storage.userKey);
        localStorage.removeItem(AUTH_CONFIG.storage.loginTimeKey);
        console.log('✅ Sesión cerrada exitosamente');
        window.dispatchEvent(new CustomEvent('userLoggedOut'));
        return { success: true, message: 'Sesión cerrada exitosamente' };
    }

    // =============================================
    // SINCRONIZAR USUARIO EN LOCALSTORAGE
    // =============================================

    syncUserToLocalStorage(user, isNew = false) {
        console.log('🔄 Sincronizando usuario con localStorage:', user.email);
        try {
            let users = JSON.parse(localStorage.getItem('users') || '[]');
            const normalizedUser = {
                id:        user.id || user._id || ('user_' + Date.now()),
                fullName:  user.fullName || `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'Usuario',
                firstName: user.firstName || '',
                lastName:  user.lastName  || '',
                email:     user.email,
                phone:     user.phone || '',
                role:      user.role  || 'customer',
                authProvider: user.authProvider || 'local',
                photoURL:  user.photoURL || user.avatar || null,
                createdAt: user.createdAt || new Date().toISOString(),
                status:    user.isActive === false ? 'inactive' : 'active'
            };
            const existingIndex = users.findIndex(u => u.email === user.email);
            if (existingIndex >= 0) {
                users[existingIndex] = { ...users[existingIndex], ...normalizedUser, updatedAt: new Date().toISOString() };
                console.log('🔄 Usuario actualizado en localStorage');
            } else {
                users.push(normalizedUser);
                console.log('✅ Nuevo usuario agregado a localStorage');
            }
            localStorage.setItem('users', JSON.stringify(users));
            window.dispatchEvent(new StorageEvent('storage', {
                key: 'users', newValue: JSON.stringify(users),
                url: window.location.href, storageArea: localStorage
            }));
            window.dispatchEvent(new CustomEvent('userSynced', {
                detail: { user: normalizedUser, isNew: existingIndex < 0, isRegistration: isNew }
            }));
            if (isNew && existingIndex < 0) console.log('🎉 ¡Nuevo usuario! Dashboard debería mostrar notificación');
        } catch (error) {
            console.error('❌ Error sincronizando usuario:', error);
        }
    }

    async syncAllUsersFromBackend() {
        const token = this.getToken();
        if (!token) return [];
        try {
            const response = await fetch(`${BACKEND_URL}/api/users`, {
                headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }
            });
            if (!response.ok) throw new Error('Error al obtener usuarios');
            const backendUsers = await response.json();
            const normalizedUsers = backendUsers.map(u => ({
                id: u.id || u._id,
                fullName: u.fullName || `${u.firstName || ''} ${u.lastName || ''}`.trim(),
                firstName: u.firstName || '', lastName: u.lastName || '',
                email: u.email, phone: u.phone || '',
                role: u.role || 'customer', createdAt: u.createdAt, status: u.status || 'active'
            }));
            localStorage.setItem('users', JSON.stringify(normalizedUsers));
            return normalizedUsers;
        } catch (error) {
            console.error('❌ Error sincronizando usuarios:', error);
            return [];
        }
    }

    // =============================================
    // MÉTODOS AUXILIARES
    // =============================================

    saveAuthData(token, user) {
        try {
            localStorage.setItem(AUTH_CONFIG.storage.tokenKey,    token);
            localStorage.setItem(AUTH_CONFIG.storage.userKey,     JSON.stringify(user));
            localStorage.setItem(AUTH_CONFIG.storage.loginTimeKey, new Date().toISOString());
            window.dispatchEvent(new CustomEvent('userLoggedIn', { detail: { user } }));
        } catch (error) { console.error('❌ Error guardando datos:', error); }
    }

    saveUser(user) {
        try { localStorage.setItem(AUTH_CONFIG.storage.userKey, JSON.stringify(user)); }
        catch (error) { console.error('❌ Error guardando usuario:', error); }
    }

    getToken()  { return localStorage.getItem(AUTH_CONFIG.storage.tokenKey); }

    getUser() {
        try {
            const s = localStorage.getItem(AUTH_CONFIG.storage.userKey);
            return s ? JSON.parse(s) : null;
        } catch { return null; }
    }

    isAuthenticated() {
        return !!(this.getToken() && this.getUser());
    }

    async verifyToken() {
        if (!this.isAuthenticated()) return false;
        const result = await this.getProfile();
        if (!result.success) { this.logout(); return false; }
        return true;
    }

    getTimeSinceLogin() {
        const loginTime = localStorage.getItem(AUTH_CONFIG.storage.loginTimeKey);
        if (!loginTime) return null;
        return Math.floor((Date.now() - new Date(loginTime)) / 60000);
    }

    showNotification(message, type = 'info') {
        const colors = {
            success: 'linear-gradient(135deg,#10b981,#059669)',
            error:   'linear-gradient(135deg,#ef4444,#dc2626)',
            warning: 'linear-gradient(135deg,#f59e0b,#d97706)',
            info:    'linear-gradient(135deg,#3b82f6,#2563eb)'
        };
        const icons = { success: '✅', error: '❌', warning: '⚠️', info: 'ℹ️' };
        const toast = document.createElement('div');
        toast.style.cssText = `
            position:fixed;top:20px;right:20px;background:${colors[type]||colors.info};
            color:white;padding:16px 24px;border-radius:12px;
            box-shadow:0 10px 25px rgba(0,0,0,0.2);z-index:10000;
            font-weight:600;font-size:15px;display:flex;align-items:center;
            gap:10px;transform:translateX(400px);transition:transform 0.3s ease;
        `;
        toast.innerHTML = `<span style="font-size:20px">${icons[type]||'ℹ️'}</span> ${message}`;
        document.body.appendChild(toast);
        setTimeout(() => toast.style.transform = 'translateX(0)', 10);
        setTimeout(() => { toast.style.transform = 'translateX(400px)'; setTimeout(() => toast.remove(), 300); }, 3000);
    }
}

// =============================================
// INSTANCIA GLOBAL
// =============================================

const authAPI = new AuthAPI();
window.authAPI = authAPI;

// =============================================
// FUNCIONES DE TESTING
// =============================================

window.crearUsuarioPrueba = function() {
    const r = Math.floor(Math.random() * 10000);
    const testUser = {
        id: 'user_' + Date.now(), fullName: `Test User ${r}`,
        firstName: 'Test', lastName: `User ${r}`,
        email: `test${r}@example.com`, phone: `300${r}`,
        role: 'customer', createdAt: new Date().toISOString(), status: 'active'
    };
    authAPI.syncUserToLocalStorage(testUser, true);
    alert('✅ Usuario creado: ' + testUser.email + '\n🔔 Revisa el dashboard!');
    return testUser;
};

window.verUsuarios     = () => { const u = JSON.parse(localStorage.getItem('users')||'[]'); console.table(u); return u; };
window.limpiarUsuarios = () => { if(confirm('¿Eliminar todos?')){ localStorage.setItem('users','[]'); alert('✅ Eliminados'); } };

console.log('✅ auth-api.js cargado | authAPI.googleLogin(idToken) disponible');