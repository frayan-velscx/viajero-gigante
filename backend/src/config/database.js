// =============================================
// CONFIGURACIÓN DE BASE DE DATOS - MONGODB ATLAS
// =============================================

const mongoose = require('mongoose');

/**
 * Conectar a MongoDB Atlas
 * Esta función establece la conexión entre nuestra app y la base de datos
 */
const connectDB = async () => {
    try {
        const options = {
            maxPoolSize: 10,
            serverSelectionTimeoutMS: 5000,
            socketTimeoutMS: 45000,
            family: 4
        };

        const conn = await mongoose.connect(process.env.MONGODB_URI, options);
        console.log(`  ✅  MongoDB   ›  ${conn.connection.name}  [conectado]`);
        return conn;
        
    } catch (error) {
        console.error('❌ Error conectando a MongoDB Atlas:');
        
        // Diferentes tipos de errores comunes
        if (error.code === 'ETIMEDOUT') {
            console.error('⏱️  Error: Conexión tardó demasiado (timeout)');
            console.error('💡 Solución: Verificar conexión a internet');
        } else if (error.code === 'ENOTFOUND') {
            console.error('🔍 Error: Host no encontrado');
            console.error('💡 Solución: Verificar URL de MongoDB Atlas');
        } else if (error.name === 'MongoParseError') {
            console.error('📝 Error: Formato incorrecto en URL de MongoDB');
            console.error('💡 Solución: Revisar MONGODB_URI en .env');
        } else if (error.name === 'MongoNetworkError') {
            console.error('🌐 Error: Problema de red');
            console.error('💡 Solución: Verificar acceso a internet y IP whitelist');
        } else {
            console.error(`🐛 Error desconocido: ${error.message}`);
        }
        
        // En desarrollo, mostrar error completo
        if (process.env.NODE_ENV === 'development') {
            console.error('📋 Stack trace completo:');
            console.error(error.stack);
        }
        
        // Cerrar aplicación si no puede conectar
        process.exit(1);
    }
};

/**
 * Cerrar conexión elegantemente
 */
const closeDB = async () => {
    try {
        await mongoose.connection.close();
        console.log('🔌 Conexión a MongoDB cerrada correctamente');
    } catch (error) {
        console.error('❌ Error cerrando conexión:', error.message);
    }
};

// =============================================
// EVENTOS DE CONEXIÓN PARA MONITOREO
// =============================================

mongoose.connection.on('error',      (err) => console.error('  ❌  MongoDB   ›  Error:', err.message));
mongoose.connection.on('disconnected', ()  => console.log ('  ⚠️   MongoDB   ›  desconectado'));
mongoose.connection.on('reconnected',  ()  => console.log ('  ✅  MongoDB   ›  reconectado'));

process.on('SIGINT', async () => {
    console.log('\n  Cerrando servidor...');
    await closeDB();
    process.exit(0);
});

module.exports = {
    connectDB,
    closeDB
};