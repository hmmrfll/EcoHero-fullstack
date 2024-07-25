const express = require('express')
const connectDB = require('./config/database')
const userRoutes = require('./routes/userWeb')
const cors = require('cors') // Добавить пакет cors

const app = express()
const port = process.env.PORT || 3000

connectDB()

app.use(cors()) // Включить CORS для всех маршрутов
app.use(express.json())

// Маршруты пользователя
app.use('/api/users', userRoutes)

app.listen(port, () => {
	console.log(`Server is running at http://localhost:${port}`)
})
