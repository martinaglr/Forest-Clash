// src/components/WeatherWidget.jsx
import React, { useState } from 'react';
import { Card, Form, Button, Spinner, Alert, Badge, Modal } from 'react-bootstrap';

export default function WeatherWidget({ show, onHide }) {
    const [city, setCity] = useState('');
    const [weatherData, setWeatherData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const API_KEY = process.env.REACT_APP_OPENWEATHER_API_KEY;

    // Calcular riesgo de incendio basado en temperatura y humedad
    const calculateFireRisk = (temp, humidity) => {
        // Temperatura en Celsius
        const tempC = temp - 273.15;

        if (tempC > 30 && humidity < 30) {
            return { level: 'Muy Alto', color: 'danger' };
        } else if (tempC > 25 && humidity < 40) {
            return { level: 'Alto', color: 'warning' };
        } else if (tempC > 20 && humidity < 50) {
            return { level: 'Medio', color: 'info' };
        } else {
            return { level: 'Bajo', color: 'success' };
        }
    };

    const fetchWeather = async () => {
        if (!city.trim()) {
            setError('Por favor ingresa una ciudad');
            return;
        }

        if (!API_KEY) {
            setError('API key no configurada. Agrega REACT_APP_OPENWEATHER_API_KEY al archivo .env');
            return;
        }

        setLoading(true);
        setError(null);

        try {
            // Llamar a la API de OpenWeather
            const response = await fetch(
                `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(city)}&appid=${API_KEY}&lang=es`
            );

            if (!response.ok) {
                if (response.status === 404) {
                    throw new Error('Ciudad no encontrada. Verifica el nombre.');
                } else if (response.status === 401) {
                    throw new Error('API key inválida o no activada. Espera 10 minutos después de crearla.');
                } else {
                    throw new Error('Error al obtener datos del clima');
                }
            }

            const data = await response.json();
            setWeatherData(data);
            setError(null);
        } catch (err) {
            console.error('Error fetching weather:', err);
            setError(err.message);
            setWeatherData(null);
        } finally {
            setLoading(false);
        }
    };

    const handleKeyPress = (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            fetchWeather();
        }
    };

    // Ciudades sugeridas
    const suggestedCities = ['Santiago', 'Valparaíso', 'Concepción', 'La Serena'];

    return (
        <Modal show={show} onHide={onHide} centered>
            <Modal.Header closeButton className="bg-info text-white">
                <Modal.Title>
                    <strong>🌦️ Clima y Riesgo de Incendios</strong>
                    <br />
                    <small>Powered by OpenWeather API</small>
                </Modal.Title>
            </Modal.Header>

            <Modal.Body>
                {/* Formulario de búsqueda */}
                <Form.Group className="mb-3">
                    <Form.Label className="fw-bold">Ingresa una ciudad:</Form.Label>
                    <div className="d-flex gap-2">
                        <Form.Control
                            type="text"
                            placeholder="Ej: Santiago"
                            value={city}
                            onChange={(e) => setCity(e.target.value)}
                            onKeyPress={handleKeyPress}
                            disabled={loading}
                        />
                        <Button
                            variant="info"
                            onClick={fetchWeather}
                            disabled={loading || !city.trim()}
                        >
                            {loading ? <Spinner animation="border" size="sm" /> : '🔍'}
                        </Button>
                    </div>
                    <Form.Text className="text-muted">
                        Presiona Enter para buscar
                    </Form.Text>
                </Form.Group>

                {/* Ciudades sugeridas */}
                <div className="mb-3">
                    <small className="text-muted d-block mb-2">Ciudades sugeridas:</small>
                    <div className="d-flex flex-wrap gap-2">
                        {suggestedCities.map((suggestedCity) => (
                            <Badge
                                key={suggestedCity}
                                bg="secondary"
                                style={{ cursor: 'pointer' }}
                                onClick={() => {
                                    setCity(suggestedCity);
                                    setTimeout(() => fetchWeather(), 100);
                                }}
                            >
                                {suggestedCity}
                            </Badge>
                        ))}
                    </div>
                </div>

                {/* Errores */}
                {error && (
                    <Alert variant="danger" className="mb-3">
                        <small>{error}</small>
                    </Alert>
                )}

                {/* Datos del clima */}
                {weatherData && (
                    <div className="border rounded p-3 bg-light">
                        <h5 className="mb-3">
                            📍 {weatherData.name}, {weatherData.sys.country}
                        </h5>

                        <div className="mb-2">
                            <strong>🌡️ Temperatura:</strong>{' '}
                            {(weatherData.main.temp - 273.15).toFixed(1)}°C
                            <br />
                            <small className="text-muted">
                                Sensación: {(weatherData.main.feels_like - 273.15).toFixed(1)}°C
                            </small>
                        </div>

                        <div className="mb-2">
                            <strong>💧 Humedad:</strong> {weatherData.main.humidity}%
                        </div>

                        <div className="mb-2">
                            <strong>🌤️ Condición:</strong>{' '}
                            {weatherData.weather[0].description.charAt(0).toUpperCase() +
                                weatherData.weather[0].description.slice(1)}
                        </div>

                        <div className="mb-2">
                            <strong>💨 Viento:</strong> {weatherData.wind.speed} m/s
                        </div>

                        <hr />

                        {/* Riesgo de incendio */}
                        <div className="text-center">
                            <strong className="d-block mb-2">🔥 Riesgo de Incendio:</strong>
                            <Badge
                                bg={calculateFireRisk(weatherData.main.temp, weatherData.main.humidity).color}
                                className="fs-6 p-2"
                            >
                                {calculateFireRisk(weatherData.main.temp, weatherData.main.humidity).level}
                            </Badge>
                        </div>

                        {/* Consejos según riesgo */}
                        {calculateFireRisk(weatherData.main.temp, weatherData.main.humidity).level !== 'Bajo' && (
                            <Alert variant="warning" className="mt-3 mb-0">
                                <small>
                                    <strong>⚠️ Precaución:</strong> Condiciones favorables para incendios.
                                    Evita hacer fogatas y reporta cualquier humo sospechoso.
                                </small>
                            </Alert>
                        )}
                    </div>
                )}

                {/* Mensaje inicial */}
                {!weatherData && !error && !loading && (
                    <div className="text-center text-muted py-3">
                        <p className="mb-0">
                            Ingresa una ciudad para consultar<br />
                            el clima y riesgo de incendios 🌲
                        </p>
                    </div>
                )}
            </Modal.Body>

            <Modal.Footer className="text-center justify-content-center">
                <small className="text-muted">
                    💡 El riesgo se calcula según temperatura y humedad
                </small>
            </Modal.Footer>
        </Modal>
    );
}