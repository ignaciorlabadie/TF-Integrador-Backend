import { Op } from 'sequelize'
import { Estudio, Paciente, AutorizacionEstudio, Profesional } from '../models/index.js'
import { AppError } from '../errors/AppError.js'

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

  // Devuelve null si no existe (siguiendo el patrón de pacienteService)
  return estudio
}

export async function obtenerEstudiosPorPaciente(pacienteId: number) {
  const paciente = await Paciente.findByPk(pacienteId)
  if (!paciente) {
    throw new AppError(404, 'Paciente no encontrado')
  }

  const estudios = await Estudio.findAll({
    where: { pacienteId },
    include: [
      {
        model: AutorizacionEstudio,
        as: 'autorizaciones',
        required: false,
        where: {
          estado: 'disponible',
          fechaVencimiento: {
            [Op.gte]: new Date(),
          },
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
  descripcion?: string
  archivoURL?: string
}) {
  const paciente = await Paciente.findByPk(data.pacienteId)
  if (!paciente) {
    throw new AppError(404, 'Paciente no encontrado')
  }

  return await Estudio.create(data)
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

  return await estudio.update({ archivoURL })
}