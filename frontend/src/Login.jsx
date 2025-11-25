import React, { useState } from 'react';
import { Form, Button, Alert } from 'react-bootstrap';
import config from './config';
import './Login.css';

const Login = ({ onLoginSuccess }) => {
    const [isRegister, setIsRegister] = useState(false);
    const [formData, setFormData] = useState({
        username: '',
        email: '',
        password: ''
    });
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleChange = (e) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value
        });
        setError('');
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        const endpoint = isRegister ? 'register' : 'login';
        const body = isRegister
            ? formData
            : { email: formData.email, password: formData.password };

        try {
            const response = await fetch(`${config.apiUrl}/auth/${endpoint}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(body)
            });

            const data = await response.json();

            if (response.ok) {
                // ✅ Guardar el token
                localStorage.setItem('token', data.token);
                console.log('✅ Login exitoso:', data.user.username);

                // ✅ Llamar al callback con los datos del usuario
                if (onLoginSuccess) {
                    onLoginSuccess(data.user);
                }
            } else {
                setError(data.error || 'Error al autenticar');
            }
        } catch (err) {
            console.error('💥 Error:', err);
            setError('Error de conexión con el servidor');
        } finally {
            setLoading(false);
        }
    };

    const handleGoogleLogin = () => {
        console.log('🔄 Redirigiendo a Google OAuth...');

        // ✅ Usar siempre config.apiUrl (ya maneja dev y prod automáticamente)
        const googleAuthUrl = `${config.apiUrl}/auth/google`;

        console.log('🌍 URL de Google OAuth:', googleAuthUrl);
        console.log('🌍 API URL desde config:', config.apiUrl);

        window.location.href = googleAuthUrl;
    };

    return (
        <div className="login-card">
            <h2 className="text-center mb-4">
                {isRegister ? 'Crear Cuenta' : 'Iniciar Sesión'}
            </h2>

            {error && <Alert variant="danger">{error}</Alert>}

            <Form onSubmit={handleSubmit}>
                {isRegister && (
                    <Form.Group className="mb-3">
                        <Form.Control
                            type="text"
                            name="username"
                            placeholder="Usuario"
                            value={formData.username}
                            onChange={handleChange}
                            required
                            minLength={3}
                        />
                    </Form.Group>
                )}

                <Form.Group className="mb-3">
                    <Form.Control
                        type="email"
                        name="email"
                        placeholder="Email"
                        value={formData.email}
                        onChange={handleChange}
                        required
                    />
                </Form.Group>

                <Form.Group className="mb-3">
                    <Form.Control
                        type="password"
                        name="password"
                        placeholder="Contraseña"
                        value={formData.password}
                        onChange={handleChange}
                        required
                        minLength={6}
                    />
                </Form.Group>

                <Button
                    type="submit"
                    variant="success"
                    className="w-100 mb-3"
                    disabled={loading}
                >
                    {loading ? 'Cargando...' : (isRegister ? 'Registrarse' : 'Entrar')}
                </Button>
            </Form>

            <div className="text-center text-muted mb-3" style={{ position: 'relative' }}>
                <hr style={{ position: 'absolute', width: '100%', top: '50%', zIndex: 0 }} />
                <span style={{ background: 'white', padding: '0 10px', position: 'relative', zIndex: 1 }}>
                    O
                </span>
            </div>

            {/* BOTÓN DE GOOGLE SSO */}
            <Button
                variant="outline-dark"
                className="w-100 mb-3 d-flex align-items-center justify-content-center gap-2"
                onClick={handleGoogleLogin}
                disabled={loading}
            >
                <svg width="18" height="18" viewBox="0 0 18 18">
                    <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.615z"/>
                    <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.258c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332C2.438 15.983 5.482 18 9 18z"/>
                    <path fill="#FBBC05" d="M3.964 10.707c-.18-.54-.282-1.117-.282-1.707s.102-1.167.282-1.707V4.961H.957C.347 6.175 0 7.55 0 9s.348 2.825.957 4.039l3.007-2.332z"/>
                    <path fill="#EA4335" d="M9 3.582c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0 5.482 0 2.438 2.017.957 4.961L3.964 7.29C4.672 5.163 6.656 3.582 9 3.582z"/>
                </svg>
                Continuar con Google
            </Button>

            <div className="text-center">
                <Button
                    variant="link"
                    onClick={() => setIsRegister(!isRegister)}
                    style={{ textDecoration: 'none' }}
                >
                    {isRegister
                        ? '¿Ya tienes cuenta? Inicia sesión'
                        : '¿No tienes cuenta? Regístrate'}
                </Button>
            </div>
        </div>
    );
};

export default Login;