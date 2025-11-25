// src/components/GeminiChat.jsx
import React, { useState, useRef, useEffect } from 'react';
import { Card, Form, Button, Spinner } from 'react-bootstrap';

export default function GeminiChat({ playerTrees, botTrees, playerHand, playerBoard, botBoard, isPlayerTurn }) {
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const [isOpen, setIsOpen] = useState(false);
    const messagesEndRef = useRef(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    // Crear contexto del juego para la IA
    const getGameContext = () => {
        return `
Contexto del juego actual:
- Tus árboles: ${playerTrees}/20
- Árboles del bot: ${botTrees}/20
- Cartas en tu mano: ${playerHand.length}
- Cartas en tu tablero: ${playerBoard.length}
- Cartas en tablero del bot: ${botBoard.length}
- Es tu turno: ${isPlayerTurn ? 'Sí' : 'No'}

Tipos de cartas en tu mano:
${playerHand.map(c => `- ${c.name || c.type}`).join('\n')}

Cartas en tu tablero:
${playerBoard.map(c => `- ${c.name || c.type}`).join('\n')}

Cartas en tablero del bot:
${botBoard.map(c => `- ${c.name || c.type}`).join('\n')}
    `.trim();
    };

    const sendMessage = async () => {
        if (!input.trim() || loading) return;

        const userMessage = input.trim();
        setInput('');

        // Agregar mensaje del usuario
        setMessages(prev => [...prev, { role: 'user', text: userMessage }]);
        setLoading(true);

        try {
            const API_KEY = process.env.REACT_APP_GEMINI_API_KEY || 'AIzaSyDI6CzLghY3FWAeOk2qvj66iY7Mq7VVH24';

            // Crear el prompt con contexto
            const prompt = `
Eres un guardabosques experto que ayuda a jugadores de "Forest Clash", un juego de cartas sobre prevención de incendios forestales.

${getGameContext()}

Reglas del juego:
1. Objetivo: Llegar a 20 puntos plantando árboles
2. Tipos de cartas:
   - Árbol (1-4 puntos): Suma puntos a tu tablero
   - Fogata: Quema 1 carta del tablero enemigo
   - Incendio Forestal: Elimina todo el tablero enemigo
   - Leñador: Roba un árbol del enemigo
   - Político: Bloquea al rival para plantar árboles
   - Contrato: Elimina un Político

Pregunta del jugador: ${userMessage}

Da un consejo estratégico CORTO (2-3 líneas máximo) y también incluye un dato educativo sobre prevención de incendios forestales.
Sé conciso, directo y útil.
`;

            // Llamar a la API usando fetch directamente con v1
            const response = await fetch(`https://generativelanguage.googleapis.com/v1/models/gemini-2.0-flash:generateContent?key=${API_KEY}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    contents: [{
                        parts: [{
                            text: prompt
                        }]
                    }]
                })
            });

            const data = await response.json();

            if (data.candidates && data.candidates[0]) {
                const text = data.candidates[0].content.parts[0].text;
                setMessages(prev => [...prev, { role: 'assistant', text }]);
            } else {
                throw new Error(data.error?.message || 'Error desconocido');
            }
        } catch (error) {
            console.error('Error completo al llamar a Gemini:', error);

            let errorMessage = '❌ Error al conectar con Gemini. ';
            if (error.message) {
                errorMessage += error.message;
            } else {
                errorMessage += 'Verifica tu API key.';
            }

            setMessages(prev => [...prev, {
                role: 'assistant',
                text: errorMessage
            }]);
        } finally {
            setLoading(false);
        }
    };

    const handleKeyPress = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    };

    // Sugerencias rápidas
    const quickSuggestions = [
        "¿Qué carta debería jugar?",
        "¿Cómo puedo ganar?",
        "Dame un consejo estratégico",
        "¿Qué hacer con el político?",
    ];

    return (
        <>
            {/* Botón flotante para abrir/cerrar */}
            <Button
                variant="success"
                className="position-fixed shadow-lg"
                style={{
                    bottom: '20px',
                    left: '20px',
                    borderRadius: '50%',
                    width: '60px',
                    height: '60px',
                    fontSize: '24px',
                    zIndex: 1000
                }}
                onClick={() => setIsOpen(!isOpen)}
            >
                {isOpen ? '✕' : '🤖'}
            </Button>

            {/* Chat flotante */}
            {isOpen && (
                <Card
                    className="position-fixed shadow-lg"
                    style={{
                        bottom: '90px',
                        left: '20px',
                        width: '350px',
                        maxHeight: '500px',
                        zIndex: 1000,
                        display: 'flex',
                        flexDirection: 'column'
                    }}
                >
                    <Card.Header className="bg-success text-white d-flex justify-content-between align-items-center">
                        <div>
                            <strong>🌲 Guardabosques IA</strong>
                            <br />
                            <small>Powered by Gemini</small>
                        </div>
                        <Button
                            variant="light"
                            size="sm"
                            onClick={() => setMessages([])}
                            title="Limpiar chat"
                        >
                            🗑️
                        </Button>
                    </Card.Header>

                    <Card.Body
                        className="overflow-auto flex-grow-1"
                        style={{ maxHeight: '300px', minHeight: '200px' }}
                    >
                        {messages.length === 0 ? (
                            <div className="text-center text-muted py-4">
                                <h5>👋 ¡Hola!</h5>
                                <p className="small">Soy tu guardabosques personal. Pregúntame sobre estrategia del juego o prevención de incendios.</p>

                                <div className="d-flex flex-column gap-2 mt-3">
                                    {quickSuggestions.map((suggestion, i) => (
                                        <Button
                                            key={i}
                                            variant="outline-success"
                                            size="sm"
                                            onClick={() => {
                                                setInput(suggestion);
                                                setTimeout(() => {
                                                    document.getElementById('gemini-send-btn')?.click();
                                                }, 100);
                                            }}
                                        >
                                            {suggestion}
                                        </Button>
                                    ))}
                                </div>
                            </div>
                        ) : (
                            <div>
                                {messages.map((msg, index) => (
                                    <div
                                        key={index}
                                        className={`mb-3 ${msg.role === 'user' ? 'text-end' : 'text-start'}`}
                                    >
                                        <div
                                            className={`d-inline-block p-2 rounded ${
                                                msg.role === 'user'
                                                    ? 'bg-primary text-white'
                                                    : 'bg-light text-dark border'
                                            }`}
                                            style={{ maxWidth: '85%' }}
                                        >
                                            <small className="d-block mb-1 opacity-75">
                                                {msg.role === 'user' ? '👤 Tú' : '🤖 Guardabosques'}
                                            </small>
                                            <div style={{ whiteSpace: 'pre-wrap' }}>{msg.text}</div>
                                        </div>
                                    </div>
                                ))}
                                {loading && (
                                    <div className="text-center">
                                        <Spinner animation="border" size="sm" variant="success" />
                                        <small className="d-block text-muted mt-1">Pensando...</small>
                                    </div>
                                )}
                                <div ref={messagesEndRef} />
                            </div>
                        )}
                    </Card.Body>

                    <Card.Footer className="p-2">
                        <Form.Group className="d-flex gap-2">
                            <Form.Control
                                type="text"
                                placeholder="Pregúntame algo..."
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                onKeyPress={handleKeyPress}
                                disabled={loading}
                            />
                            <Button
                                id="gemini-send-btn"
                                variant="success"
                                onClick={sendMessage}
                                disabled={loading || !input.trim()}
                            >
                                {loading ? <Spinner animation="border" size="sm" /> : '📤'}
                            </Button>
                        </Form.Group>
                        <small className="text-muted d-block mt-1 text-center">
                            Presiona Enter para enviar
                        </small>
                    </Card.Footer>
                </Card>
            )}
        </>
    );
}