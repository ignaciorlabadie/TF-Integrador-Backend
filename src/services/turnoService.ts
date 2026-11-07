import { Op } from 'sequelize'

import { Agenda, Paciente, Profesional, Turno } from '../models/index.js'
import { AppError } from '../errors/AppError.js'
import { MENSAJES } from '../errors/mensajes.js'

const incluirRelaciones = () => [
    { model: Paciente, as: 'paciente' },
    { model: Profesional, as: 'profesional' },
    { model: Agenda, as: 'agenda' },
]

export class TurnoService {
    async listar(filtros = {}) {
        const where = {}

        if (filtros.profesionalId) {
            where.profesionalId = filtros.profesionalId
        }

        if (filtros.pacienteId) {
            where.pacienteId = filtros.pacienteId
        }

        if (filtros.fecha) {
            where.fecha = filtros.fecha
        }

        if (filtros.estado) {
            where.estado = filtros.estado
        }

        return Turno.findAll({
            where,
            include: incluirRelaciones(),
            order: [['fecha', 'ASC'], ['hora', 'ASC']],
        })
    }

    async buscarPorId(id) {
        const turno = await Turno.findByPk(id, {
            include: incluirRelaciones(),
        })

        if (!turno) {
            throw new AppError(404, 'Turno no encontrado')
        }

        return turno
    }

    async actualizar(id, datos) {
        const turno = await Turno.findByPk(id)

        if (!turno) {
            throw new AppError(404, 'Turno no encontrado')
        }

        if ((datos.fecha || datos.hora) && datos.fecha !== undefined && datos.hora !== undefined) {
            const turnoExistente = await Turno.findOne({
                where: {
                    profesionalId: turno.profesionalId,
                    fecha: datos.fecha,
                    hora: datos.hora,
                    estado: { [Op.not]: 'CANCELADO' },
                    id: { [Op.ne]: id },
                },
            })

            if (turnoExistente) {
                throw new AppError(409, MENSAJES.TURNO_YA_EXISTE_EN_ESA_FECHA_HORA)
            }

            const agenda = await Agenda.findByPk(turno.agendaId)
            const disponible = await agenda.estaDisponible(datos.fecha, datos.hora)

            if (!disponible) {
                throw new AppError(409, MENSAJES.TURNO_YA_EXISTE_EN_ESA_FECHA_HORA)
            }
        }

        if (datos.fecha !== undefined) {
            turno.fecha = datos.fecha
        }

        if (datos.hora !== undefined) {
            turno.hora = datos.hora
        }

        if (datos.motivo !== undefined) {
            turno.motivo = datos.motivo
        }

        if (datos.observaciones !== undefined) {
            turno.observaciones = datos.observaciones
        }

        if (datos.estado !== undefined) {
            turno.estado = datos.estado
        }

        await turno.save()

        return Turno.findByPk(id, {
            include: incluirRelaciones(),
        })
    }

    async cancelar(id) {
        const turno = await Turno.findByPk(id)

        if (!turno) {
            throw new AppError(404, 'Turno no encontrado')
        }

        turno.estado = 'CANCELADO'
        await turno.save()

        return Turno.findByPk(id, {
            include: incluirRelaciones(),
        })
    }
}

export const turnoService = new TurnoService()
