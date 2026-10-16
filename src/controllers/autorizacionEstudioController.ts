import type { Request, Response } from 'express'

import {
    listarAutorizaciones,
    buscarAutorizacionPorId,
    autorizarProfesionalService,
    revocarProfesionalService,
    verificarVigenciaService,
} from '../services/autorizacionEstudioService.js'

import { AppError } from '../errors/AppError.js'
import { esFechaValida } from '../utils/validacion.js'
import { validarId } from '../utils/validarId.js'

export async function obtenerAutorizaciones(_req: Request, res: Response) {
    const autorizaciones = await listarAutorizaciones()
    return res.status(200).json(autorizaciones)
}

export async function obtenerAutorizacionPorId(req: Request, res: Response) {
    const id = validarId(req.params.id)

    const autorizacion = await buscarAutorizacionPorId(id)

    if (!autorizacion) {
        throw new AppError(404, 'Autorización no encontrada')
    }

    return res.status(200).json(autorizacion)
}

export async function crearAutorizacion(req: Request, res: Response) {
    const { estudioId, profesionalId, fechaAutorizacion, fechaVencimiento } =
        req.body

    const idEstudioNum = validarId(estudioId, 'ID del estudio')
    const idProfesionalNum = validarId(profesionalId, 'ID del profesional')

    if (
        typeof fechaAutorizacion !== 'string' ||
        !esFechaValida(fechaAutorizacion)
    ) {
        throw new AppError(
            400,
            'La fecha de autorización debe tener el formato YYYY-MM-DD',
        )
    }

    if (
        typeof fechaVencimiento !== 'string' ||
        !esFechaValida(fechaVencimiento)
    ) {
        throw new AppError(
            400,
            'La fecha de vencimiento debe tener el formato YYYY-MM-DD',
        )
    }

    if (fechaVencimiento < fechaAutorizacion) {
        throw new AppError(
            400,
            'La fecha de vencimiento no puede ser anterior a la fecha de autorización',
        )
    }

    const autorizacion = await autorizarProfesionalService({
        estudioId: idEstudioNum,
        profesionalId: idProfesionalNum,
        fechaAutorizacion,
        fechaVencimiento,
    })

    return res.status(201).json(autorizacion)
}

export async function revocarAutorizacion(req: Request, res: Response) {
    const id = validarId(req.params.id)

    const autorizacion = await revocarProfesionalService(id)

    if (!autorizacion) {
        throw new AppError(404, 'Autorización no encontrada')
    }

    return res.status(200).json(autorizacion)
}

export async function verificarVigencia(req: Request, res: Response) {
    const id = validarId(req.params.id)

    const vigencia = await verificarVigenciaService(id)

    if (!vigencia) {
        throw new AppError(404, 'Autorización no encontrada')
    }

    return res.status(200).json(vigencia)
}
