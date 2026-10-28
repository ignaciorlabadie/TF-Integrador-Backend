import type { Request } from 'express'

import { Estudio } from '../models/index.js'
import { AppError } from '../errors/AppError.js'
import { MENSAJES } from '../errors/mensajes.js'
import { pacienteService } from './pacienteService.js'

export async function verificarAccesoEstudio(
    req: Request,
    estudio: Estudio,
): Promise<void> {
    const usuario = req.usuario

    if (!usuario) {
        throw new AppError(401, MENSAJES.AUTENTICACION_REQUERIDA)
    }

    if (usuario.rol === 'ADMIN') {
        return
    }

    if (usuario.rol === 'PACIENTE') {
        const paciente = await pacienteService.buscarPorUsuarioId(usuario.id)

        if (!paciente || paciente.id !== estudio.pacienteId) {
            throw new AppError(403, MENSAJES.SIN_PERMISOS)
        }

        return
    }
}
