// backend/routes.js
const express = require('express');
const jwt = require('jsonwebtoken');
const passport = require('passport');
const { User, Game } = require('./models');

const router = express.Router();

// ========== MIDDLEWARE DE AUTENTICACIÓN ==========
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ error: 'Token no proporcionado' });
    }

    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
        if (err) return res.status(403).json({ error: 'Token inválido' });
        req.user = user;
        next();
    });
};

// ========== RUTAS DE AUTENTICACIÓN TRADICIONAL ==========

// REGISTRO
// REGISTRO
router.post('/auth/register', async (req, res) => {
    try {
        const { username, email, password } = req.body;

        console.log('📝 Intento de registro:', { username, email });

        if (!username || !email || !password) {
            return res.status(400).json({ error: 'Todos los campos son requeridos' });
        }

        // ✅ Verificar username por separado
        const existingUsername = await User.findOne({ username });
        if (existingUsername) {
            console.log('❌ Username ya existe:', username);
            return res.status(400).json({ error: 'El nombre de usuario ya está en uso' });
        }

        // ✅ Verificar email por separado
        const existingEmail = await User.findOne({ email });
        if (existingEmail) {
            console.log('❌ Email ya existe:', email);
            return res.status(400).json({ error: 'El email ya está registrado' });
        }

        console.log('✅ Creando nuevo usuario...');
        const user = new User({
            username,
            email,
            password
        });

        await user.save();
        console.log('✅ Usuario guardado exitosamente:', user.username);

        const token = jwt.sign(
            { id: user._id, username: user.username },
            process.env.JWT_SECRET,
            { expiresIn: '7d' }
        );

        res.status(201).json({
            message: 'Usuario creado exitosamente',
            token,
            user: {
                id: user._id,
                username: user.username,
                email: user.email,
                displayName: user.displayName,
                avatar: user.avatar,
                stats: user.stats
            }
        });
    } catch (error) {
        console.error('💥 Error completo en registro:', error);

        // Manejo de error de índice duplicado
        if (error.code === 11000) {
            const field = Object.keys(error.keyPattern)[0];
            return res.status(400).json({
                error: `El ${field === 'email' ? 'email' : 'usuario'} ya existe`
            });
        }

        res.status(500).json({ error: 'Error al crear usuario: ' + error.message });
    }
});

// LOGIN
router.post('/auth/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ error: 'Email y contraseña son requeridos' });
        }

        const user = await User.findOne({ email });
        if (!user) {
            return res.status(401).json({ error: 'Credenciales inválidas' });
        }

        // Verificar si es usuario de Google
        if (user.googleId && !user.password) {
            return res.status(401).json({
                error: 'Esta cuenta usa Google Sign-In. Por favor inicia sesión con Google.'
            });
        }

        const isMatch = await user.comparePassword(password);
        if (!isMatch) {
            return res.status(401).json({ error: 'Credenciales inválidas' });
        }

        const token = jwt.sign(
            { id: user._id, username: user.username },
            process.env.JWT_SECRET,
            { expiresIn: '7d' }
        );

        res.json({
            message: 'Login exitoso',
            token,
            user: {
                id: user._id,
                username: user.username,
                email: user.email,
                displayName: user.displayName,
                avatar: user.avatar,
                stats: user.stats
            }
        });
    } catch (error) {
        console.error('Error en login:', error);
        res.status(500).json({ error: 'Error al iniciar sesión' });
    }
});

// ========== RUTAS DE GOOGLE SSO ==========

// Iniciar autenticación con Google
router.get('/auth/google',
    passport.authenticate('google', {
        scope: ['profile', 'email'],
        session: true
    })
);

// Callback de Google - ACTUALIZADO
router.get('/auth/google/callback',
    passport.authenticate('google', {
        failureRedirect: 'http://localhost:3000/login?error=google_auth_failed',
        session: true
    }),
    async (req, res) => {
        try {
            console.log('✅ Google callback ejecutado, usuario:', req.user?.username);

            if (!req.user) {
                console.error('❌ No hay usuario en req.user');
                return res.redirect('http://localhost:3000/login?error=no_user');
            }

            // Generar JWT
            const token = jwt.sign(
                { id: req.user._id, username: req.user.username },
                process.env.JWT_SECRET,
                { expiresIn: '7d' }
            );

            console.log('🔑 Token generado:', token.substring(0, 20) + '...');

            // Redirigir con token en URL
            res.redirect(`http://localhost:3000/auth/callback?token=${token}`);
        } catch (error) {
            console.error('❌ Error en callback de Google:', error);
            res.redirect('http://localhost:3000/login?error=token_generation_failed');
        }
    }
);

// OBTENER PERFIL (requiere autenticación)
router.get('/auth/profile', authenticateToken, async (req, res) => {
    try {
        const user = await User.findById(req.user.id).select('-password');
        if (!user) {
            return res.status(404).json({ error: 'Usuario no encontrado' });
        }
        res.json(user);
    } catch (error) {
        console.error('Error al obtener perfil:', error);
        res.status(500).json({ error: 'Error al obtener perfil' });
    }
});

// ========== CRUD DE PARTIDAS ==========

// CREATE - Guardar nueva partida
router.post('/games', authenticateToken, async (req, res) => {
    try {
        const { playerScore, botScore, winner, duration, moves } = req.body;

        const game = new Game({
            userId: req.user.id,
            playerScore,
            botScore,
            winner,
            duration,
            moves
        });

        await game.save();

        const user = await User.findById(req.user.id);
        user.stats.gamesPlayed += 1;
        if (winner === 'player') {
            user.stats.gamesWon += 1;
        } else {
            user.stats.gamesLost += 1;
        }
        if (playerScore > user.stats.highestScore) {
            user.stats.highestScore = playerScore;
        }
        await user.save();

        res.status(201).json({
            message: 'Partida guardada exitosamente',
            game
        });
    } catch (error) {
        console.error('Error al guardar partida:', error);
        res.status(500).json({ error: 'Error al guardar partida' });
    }
});

// READ - Obtener todas las partidas del usuario
router.get('/games', authenticateToken, async (req, res) => {
    try {
        const games = await Game.find({ userId: req.user.id })
            .sort({ createdAt: -1 })
            .limit(20);

        res.json(games);
    } catch (error) {
        console.error('Error al obtener partidas:', error);
        res.status(500).json({ error: 'Error al obtener partidas' });
    }
});

// READ - Obtener una partida específica
router.get('/games/:id', authenticateToken, async (req, res) => {
    try {
        const game = await Game.findOne({
            _id: req.params.id,
            userId: req.user.id
        });

        if (!game) {
            return res.status(404).json({ error: 'Partida no encontrada' });
        }

        res.json(game);
    } catch (error) {
        console.error('Error al obtener partida:', error);
        res.status(500).json({ error: 'Error al obtener partida' });
    }
});

// UPDATE - Actualizar una partida
router.put('/games/:id', authenticateToken, async (req, res) => {
    try {
        const game = await Game.findOneAndUpdate(
            { _id: req.params.id, userId: req.user.id },
            req.body,
            { new: true }
        );

        if (!game) {
            return res.status(404).json({ error: 'Partida no encontrada' });
        }

        res.json({
            message: 'Partida actualizada',
            game
        });
    } catch (error) {
        console.error('Error al actualizar partida:', error);
        res.status(500).json({ error: 'Error al actualizar partida' });
    }
});

// DELETE - Eliminar una partida
router.delete('/games/:id', authenticateToken, async (req, res) => {
    try {
        const game = await Game.findOneAndDelete({
            _id: req.params.id,
            userId: req.user.id
        });

        if (!game) {
            return res.status(404).json({ error: 'Partida no encontrada' });
        }

        res.json({ message: 'Partida eliminada exitosamente' });
    } catch (error) {
        console.error('Error al eliminar partida:', error);
        res.status(500).json({ error: 'Error al eliminar partida' });
    }
});

// ========== ESTADÍSTICAS ==========

// Obtener ranking de jugadores
router.get('/leaderboard', async (req, res) => {
    try {
        const topPlayers = await User.find()
            .select('username displayName stats avatar')
            .sort({ 'stats.gamesWon': -1 })
            .limit(10);

        res.json(topPlayers);
    } catch (error) {
        console.error('Error al obtener ranking:', error);
        res.status(500).json({ error: 'Error al obtener ranking' });
    }
});

// ========== RUTAS DE VERIFICACIÓN ==========

// Verificar si el usuario está autenticado (para el frontend)
router.get('/auth/verify', authenticateToken, (req, res) => {
    res.json({ authenticated: true, userId: req.user.id });
});

// Logout (simplemente informar al frontend que borre el token)
router.post('/auth/logout', (req, res) => {
    res.json({ message: 'Sesión cerrada. Por favor borra el token del localStorage.' });
});

module.exports = router;