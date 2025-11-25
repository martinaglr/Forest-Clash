// frontend/src/config.js

const config = {
    // Backend API URL
    apiUrl: process.env.NODE_ENV === 'production'
        ? 'https://forest-clash.vercel.app/api'  // ⬅️ Cambiar después del deploy a tu URL real
        : 'http://localhost:5000/api',

    // Para debug
    isDevelopment: process.env.NODE_ENV !== 'production'
};

// Log para debug (solo en desarrollo)
if (config.isDevelopment) {
    console.log('🔧 Modo:', process.env.NODE_ENV);
    console.log('🌐 API URL:', config.apiUrl);
}

export default config;