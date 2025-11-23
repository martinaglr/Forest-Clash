// backend/passport.js
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const { User } = require('./models');

passport.use(new GoogleStrategy({
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL: process.env.GOOGLE_CALLBACK_URL
    },
    async (accessToken, refreshToken, profile, done) => {
        try {
            console.log('📝 Perfil de Google recibido:', profile.displayName);

            // Validar que tengamos email
            if (!profile.emails || !profile.emails[0]) {
                console.error('❌ No se recibió email de Google');
                return done(new Error('No email from Google'), null);
            }

            const email = profile.emails[0].value;
            const googleId = profile.id;

            // PASO 1: Buscar si ya existe usuario con este googleId
            let user = await User.findOne({ googleId: googleId });

            if (user) {
                console.log('✅ Usuario existente encontrado:', user.username);
                return done(null, user);
            }

            // PASO 2: Buscar por email (para vincular cuentas existentes)
            user = await User.findOne({ email: email });

            if (user) {
                // Usuario existe pero sin googleId, vincular cuentas
                console.log('🔗 Vinculando cuenta existente con Google');

                // Solo vincular si no tiene googleId ya asignado
                if (!user.googleId) {
                    user.googleId = googleId;
                    user.displayName = profile.displayName || user.displayName;
                    user.avatar = profile.photos?.[0]?.value || user.avatar;
                    await user.save();
                    console.log('✅ Cuenta vinculada exitosamente');
                }

                return done(null, user);
            }

            // PASO 3: Crear nuevo usuario desde Google
            console.log('🆕 Creando nuevo usuario desde Google');

            // Generar username único basado en email
            const emailUsername = email.split('@')[0].toLowerCase().replace(/[^a-z0-9]/g, '');
            let username = emailUsername;
            let counter = 1;

            // Asegurar que el username sea único
            while (await User.findOne({ username })) {
                username = `${emailUsername}${counter}`;
                counter++;
            }

            user = new User({
                username,
                email: email,
                googleId: googleId,
                displayName: profile.displayName || username,
                avatar: profile.photos?.[0]?.value || null,
                password: undefined // No asignar password para usuarios de Google
            });

            await user.save();
            console.log('✅ Usuario creado exitosamente:', user.username);

            done(null, user);
        } catch (error) {
            console.error('❌ Error en Google Strategy:', error);
            done(error, null);
        }
    }
));

// Serialización - guarda solo el ID en la sesión
passport.serializeUser((user, done) => {
    console.log('📝 Serializando usuario:', user._id);
    done(null, user._id);
});

// Deserialización - recupera el usuario completo desde el ID
passport.deserializeUser(async (id, done) => {
    try {
        const user = await User.findById(id).select('-password');
        console.log('📖 Deserializando usuario:', user?.username);
        done(null, user);
    } catch (error) {
        console.error('❌ Error al deserializar:', error);
        done(error, null);
    }
});

module.exports = passport;