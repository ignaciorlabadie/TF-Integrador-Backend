import type { Request } from 'express'

import { AutorizacionEstudio, Estudio } from '../models/index.js'
import { AppError } from '../errors/AppError.js'
import { MENSAJES } from '../errors/mensajes.js'
import { buscarEstudioPorId } from './estudioService.js'
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

        if (!paciente || Number(paciente.id) !== Number(estudio.pacienteId)) {
            throw new AppError(404, 'Estudio no encontrado')
        }

        return
    }
}

export async function verificarAccesoAutorizacion(
    req: Request,
    autorizacion: AutorizacionEstudio,
): Promise<void> {
    if (req.usuario?.rol !== 'PACIENTE') {
        return
    }

    const estudio = await buscarEstudioPorId(autorizacion.estudioId)

    if (!estudio) {
        throw new AppError(404, 'Estudio no encontrado')
    }

    await verificarAccesoEstudio(req, estudio)
}
