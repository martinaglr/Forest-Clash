// frontend/src/config.js

const config = {
    // Backend API URL
    apiUrl: process.env.REACT_APP_API_URL ||
        (process.env.NODE_ENV === 'production'
            ? 'https://forest-clash.onrender.com/api'
            : 'http://localhost:5000/api'),

    // Para debug
    isDevelopment: process.env.NODE_ENV !== 'production'
};

// Log para debug
console.log('🔧 Modo:', process.env.NODE_ENV);
console.log('🌐 API URL:', config.apiUrl);
console.log('🔍 REACT_APP_API_URL:', process.env.REACT_APP_API_URL);

export default config;
