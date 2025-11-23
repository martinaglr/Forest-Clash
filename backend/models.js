// backend/models.js
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

// ========== MODELO DE USUARIO ==========
const userSchema = new mongoose.Schema({
    username: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        minlength: 3
    },
    email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true
    },
    password: {
        type: String,
        minlength: 6
    },
    googleId: {
        type: String,
        default: null
        // ❌ SIN unique, SIN sparse, SIN nada
    },
    displayName: {
        type: String,
        default: null
    },
    avatar: {
        type: String,
        default: null
    },
    stats: {
        gamesPlayed: { type: Number, default: 0 },
        gamesWon: { type: Number, default: 0 },
        gamesLost: { type: Number, default: 0 },
        highestScore: { type: Number, default: 0 }
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

// Método para encriptar contraseña antes de guardar
userSchema.pre('save', async function(next) {
    if (!this.isModified('password') || !this.password) return next();

    try {
        const salt = await bcrypt.genSalt(10);
        this.password = await bcrypt.hash(this.password, salt);
        next();
    } catch (error) {
        next(error);
    }
});

// Método para comparar contraseñas
userSchema.methods.comparePassword = async function(candidatePassword) {
    if (!this.password) return false;
    return await bcrypt.compare(candidatePassword, this.password);
};

// ========== MODELO DE PARTIDA ==========
const gameSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    playerScore: {
        type: Number,
        required: true
    },
    botScore: {
        type: Number,
        required: true
    },
    winner: {
        type: String,
        enum: ['player', 'bot'],
        required: true
    },
    duration: {
        type: Number,
        default: 0
    },
    moves: [{
        player: String,
        action: String,
        timestamp: Date
    }],
    createdAt: {
        type: Date,
        default: Date.now
    }
});

const User = mongoose.model('User', userSchema);
const Game = mongoose.model('Game', gameSchema);

module.exports = { User, Game };