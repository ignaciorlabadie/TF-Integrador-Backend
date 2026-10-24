import 'dotenv/config'
import cors from 'cors'
import express from 'express'
import sequelize from './config/database.js'
import routes from './routes/index.js'
import profesionalRoutes from './routes/profesionalRoutes.js'
import { errorHandler } from './middlewares/errorHandler.js'

const app = express()

app.use(cors())
app.use(express.json())
app.use('/api', routes)
app.use('/profesionales', profesionalRoutes)
app.use(errorHandler)

app.get('/', (_req, res) => {
    res.status(200).json({
        mensaje: 'API del sistema de turnos',
    })
})

app.get('/health', async (_req, res) => {
    try {
        await sequelize.authenticate()
        res.json({
            status: 'ok',
            db: 'connected',
            timestamp: new Date().toISOString(),
        })
    } catch (error) {
        console.error(error)
        res.status(503).json({
            status: 'error',
            db: 'disconnected',
        })
    }
})

export default app
