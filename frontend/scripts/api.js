// =============================================
// CLIENTE API - TECHSTORE PRO
// Manejo centralizado de comunicación con el backend
// =============================================

console.log('🔌 Inicializando cliente API Gigante Viagero');

// =============================================
// CONFIGURACIÓN BASE
// =============================================

const BACKEND_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? 'http://localhost:5000'
    : 'https://backend-gigante.onrender.com';

const API_CONFIG = {
    baseURL: `${BACKEND_URL}/api`,
    timeout: 10000,
    headers: {
        'Content-Type': 'application/json'
    }
};

// =============================================
// CLASE DE ERROR PERSONALIZADA
// =============================================

class APIError extends Error {
    constructor(message, status, data = null) {
        super(message);
        this.name = 'APIError';
        this.status = status;
        this.data = data;
    }
}

// =============================================
// CLASE PRINCIPAL API CLIENT
// =============================================

class APIClient {
    constructor(baseURL = API_CONFIG.baseURL) {
        this.baseURL = baseURL;
        this.timeout = API_CONFIG.timeout;
        console.log('✅ APIClient inicializado:', baseURL);
    }

    /**
     * Obtener token JWT del localStorage
     */
    getToken() {
        return localStorage.getItem('techstore_token');
    }

    /**
     * Guardar token JWT en localStorage
     */
    setToken(token) {
        localStorage.setItem('techstore_token', token);
        console.log('🔑 Token guardado en localStorage');
    }

    /**
     * Eliminar token (logout)
     */
    removeToken() {
        localStorage.removeItem('techstore_token');
        localStorage.removeItem('techstore_user');
        console.log('🚪 Token eliminado - Sesión cerrada');
    }

    /**
     * Obtener headers con autenticación opcional
     */
    getHeaders(includeAuth = false) {
        const headers = { ...API_CONFIG.headers };
        
        if (includeAuth) {
            const token = this.getToken();
            if (token) {
                headers['Authorization'] = `Bearer ${token}`;
            }
        }
        
        return headers;
    }

    /**
     * Método genérico para hacer peticiones HTTP
     */
    async request(endpoint, options = {}) {
        const url = `${this.baseURL}${endpoint}`;
        const config = {
            ...options,
            headers: this.getHeaders(options.auth || false)
        };

        console.log(`📡 ${config.method || 'GET'} ${endpoint}`);

        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), this.timeout);

            const response = await fetch(url, {
                ...config,
                signal: controller.signal
            });

            clearTimeout(timeoutId);

            const data = await response.json();

            if (!response.ok) {
                throw new APIError(
                    data.message || 'Error en la petición',
                    response.status,
                    data
                );
            }

            console.log(`✅ Respuesta exitosa: ${endpoint}`);
            return data;

        } catch (error) {
            if (error.name === 'AbortError') {
                throw new APIError('Timeout: La petición tardó demasiado', 408);
            }
            
            console.error(`❌ Error en ${endpoint}:`, error);
            throw error;
        }
    }

    // =============================================
    // MÉTODOS HTTP ESPECÍFICOS
    // =============================================

    /**
     * GET request
     */
    async get(endpoint, params = {}, auth = false) {
        const queryString = new URLSearchParams(params).toString();
        const url = queryString ? `${endpoint}?${queryString}` : endpoint;
        
        return this.request(url, {
            method: 'GET',
            auth
        });
    }

    /**
     * POST request
     */
    async post(endpoint, data, auth = false) {
        return this.request(endpoint, {
            method: 'POST',
            body: JSON.stringify(data),
            auth
        });
    }

    /**
     * PUT request
     */
    async put(endpoint, data, auth = false) {
        return this.request(endpoint, {
            method: 'PUT',
            body: JSON.stringify(data),
            auth
        });
    }

    /**
     * DELETE request
     */
    async delete(endpoint, auth = false) {
        return this.request(endpoint, {
            method: 'DELETE',
            auth
        });
    }

    // =============================================
    // MÉTODOS ESPECÍFICOS DE PRODUCTOS
    // =============================================

    /**
     * Obtener todos los productos con filtros opcionales
     */
    async getProducts(filters = {}) {
        console.log('📦 Obteniendo productos con filtros:', filters);
        return this.get('/products', filters);
    }

    /**
     * Obtener un producto por ID
     */
    async getProduct(id) {
        console.log('📦 Obteniendo producto:', id);
        return this.get(`/products/${id}`);
    }

    /**
     * Crear un nuevo producto (requiere autenticación admin)
     */
    async createProduct(productData) {
        console.log('➕ Creando producto:', productData.name);
        return this.post('/products', productData, true);
    }

    /**
     * Actualizar un producto (requiere autenticación admin)
     */
    async updateProduct(id, productData) {
        console.log('✏️ Actualizando producto:', id);
        return this.put(`/products/${id}`, productData, true);
    }

    /**
     * Eliminar un producto (requiere autenticación admin)
     */
    async deleteProduct(id) {
        console.log('🗑️ Eliminando producto:', id);
        return this.delete(`/products/${id}`, true);
    }

    // =============================================
    // MÉTODOS DE AUTENTICACIÓN
    // =============================================

    /**
     * Login de usuario
     */
    async login(email, password) {
        console.log('🔐 Intentando login:', email);
        const response = await this.post('/auth/login', { email, password });
        
        if (response.token) {
            this.setToken(response.token);
            localStorage.setItem('techstore_user', JSON.stringify(response.user));
            console.log('✅ Login exitoso');
        }
        
        return response;
    }

    /**
     * Registro de usuario
     */
    async register(userData) {
        console.log('📝 Registrando usuario:', userData.email);
        const response = await this.post('/auth/register', userData);
        
        if (response.token) {
            this.setToken(response.token);
            localStorage.setItem('techstore_user', JSON.stringify(response.user));
            console.log('✅ Registro exitoso');
        }
        
        return response;
    }

    /**
     * Logout
     */
    logout() {
        this.removeToken();
        console.log('👋 Sesión cerrada');
    }

    /**
     * Verificar si el usuario está autenticado
     */
    isAuthenticated() {
        return !!this.getToken();
    }

    /**
     * Obtener usuario actual
     */
    getCurrentUser() {
        const userStr = localStorage.getItem('techstore_user');
        return userStr ? JSON.parse(userStr) : null;
    }
}

// =============================================
// CREAR INSTANCIA GLOBAL
// =============================================

const api = new APIClient();

// Hacer disponible globalmente
window.api = api;

console.log('✅ Cliente API listo para usar');
console.log('💡 Usa: api.getProducts(), api.login(), etc.');