import type { Request, Response } from 'express'
import { subirArchivoEstudio, crearUrlFirmada } from '../services/storageService.js'
import {
    listarEstudios,
    buscarEstudioPorId,
    obtenerEstudiosPorPaciente,
    crearEstudio,
    actualizarArchivoEstudio,
} from '../services/estudioService.js'
import { AppError } from '../errors/AppError.js'
import { esFechaValida } from '../utils/validacion.js'
import { validarId } from '../utils/validarId.js'

interface MulterRequest extends Request {
    file?: Express.Multer.File
}

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
    const multerReq = req as MulterRequest
    const file = multerReq.file
    const { pacienteId, tipo, fecha, descripcion } = req.body as {
        pacienteId: string
        tipo: string
        fecha: string
        descripcion: string
    }

    const idPacienteNum = validarId(pacienteId, 'ID del paciente')

    if (typeof tipo !== 'string' || tipo.trim().length === 0) {
        throw new AppError(400, 'El tipo de estudio es obligatorio')
    }

    if (typeof fecha !== 'string' || !esFechaValida(fecha)) {
        throw new AppError(400, 'La fecha del estudio debe tener el formato YYYY-MM-DD')
    }

    if (typeof descripcion !== 'string' || descripcion.trim().length === 0) {
        throw new AppError(400, 'La descripción es obligatoria')
    }

    const archivoURL = file
        ? await subirArchivoEstudio(file.buffer, file.mimetype, idPacienteNum)
        : null

    const estudio = await crearEstudio({
        pacienteId: idPacienteNum,
        tipo: tipo.trim(),
        fecha,
        descripcion: descripcion.trim(),
        archivoURL,
    })

    return res.status(201).json(estudio)
}

export async function modificarArchivo(req: Request, res: Response) {
    const multerReq = req as MulterRequest
    const id = validarId(req.params.id)
    const file = multerReq.file

    if (!file) {
        throw new AppError(400, 'Debe proporcionar un archivo')
    }

    const estudio = await buscarEstudioPorId(id)

    if (!estudio) {
        throw new AppError(404, 'Estudio no encontrado')
    }

    const archivoURL = await subirArchivoEstudio(file.buffer, file.mimetype, estudio.pacienteId)

    const actualizado = await actualizarArchivoEstudio(id, archivoURL)

    return res.status(200).json(actualizado)
}

export async function obtenerArchivo(req: Request, res: Response) {
    const id = validarId(req.params.id)

    const estudio = await buscarEstudioPorId(id)

    if (!estudio) {
        throw new AppError(404, 'Estudio no encontrado')
    }

    if (!estudio.archivoURL) {
        throw new AppError(404, 'El estudio no tiene un archivo asociado')
    }

    const { url, expiresIn } = await crearUrlFirmada(estudio.archivoURL)

    return res.status(200).json({ url, expiresIn })
}