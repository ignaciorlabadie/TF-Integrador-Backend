import { Op } from 'sequelize'
import { AutorizacionEstudio, Estudio, Profesional } from '../models/index.js'
import { AppError } from '../errors/AppError.js'

export async function autorizarProfesionalService(data: {
    estudioId: number
    profesionalId: number
    fechaAutorizacion: string
    fechaVencimiento: string
}) {
    const estudio = await Estudio.findByPk(data.estudioId)
    if (!estudio) {
        throw new AppError(404, 'Estudio no encontrado')
    }

    const profesional = await Profesional.findByPk(data.profesionalId)
    if (!profesional) {
        throw new AppError(404, 'Profesional no encontrado')
    }

    const fechaHoy = new Date().toISOString().slice(0, 10)

    const duplicado = await AutorizacionEstudio.findOne({
        where: {
            estudioId: data.estudioId,
            profesionalId: data.profesionalId,
            estado: 'DISPONIBLE',
            fechaVencimiento: { [Op.gte]: fechaHoy },
        },
    })

    if (duplicado) {
        throw new AppError(409, 'Ya existe una autorización vigente para este profesional y estudio')
    }

    return await AutorizacionEstudio.create({
        ...data,
        estado: 'DISPONIBLE',
    })
}

export async function revocarProfesionalService(id: number) {
    const autorizacion = await AutorizacionEstudio.findByPk(id)
    if (!autorizacion) {
        return null
    }

    autorizacion.revocarProfesional()
    return await autorizacion.save()
}

export async function verificarVigenciaService(id: number) {
    const autorizacion = await AutorizacionEstudio.findByPk(id)
    if (!autorizacion) {
        return null
    }

    return {
        id: autorizacion.id,
        estaVigente: autorizacion.estaVigente(),
        estaVencida: autorizacion.estaVencida(),
    }
}
export async function listarAutorizaciones() {
    return await AutorizacionEstudio.findAll()
}

export async function buscarAutorizacionPorId(id: number) {
    return await AutorizacionEstudio.findByPk(id)
}