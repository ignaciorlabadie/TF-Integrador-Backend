import { Op } from 'sequelize'
import { Estudio, Paciente, AutorizacionEstudio, Profesional } from '../models/index.js'
import { AppError } from '../errors/AppError.js'
import { eliminarArchivoEstudio } from './storageService.js'

export async function listarEstudios() {
    return await Estudio.findAll({
        order: [['fecha', 'DESC']],
    })
}

export async function buscarEstudioPorId(id: number) {
    const estudio = await Estudio.findByPk(id, {
        include: [
            {
                model: Paciente,
                as: 'paciente',
                attributes: ['id', 'nombre', 'apellido', 'dni'],
            },
            {
                model: AutorizacionEstudio,
                as: 'autorizaciones',
                required: false,
                include: [
                    {
                        model: Profesional,
                        as: 'profesional',
                        attributes: ['id', 'nombre', 'apellido', 'especialidad'],
                    },
                ],
            },
        ],
    })

    return estudio
}

export async function obtenerEstudiosPorPaciente(pacienteId: number) {
    const paciente = await Paciente.findByPk(pacienteId)
    if (!paciente) {
        throw new AppError(404, 'Paciente no encontrado')
    }

    const fechaHoy = new Date().toISOString().slice(0, 10)

    const estudios = await Estudio.findAll({
        where: { pacienteId },
        include: [
            {
                model: AutorizacionEstudio,
                as: 'autorizaciones',
                required: false,
                where: {
                    estado: 'DISPONIBLE',
                    fechaVencimiento: { [Op.gte]: fechaHoy },
                },
                include: [
                    {
                        model: Profesional,
                        as: 'profesional',
                        attributes: ['id', 'nombre', 'apellido', 'especialidad'],
                    },
                ],
            },
        ],
        order: [['fecha', 'DESC']],
    })

    return estudios
}

export async function crearEstudio(data: {
    pacienteId: number
    tipo: string
    fecha: string
    descripcion: string
    archivoURL?: string | null
}) {
    const paciente = await Paciente.findByPk(data.pacienteId)
    if (!paciente) {
        throw new AppError(404, 'Paciente no encontrado')
    }

    try {
        return await Estudio.create(data)
    } catch (error) {
        if (data.archivoURL) {
            await eliminarArchivoEstudio(data.archivoURL).catch(() => undefined)
        }
        throw error
    }
}

export async function adjuntarArchivoEstudio(id: number, archivoURL: string) {
    const estudio = await Estudio.findByPk(id)
    if (!estudio) {
        throw new AppError(404, 'Estudio no encontrado')
    }

    return await estudio.update({ archivoURL })
}

export async function actualizarArchivoEstudio(id: number, archivoURL: string) {
    const estudio = await Estudio.findByPk(id)
    if (!estudio) {
        throw new AppError(404, 'Estudio no encontrado')
    }

    const pathAnterior = estudio.archivoURL ?? null

    const actualizado = await estudio.update({ archivoURL })

    if (pathAnterior && pathAnterior !== archivoURL) {
        await eliminarArchivoEstudio(pathAnterior)
    }

    return actualizado
}