import React, { useEffect } from 'react';
import { Spinner } from 'react-bootstrap';

const AuthCallback = () => {
    useEffect(() => {
        console.log('🎯 AuthCallback ejecutándose');

        const urlParams = new URLSearchParams(window.location.search);
        const token = urlParams.get('token');
        const error = urlParams.get('error');

        if (error) {
            console.error('❌ Error:', error);
            alert(`Error de autenticación: ${error}`);
            window.location.href = '/';
            return;
        }

        if (token) {
            console.log('✅ Token recibido, guardando...');
            localStorage.setItem('token', token);
            console.log('💾 Token guardado, recargando aplicación...');

            // ✅ Forzar recarga completa para que App.jsx cargue el perfil
            setTimeout(() => {
                window.location.href = '/';
            }, 500);
        } else {
            console.error('❌ No hay token');
            window.location.href = '/';
        }
    }, []);

    return (
        <div style={{
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            height: '100vh',
            background: 'linear-gradient(135deg, #28a745 0%, #20c997 100%)'
        }}>
            <Spinner animation="border" variant="light" style={{ width: '50px', height: '50px' }} />
            <p style={{ color: 'white', marginTop: '20px', fontSize: '18px' }}>
                ✅ Iniciando sesión...
            </p>
        </div>
    );
};

export default AuthCallback;