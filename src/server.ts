import 'dotenv/config'
import app from './app.js'
import sequelize from './config/database.js'
import {
    detenerRecordatoriosTurnos,
    iniciarRecordatoriosTurnos,
} from './services/recordatorioTurnoService.js'

const PORT = process.env.PORT || 3000

let server: ReturnType<typeof app.listen> | null = null

const shutdown = async (signal: string, exitCode = 0) => {
    console.log(`Señal ${signal} recibida. Iniciando apagado`)
    detenerRecordatoriosTurnos()
    if (server) {
        await new Promise<void>((resolve) => server!.close(() => resolve()))
    }
    await sequelize.close()
    process.exit(exitCode)
}

sequelize
    .authenticate()
    .then(() => {
        console.log('Base de datos conectada')
        iniciarRecordatoriosTurnos()
        server = app.listen(PORT, () => {
            console.log(
                `Servidor del sistema de turnos corriendo en puerto ${PORT}`,
            )
        })

        process.on('SIGTERM', () => {
            void shutdown('SIGTERM')
        })
        process.on('SIGINT', () => {
            void shutdown('SIGINT')
        })
    })
    .catch((error) => {
        console.error('Error al conectar con la base de datos:', error)
    })

process.on('uncaughtException', (error) => {
    console.error('Excepción no capturada:', error)
    void shutdown('uncaughtException', 1)
})

process.on('unhandledRejection', (reason) => {
    console.error('Promesa rechazada sin manejar:', reason)
    void shutdown('unhandledRejection', 1)
})
