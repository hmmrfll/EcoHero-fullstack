const express = require('express');
const User = require('../models/user'); 
const bot = require('../index.js'); 

const router = express.Router();

router.post('/update-profile-photo', async (req, res) => {
  const { chatId } = req.body;

  try {
    const userProfilePhotos = await bot.getUserProfilePhotos(chatId);
    if (userProfilePhotos.photos.length > 0) {
      const fileId = userProfilePhotos.photos[0][0].file_id;
      const file = await bot.getFile(fileId);
      const profilePhotoUrl = `https://api.telegram.org/file/bot${token}/${file.file_path}`;

      await User.updateOne({ chatId }, { profilePhoto: profilePhotoUrl });

      res.json({ profilePhotoUrl });
    } else {
      res.status(404).json({ message: 'Profile photo not found' });
    }
  } catch (error) {
    console.error('Error fetching profile photo:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Маршрут для получения топ доноров
router.get('/top-donors', async (req, res) => {
    console.log('Запрос на получение топ доноров');
    try {
        const topDonors = await User.find().sort({ donated: -1 }).limit(10);
        res.json(topDonors);
    } catch (error) {
        console.error('Ошибка:', error);
        res.status(500).json({ error: 'Внутренняя ошибка сервера' });
    }
});

// Маршрут для получения данных пользователя по chatId
router.get('/:chatId', async (req, res) => {
    console.log(`Запрос на получение данных для chatId: ${req.params.chatId}`);
    try {
        const user = await User.findOne({ chatId: req.params.chatId });
        if (user) {
            console.log('Пользователь найден:', user);
            res.json(user);
        } else {
            console.log('Пользователь не найден');
            res.status(404).json({ error: 'Пользователь не найден' });
        }
    } catch (error) {
        console.error('Ошибка:', error);
        res.status(500).json({ error: 'Внутренняя ошибка сервера' });
    }
});

// Маршрут для получения chatId по username
router.get('/chat-id/:username', async (req, res) => {
    console.log(`Запрос на получение chatId для username: ${req.params.username}`);
    try {
        const user = await User.findOne({ username: req.params.username });
        if (user) {
            console.log('Пользователь найден:', user);
            res.json({ chatId: user.chatId });
        } else {
            console.log('Пользователь не найден');
            res.status(404).json({ error: 'Пользователь не найден' });
        }
    } catch (error) {
        console.error('Ошибка:', error);
        res.status(500).json({ error: 'Внутренняя ошибка сервера' });
    }
});

// Маршрут для получения данных о пожертвованиях по username
router.get('/donations/:username', async (req, res) => {
    try {
        const { username } = req.params;
        const user = await User.findOne({ username: username });

        if (user) {
            const allUsers = await User.find().sort({ donated: -1 });
            const rank = allUsers.findIndex(u => u.username === username) + 1;

            res.json({ donated: user.donated, profilePhoto: user.profilePhoto, username: user.username, rank: rank });
        } else {
            res.status(404).send('Пользователь не найден');
        }
    } catch (error) {
        res.status(500).send(error);
    }
});

// Маршрут для запуска фарминга
router.post('/start-farming', async (req, res) => {
    const { chatId } = req.body;
    try {
        const user = await User.findOne({ chatId });
        if (user) {
            user.farmingStartTime = new Date();
            await user.save();
            res.json({ success: true, farmingStartTime: user.farmingStartTime });
        } else {
            res.status(404).json({ error: 'Пользователь не найден' });
        }
    } catch (error) {
        console.error('Ошибка:', error);
        res.status(500).json({ error: 'Внутренняя ошибка сервера' });
    }
});

// Маршрут для получения статуса фарминга
router.get('/farming-status/:chatId', async (req, res) => {
    try {
        const user = await User.findOne({ chatId: req.params.chatId });
        if (user) {
            res.json({ farmingStartTime: user.farmingStartTime });
        } else {
            res.status(404).json({ error: 'Пользователь не найден' });
        }
    } catch (error) {
        console.error('Ошибка:', error);
        res.status(500).json({ error: 'Внутренняя ошибка сервера' });
    }
});

// Маршрут для обновления монет ECHA
router.post('/update-echa', async (req, res) => {
    const { chatId, echaCoins } = req.body;
    try {
        const user = await User.findOne({ chatId });
        if (user) {
            user.echaCoins += echaCoins;
            user.farmingStartTime = null; // Сброс времени начала фарминга
            await user.save();
            res.json({ success: true, echaCoins: user.echaCoins });
        } else {
            res.status(404).json({ error: 'Пользователь не найден' });
        }
    } catch (error) {
        console.error('Ошибка:', error);
        res.status(500).json({ error: 'Внутренняя ошибка сервера' });
    }
});

// Маршрут для получения рефералов по chatId
router.get('/referrals/:chatId', async (req, res) => {
    const { chatId } = req.params;
  
    try {
      const user = await User.findOne({ chatId });
      if (user) {
        const referralUsernames = user.referrals;
        res.status(200).json({ referrals: referralUsernames });
      } else {
        res.status(404).json({ message: 'User not found' });
      }
    } catch (error) {
      console.error('Error fetching referrals:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  router.get('/premium-status/:username', async (req, res) => {
    try {
      const user = await User.findOne({ username: req.params.username });
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }
      const chat = await bot.getChat(user.chatId);
      res.json({ isPremium: chat.is_premium || false });
    } catch (error) {
      console.error('Error checking premium status:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });
  
  router.post('/update-balance', async (req, res) => {
    const { chatId, amount, echaCoins } = req.body;
  
    try {
      const user = await User.findOne({ chatId });
  
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }
  
      const amountNum = parseFloat(amount); // Конвертируем amount в число
      const echaCoinsNum = parseInt(echaCoins, 10); // Конвертируем echaCoins в целое число
  
      if (isNaN(amountNum) || isNaN(echaCoinsNum)) {
        return res.status(400).json({ message: 'Invalid amount or echaCoins' });
      }
  
      user.balance += amountNum;
      user.echaCoins += echaCoinsNum;
  
      await user.save();
  
      res.json({ message: 'Balance and ECHA updated successfully' });
    } catch (error) {
      console.error('Error updating balance and ECHA:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });
  
  router.post('/update-balance-and-donated', async (req, res) => {
    const { chatId, amount } = req.body;
  
    try {
      const user = await User.findOne({ chatId });
  
      if (!user) {
        console.error('User not found:', chatId);
        return res.status(404).json({ message: 'User not found' });
      }
  
      const amountNum = parseFloat(amount);
  
      if (isNaN(amountNum)) {
        console.error('Invalid amount:', amount);
        return res.status(400).json({ message: 'Invalid amount' });
      }
  
      user.balance -= amountNum;
      user.donated += amountNum;
  
      await user.save();
  
      res.json({ message: 'Balance and donated amount updated successfully' });
    } catch (error) {
      console.error('Error updating balance and donated amount:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

module.exports = router;
