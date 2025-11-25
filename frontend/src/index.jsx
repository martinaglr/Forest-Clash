// frontend/src/index.jsx
import 'bootstrap/dist/css/bootstrap.min.css';
import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import Game from './Game';
import config from './config';

function AppWrapper() {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        console.log('🔍 AppWrapper iniciando...');
        console.log('📍 URL:', window.location.href);

        const urlParams = new URLSearchParams(window.location.search);
        const tokenFromUrl = urlParams.get('token');

        if (tokenFromUrl) {
            console.log('🎯 Token detectado en URL!');
            localStorage.setItem('token', tokenFromUrl);
            console.log('💾 Token guardado');

            console.log('🔄 Limpiando URL y recargando...');
            window.history.replaceState({}, '', '/');
            window.location.reload();
            return;
        }

        const token = localStorage.getItem('token');

        if (!token) {
            console.log('❌ No hay token');
            setLoading(false);
            return;
        }

        console.log('🔑 Token encontrado, cargando perfil...');

        // ✅ Usar config.apiUrl
        fetch(`${config.apiUrl}/auth/profile`, {
            headers: { 'Authorization': `Bearer ${token}` }
        })
            .then(response => {
                console.log('📬 Respuesta:', response.status);
                if (response.ok) {
                    return response.json();
                } else {
                    localStorage.removeItem('token');
                    throw new Error('Token inválido');
                }
            })
            .then(userData => {
                console.log('✅ Usuario cargado:', userData.username);
                setUser(userData);
                setLoading(false);
            })
            .catch(err => {
                console.error('💥 Error:', err);
                localStorage.removeItem('token');
                setLoading(false);
            });
    }, []);

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

    return <Game user={user} setUser={setUser} />;
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<AppWrapper />);