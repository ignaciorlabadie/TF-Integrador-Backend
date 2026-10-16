import type { Request, Response } from 'express'

import {
    listarEstudios,
    buscarEstudioPorId,
    obtenerEstudiosPorPaciente,
    crearEstudio,
    adjuntarArchivoEstudio,
    actualizarArchivoEstudio,
} from '../services/estudioService.js'

import { AppError } from '../errors/AppError.js'
import { esUrlValida, esFechaValida } from '../utils/validacion.js'
import { validarId } from '../utils/validarId.js'

export async function obtenerEstudios(_req: Request, res: Response) {
    const estudios = await listarEstudios()
    return res.status(200).json(estudios)
}

export async function obtenerEstudioPorId(req: Request, res: Response) {
    const id = validarId(req.params.id)

    const estudio = await buscarEstudioPorId(id)

    if (!estudio) {
        throw new AppError(404, 'Estudio no encontrado')
    }

    return res.status(200).json(estudio)
}

export async function obtenerEstudiosPaciente(req: Request, res: Response) {
    const pacienteId = validarId(req.params.pacienteId, 'ID del paciente')

    const estudios = await obtenerEstudiosPorPaciente(pacienteId)

    return res.status(200).json(estudios)
}

export async function registrarEstudio(req: Request, res: Response) {
    const { pacienteId, tipo, fecha, descripcion, archivoURL } = req.body

    // Reutilizamos validarId para pacienteId
    const idPacienteNum = validarId(pacienteId, 'ID del paciente')

    if (typeof tipo !== 'string' || tipo.trim().length === 0) {
        throw new AppError(400, 'El tipo de estudio es obligatorio')
    }

    // Validación estricta con DATEONLY / FECHA_REGEX
    if (typeof fecha !== 'string' || !esFechaValida(fecha)) {
        throw new AppError(
            400,
            'La fecha del estudio debe tener el formato YYYY-MM-DD',
        )
    }

    if (descripcion !== undefined && typeof descripcion !== 'string') {
        throw new AppError(400, 'La descripción debe ser una cadena de texto')
    }

    if (archivoURL !== undefined && !esUrlValida(archivoURL)) {
        throw new AppError(400, 'La URL del archivo es inválida')
    }

    const estudio = await crearEstudio({
        pacienteId: idPacienteNum,
        tipo: tipo.trim(),
        fecha,
        descripcion: descripcion?.trim(),
        archivoUrl: archivoURL?.trim(),
    })

    return res.status(201).json(estudio)
}

export async function adjuntarArchivo(req: Request, res: Response) {
    const id = validarId(req.params.id)
    const { archivoURL } = req.body

    if (!esUrlValida(archivoURL)) {
        throw new AppError(400, 'Debe proporcionar una URL de archivo válida')
    }

    const estudio = await adjuntarArchivoEstudio(id, archivoURL.trim())

    return res.status(200).json(estudio)
}

export async function modificarArchivo(req: Request, res: Response) {
    const id = validarId(req.params.id)
    const { archivoURL } = req.body

    if (!esUrlValida(archivoURL)) {
        throw new AppError(400, 'Debe proporcionar una URL de archivo válida')
    }

    const estudio = await actualizarArchivoEstudio(id, archivoURL.trim())

    return res.status(200).json(estudio)
}
