/**
 * =====================================================
 *  photo-sync.js  v3 — Gigante Viajero
 *
 *  Guarda la foto en el backend (POST /api/users/photo)
 *  y usa localStorage solo como caché visual.
 *
 *  API pública (compatible con v2):
 *    photoSync.save(File | dataURL)  → Promise<bool>
 *    photoSync.delete()              → Promise<bool>
 *    photoSync.getPhoto()            → URL | null
 *    photoSync.apply()               → refresca header
 * =====================================================
 */

(function () {
    'use strict';

    // ── URL base del backend ──────────────────────────────────────────────────
    const API_BASE = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
        ? 'http://localhost:5000'
        : 'https://backend-gigante.onrender.com';

    // ── Leer token JWT del localStorage ──────────────────────────────────────
    // Tu authController devuelve { token, user } → el frontend lo guarda.
    // Ajusta el nombre de la clave si es diferente al tuyo.
    function getToken() {
        // Clave exacta usada en auth-api.js → AUTH_CONFIG.storage.tokenKey
        return localStorage.getItem('techstore-auth-token') || null;
    }

    // ── Clave de caché por usuario ────────────────────────────────────────────
    function photoKey(email) {
        if (!email) return null;
        return 'gigante_photo_' + email.toLowerCase().replace(/[^a-z0-9]/g, '_');
    }

    // ── Usuario activo ────────────────────────────────────────────────────────
    // Usa authAPI (global de auth-api.js) o lee techstore-user-data directamente
    function getUser() {
        try {
            if (typeof authAPI !== 'undefined' && authAPI.isAuthenticated()) {
                const u = authAPI.getUser();
                if (u && u.email) return u;
            }
        } catch (e) {}
        try {
            // Fallback: leer directo del localStorage con la clave de auth-api.js
            const raw = localStorage.getItem('techstore-user-data');
            if (raw) {
                const u = JSON.parse(raw);
                if (u && u.email) return u;
            }
        } catch (e) {}
        return null;
    }

    // ── Caché local ───────────────────────────────────────────────────────────
    function getCachedPhoto() {
        const user = getUser();
        if (!user) return null;
        const key = photoKey(user.email);
        return key ? localStorage.getItem(key) : null;
    }

    function setCachedPhoto(url) {
        const user = getUser();
        if (!user) return;
        const key = photoKey(user.email);
        if (!key) return;
        if (url) localStorage.setItem(key, url);
        else     localStorage.removeItem(key);
    }

    // ── Guardar foto → POST /api/users/photo ─────────────────────────────────
    async function savePhoto(fileOrDataURL) {
        const token = getToken();
        if (!token) {
            console.warn('[photo-sync] Sin token JWT. ¿Está el usuario logueado?');
            return false;
        }

        let file;
        if (typeof fileOrDataURL === 'string' && fileOrDataURL.startsWith('data:')) {
            file = dataURLtoFile(fileOrDataURL, 'profile.jpg');
        } else if (fileOrDataURL instanceof File || fileOrDataURL instanceof Blob) {
            file = fileOrDataURL;
        } else {
            console.error('[photo-sync] savePhoto() requiere un File o dataURL.');
            return false;
        }

        const formData = new FormData();
        formData.append('photo', file);

        try {
            const res  = await fetch(`${API_BASE}/api/users/photo`, {
                method:  'POST',
                headers: { 'Authorization': `Bearer ${token}` },
                body:    formData
            });
            const data = await res.json();

            if (!res.ok) {
                console.error('[photo-sync] Error del servidor:', data.message);
                return false;
            }

            // Actualizar caché y objeto gigante_user en localStorage
            setCachedPhoto(data.photoURL);
            _updateStoredUser(data.photoURL);
            applyPhoto(data.photoURL);
            return true;

        } catch (err) {
            console.error('[photo-sync] Error de red al subir foto:', err);
            return false;
        }
    }

    // ── Eliminar foto → DELETE /api/users/photo ───────────────────────────────
    async function deletePhoto() {
        const token = getToken();
        if (!token) {
            console.warn('[photo-sync] Sin token JWT.');
            return false;
        }

        try {
            const res  = await fetch(`${API_BASE}/api/users/photo`, {
                method:  'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();

            if (!res.ok) {
                console.error('[photo-sync] Error del servidor:', data.message);
                return false;
            }

            setCachedPhoto(null);
            _updateStoredUser(null);
            applyPhoto(null);
            return true;

        } catch (err) {
            console.error('[photo-sync] Error de red al eliminar foto:', err);
            return false;
        }
    }

    // ── Actualiza photoURL dentro de techstore-user-data en localStorage ──────
    function _updateStoredUser(photoURL) {
        try {
            const raw = localStorage.getItem('techstore-user-data');
            if (!raw) return;
            const u = JSON.parse(raw);
            u.photoURL = photoURL || null;
            u.avatar   = photoURL || null;
            localStorage.setItem('techstore-user-data', JSON.stringify(u));
            // Actualiza authAPI en memoria para que getUser() devuelva photoURL
            if (typeof authAPI !== 'undefined') {
                authAPI.saveUser(u);
            }
            console.log('[photo-sync] techstore-user-data actualizado con photoURL:', photoURL);
        } catch (e) {
            console.error('[photo-sync] Error actualizando user en localStorage:', e);
        }
    }

    // ── Aplicar foto al #user-initials del header ─────────────────────────────
    function applyPhoto(forceURL) {
        const el = document.getElementById('user-initials');
        if (!el) return;

        const user = getUser();
        if (!user) return;

        // Calcular iniciales
        let firstName = user.firstName || '';
        let lastName  = user.lastName  || '';
        if (!firstName && user.displayName) {
            const parts = user.displayName.split(' ');
            firstName = parts[0] || '';
            lastName  = parts.slice(1).join(' ') || '';
        }
        if (!firstName) firstName = user.email.split('@')[0];
        const initials = (firstName.charAt(0) + (lastName.charAt(0) || '')).toUpperCase();

        // Prioridad: forceURL > caché local > photoURL/avatar del objeto user
        const src = (forceURL !== undefined ? forceURL : null)
            || getCachedPhoto()
            || user.photoURL
            || user.avatar
            || null;

        if (src) {
            el.style.background = 'transparent';
            el.style.padding    = '0';
            el.style.overflow   = 'hidden';
            el.innerHTML = '<img src="' + src + '" alt="Foto de perfil" '
                + 'style="width:100%;height:100%;object-fit:cover;border-radius:50%;display:block;" '
                + 'onerror="window._psFallback && window._psFallback()">';
        } else {
            el.innerHTML        = initials;
            el.style.background = 'linear-gradient(135deg, #F4C400 0%, #FFE347 100%)';
            el.style.padding    = '';
            el.style.overflow   = '';
        }
    }

    // Fallback: si la imagen da error, limpia caché y muestra iniciales
    window._psFallback = function () {
        setCachedPhoto(null);
        applyPhoto(null);
    };

    // ── Helper: dataURL → File ────────────────────────────────────────────────
    function dataURLtoFile(dataURL, filename) {
        const [header, data] = dataURL.split(',');
        const mime   = header.match(/:(.*?);/)[1];
        const binary = atob(data);
        const array  = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) array[i] = binary.charCodeAt(i);
        return new File([array], filename, { type: mime });
    }

    // ── Detectar cambio de usuario ────────────────────────────────────────────
    function checkUserChange() {
        const user         = getUser();
        const currentEmail = user ? user.email.toLowerCase() : '';
        const prevEmail    = localStorage.getItem('_ps_active') || '';
        if (currentEmail !== prevEmail) {
            localStorage.setItem('_ps_active', currentEmail);
            applyPhoto();
        }
    }

    // ── Parchar updateHeader() del html anfitrión ─────────────────────────────
    function patchUpdateHeader() {
        if (typeof window.updateHeader === 'function' && !window.updateHeader._patched) {
            const orig = window.updateHeader.bind(window);
            window.updateHeader = function () {
                orig();
                setTimeout(applyPhoto, 60);
            };
            window.updateHeader._patched = true;
        }
    }

    // ── Escuchar cambios de localStorage (otras pestañas) ─────────────────────
    window.addEventListener('storage', function (e) {
        if (!e.key) return;
        if (e.key.startsWith('gigante_photo_')
            || e.key === 'techstore-user-data'
            || e.key === 'techstore-auth-token') {
            checkUserChange();
            applyPhoto();
        }
    });

    // ── Sincronizar foto desde backend si no hay caché local ─────────────────
    async function syncPhotoFromBackend() {
        const user = getUser();
        if (!user) return;

        // Si ya hay caché local, no hace falta consultar
        if (getCachedPhoto()) {
            applyPhoto();
            return;
        }

        // Si el objeto user ya trae photoURL (de authAPI), úsala directamente
        if (user.photoURL || user.avatar) {
            const url = user.photoURL || user.avatar;
            setCachedPhoto(url);
            applyPhoto(url);
            return;
        }

        // Como último recurso, consultar el backend
        const token = getToken();
        if (!token) return;
        try {
            const res  = await fetch(API_BASE + '/api/auth/profile?userId=' + (user.id || user._id), {
                headers: { Authorization: 'Bearer ' + token }
            });
            if (!res.ok) return;
            const data = await res.json();
            const url  = data.user?.photoURL || data.user?.avatar || null;
            if (url) {
                setCachedPhoto(url);
                _updateStoredUser(url);
                applyPhoto(url);
            }
        } catch (e) {}
    }

    // ── Init ──────────────────────────────────────────────────────────────────
    function init() {
        patchUpdateHeader();
        checkUserChange();
        setTimeout(() => {
            applyPhoto();
            syncPhotoFromBackend();
        }, 250);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    // ── API pública ───────────────────────────────────────────────────────────
    window.photoSync = {
        save:     savePhoto,      // photoSync.save(File | dataURL) → Promise<bool>
        delete:   deletePhoto,    // photoSync.delete()             → Promise<bool>
        getPhoto: getCachedPhoto, // photoSync.getPhoto()           → URL | null
        apply:    applyPhoto      // photoSync.apply()              → refresca header
    };

})();