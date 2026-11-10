import 'dotenv/config'
import cors from 'cors'
import express from 'express'
import swaggerUi from 'swagger-ui-express'
import sequelize from './config/database.js'
import { openapiSpec } from './config/swagger.js'
import routes from './routes/index.js'
import { errorHandler } from './middlewares/errorHandler.js'

const app = express()

app.use(cors())
app.use(express.json())

app.get('/api-docs/openapi.json', (_req, res) => {
    res.json(openapiSpec)
})

app.use(
    '/api-docs',
    swaggerUi.serve,
    swaggerUi.setup(openapiSpec, {
        customSiteTitle: 'API Sistema de Turnos',
    }),
)

app.use('/api', routes)
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
