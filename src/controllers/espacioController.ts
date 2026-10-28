import type { Request, Response } from 'express'

import obtenerOcupacion from '../services/espacioService.js'
import { AppError } from '../errors/AppError.js'

export async function getOcupacionAdmin(req: Request, res: Response) {
    const { start, end } = req.query

    if (
        typeof start !== 'string' ||
        !start.trim() ||
        typeof end !== 'string' ||
        !end.trim()
    ) {
        throw new AppError(
            400,
            'Faltan los parámetros start y end (ej: ?start=2026-10-05&end=2026-10-11)',
        )
    }

    const espacios = await obtenerOcupacion(start, end)

    return res.status(200).json({ data: espacios })
}
