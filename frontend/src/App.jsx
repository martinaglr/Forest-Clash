import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Game from './Game';
import { Spinner } from 'react-bootstrap';
import 'bootstrap/dist/css/bootstrap.min.css';

function App() {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [isProcessingCallback, setIsProcessingCallback] = useState(false);

    useEffect(() => {
        console.log('🔍 App.jsx iniciando...');

        // ✅ PRIMERO: Verificar si estamos en el callback de Google
        const urlParams = new URLSearchParams(window.location.search);
        const tokenFromUrl = urlParams.get('token');

        if (tokenFromUrl) {
            console.log('🎯 Token detectado en URL, procesando callback...');
            setIsProcessingCallback(true);

            // Guardar token
            localStorage.setItem('token', tokenFromUrl);
            console.log('💾 Token guardado en localStorage');

            // Limpiar URL y recargar
            setTimeout(() => {
                console.log('🔄 Redirigiendo a inicio...');
                window.history.replaceState({}, document.title, '/');
                window.location.reload();
            }, 1000);
            return;
        }

        // ✅ SEGUNDO: Cargar perfil si hay token en localStorage
        const token = localStorage.getItem('token');

        if (!token) {
            console.log('❌ No hay token en localStorage');
            setLoading(false);
            return;
        }

        console.log('🔑 Token encontrado, cargando perfil...');

        fetch('http://localhost:5000/api/auth/profile', {
            headers: { 'Authorization': `Bearer ${token}` }
        })
            .then(response => {
                console.log('📬 Respuesta del servidor:', response.status);
                if (response.ok) {
                    return response.json();
                } else {
                    console.log('⚠️ Token inválido');
                    localStorage.removeItem('token');
                    throw new Error('Token inválido');
                }
            })
            .then(userData => {
                console.log('✅ Usuario cargado:', userData.username || userData.displayName);
                setUser(userData);
                setLoading(false);
            })
            .catch(err => {
                console.error('💥 Error al cargar perfil:', err);
                localStorage.removeItem('token');
                setUser(null);
                setLoading(false);
            });
    }, []);

    if (isProcessingCallback) {
        return (
            <div style={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                height: '100vh',
                background: 'linear-gradient(135deg, #28a745 0%, #20c997 100%)'
            }}>
                <div style={{ textAlign: 'center', color: 'white' }}>
                    <Spinner animation="border" variant="light" style={{ width: '60px', height: '60px' }} />
                    <p style={{ marginTop: '20px', fontSize: '20px' }}>✅ Completando inicio de sesión...</p>
                </div>
            </div>
        );
    }

    if (loading) {
        return (
            <div style={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                height: '100vh',
                background: 'linear-gradient(135deg, #28a745 0%, #20c997 100%)'
            }}>
                <div style={{ textAlign: 'center', color: 'white' }}>
                    <div style={{
                        width: '60px',
                        height: '60px',
                        border: '6px solid rgba(255,255,255,0.3)',
                        borderTopColor: 'white',
                        borderRadius: '50%',
                        margin: '0 auto',
                        animation: 'spin 1s linear infinite'
                    }}></div>
                    <p style={{ marginTop: '20px', fontSize: '20px' }}>🌲 Cargando...</p>
                </div>
                <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            </div>
        );
    }

    return (
        <Router>
            <Routes>
                <Route path="*" element={<Game user={user} setUser={setUser} />} />
            </Routes>
        </Router>
    );
}

export default App;