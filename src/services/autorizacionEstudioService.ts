import { AutorizacionEstudio, Estudio, Profesional } from '../models/index.js'
import { AppError } from '../errors/AppError.js'

export async function listarAutorizaciones() {
  return await AutorizacionEstudio.findAll({
    include: [
      { model: Estudio, as: 'estudio' },
      { model: Profesional, as: 'profesional', attributes: ['id', 'nombre', 'apellido', 'especialidad'] }
    ],
    order: [['fechaAutorizacion', 'DESC']]
  })
}

export async function buscarAutorizacionPorId(id: number) {
  const autorizacion = await AutorizacionEstudio.findByPk(id, {
    include: [
      { model: Estudio, as: 'estudio' },
      { model: Profesional, as: 'profesional', attributes: ['id', 'nombre', 'apellido', 'especialidad'] }
    ]
  })

  return autorizacion
}

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

  return await AutorizacionEstudio.create({
    ...data,
    estado: 'disponible'
  })
}

export async function revocarProfesionalService(id: number) {
  const autorizacion = await AutorizacionEstudio.findByPk(id)
  if (!autorizacion) {
    return null
  }

  // actualización de estado a vencido
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
    estaVencida: autorizacion.estaVencida()
  }
}