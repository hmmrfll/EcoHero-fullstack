const mongoose = require('mongoose')
const TelegramBot = require('node-telegram-bot-api')
const crypto = require('crypto')
const { createCanvas } = require('canvas')
const User = require('./models/user')
require('dotenv').config()

mongoose.connect(process.env.MONGODB_URI)

const token = process.env.TOKEN
const bot = new TelegramBot(token, { polling: true })
const webAppUrl = process.env.WEBAPPURI
const communityAppUrl = process.env.COMMUNITY_APP_URI

const checkUserPremiumStatus = async userId => {
	try {
		const user = await bot.getChat(userId)
		return user.is_premium || false
	} catch (error) {
		console.error('Error checking premium status:', error)
		return false
	}
}

bot.on('message', async msg => {
	const chatId = msg.chat.id
	const username =
		msg.from.username || msg.from.first_name || msg.from.last_name || 'User'
	const languageCode = msg.from.language_code // Получаем language_code
	const text = msg.text

	let profilePhoto = ''

	try {
		profilePhoto = createProfileImage(username.charAt(0).toUpperCase())
	} catch (error) {
		console.error('Error creating profile image:', error)
	}

	if (text.startsWith('/start')) {
		const refCodeMatch = text.match(/\/start (.+)/)
		const referrerReferralCode = refCodeMatch
			? refCodeMatch[1].replace('ref_', '')
			: null

		let user = await User.findOne({ chatId })
		let referrer = null

		if (referrerReferralCode) {
			referrer = await User.findOne({ referralCode: referrerReferralCode })
		}

		if (!user) {
			const referralCode = generateReferralCode()

			const newUser = new User({
				chatId,
				username,
				profilePhoto,
				referralCode,
				referrerChatId: null,
				referrals: [],
				balance: 0,
				donated: 0,
				echaCoins: 0,
				farmingStartTime: null,
				languageCode, // Сохраняем language_code
				hasReceivedReferralBonus: false, // Новый флаг
			})

			if (referrer && referrer.chatId !== chatId) {
				const isPremium = await checkUserPremiumStatus(msg.from.id)
				const bonus = isPremium ? 30000 : 10000

				newUser.referrerChatId = referrer.chatId
				referrer.referrals.push(newUser.username)
				referrer.echaCoins += bonus
				await referrer.save()
				await bot.sendMessage(
					referrer.chatId,
					`Новый пользователь @${username} присоединился по вашей ссылке и вы получили ${bonus} ECHA!`
				)
				newUser.hasReceivedReferralBonus = true // Установить флаг
			}

			user = await newUser.save()
		} else if (
			referrer &&
			!user.hasReceivedReferralBonus &&
			!user.referrerChatId
		) {
			// Проверка флага и отсутсвие реф. ID
			if (referrer.chatId !== chatId) {
				const isPremium = await checkUserPremiumStatus(msg.from.id)
				const bonus = isPremium ? 30000 : 10000

				user.referrerChatId = referrer.chatId
				referrer.referrals.push(user.username)
				referrer.echaCoins += bonus
				await referrer.save()
				await bot.sendMessage(
					referrer.chatId,
					`Новый пользователь @${username} присоединился по вашей ссылке и вы получили ${bonus} ECHA!`
				)
				user.hasReceivedReferralBonus = true // Установить флаг
				user = await user.save()
			}
		}

		const invitationMessage = user.referrerChatId
			? `Добро пожаловать в EcoHero — Фонд помощи животным по всему миру`
			: `EcoHero доступен только по приглашениям. Попросите друга пригласить вас.`

		const replyMarkup = user.referrerChatId
			? {
					reply_markup: {
						inline_keyboard: [
							[{ text: 'GO!', web_app: { url: webAppUrl } }],
							[{ text: 'Присоединиться к сообществу!', url: communityAppUrl }],
						],
					},
			  }
			: {
					reply_markup: {
						inline_keyboard: [
							[{ text: 'Присоединиться к сообществу!', url: communityAppUrl }],
						],
					},
			  }

		await bot.sendMessage(
			chatId,
			`Привет @${username}! ${invitationMessage}`,
			replyMarkup
		)
	}
})

function generateReferralCode() {
	return crypto.randomBytes(4).toString('hex')
}

function createProfileImage(letter) {
	const canvas = createCanvas(100, 100)
	const ctx = canvas.getContext('2d')

	ctx.fillStyle = '#4c657d'
	ctx.fillRect(0, 0, 100, 100)

	ctx.fillStyle = '#fff'
	ctx.font = 'bold 50px Arial'
	ctx.textAlign = 'center'
	ctx.textBaseline = 'middle'
	ctx.fillText(letter, 50, 50)

	return canvas.toDataURL()
}

module.exports = bot
