const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    chatId: { type: Number, unique: true },
    username: { type: String, default: '' },
    profilePhoto: { type: String, default: '' },
    referralCode: { type: String, unique: true },
    referrerChatId: Number,
    balance: { type: Number, default: 0 },
    donated: { type: Number, default: 0 },
    echaCoins: { type: Number, default: 0 },
    farmingStartTime: { type: Date },
    referrals: [{ type: String }],
    isPremium: { type: Boolean, default: false } // Добавлено поле для премиум статуса
});

const User = mongoose.model('User', userSchema);

module.exports = User;
