// backend/index.js
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const session = require('express-session');
const passport = require('./passport');
const connectDB = require('./db');
const routes = require('./routes');

const app = express();
const PORT = process.env.PORT || 5000;

// ========== MIDDLEWARES - ORDEN IMPORTANTE ==========

// CORS PRIMERO - Debe estar antes de todo
app.use(cors({
    origin: 'http://localhost:3000',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

// Preflight
app.options('*', cors());

// Body parsing
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// SESIONES - IMPORTANTE para Passport
app.use(session({
    secret: process.env.SESSION_SECRET || 'super-secret-key-change-in-production',
    resave: false,
    saveUninitialized: true,  // Cambiar a true temporalmente para OAuth
    cookie: {
        secure: false,  // true en producción con HTTPS
        httpOnly: true,
        sameSite: 'lax',  // Importante para OAuth redirect
        maxAge: 24 * 60 * 60 * 1000
    }
}));

// Passport DESPUÉS de sesiones
app.use(passport.initialize());
app.use(passport.session());

// ========== CONECTAR A MONGODB ==========
connectDB();

// ========== RUTAS ==========
app.use('/api', routes);

// Test route
app.get('/', (req, res) => {
    res.json({
        message: '🌲 Forest Clash API funcionando correctamente',
        version: '1.0.0'
    });
});

// ========== MANEJO DE ERRORES ==========
app.use((err, req, res, next) => {
    console.error('❌ Error:', err.stack);
    res.status(500).json({
        error: 'Algo salió mal en el servidor',
        message: process.env.NODE_ENV === 'development' ? err.message : 'Error interno'
    });
});

// ========== INICIAR SERVIDOR ==========
app.listen(PORT, () => {
    console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`);
    console.log(`📡 API disponible en http://localhost:${PORT}/api`);
    console.log(`🔐 Google OAuth habilitado`);
});

module.exports = app;