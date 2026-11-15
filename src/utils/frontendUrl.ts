import { AppError } from '../errors/AppError.js'

export function obtenerUrlFrontend(): string {
    const url = process.env.FRONTEND_URL?.trim()

    if (!url) {
        throw new AppError(500, 'FRONTEND_URL no está configurado')
    }

    return url.replace(/\/+$/, '')
}
