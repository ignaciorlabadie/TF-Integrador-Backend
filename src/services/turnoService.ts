import { Op } from 'sequelize'

import { Agenda, Turno } from '../models/index.js'
import sequelize from '../config/database.js'
import type { CrearTurno } from '../types/CrearTurno.js'
import { AppError } from '../errors/AppError.js'
import { MENSAJES } from '../errors/mensajes.js'

export class TurnoService {
    async crear(datos: CrearTurno) {
        const turnoExistente = await Turno.findOne({
            where: {
                profesionalId: datos.profesionalId,
                fecha: datos.fecha,
                hora: datos.hora,
                estado: { [Op.not]: 'CANCELADO' },
            },
        })

        if (turnoExistente) {
            throw new AppError(409, MENSAJES.TURNO_YA_EXISTE_EN_ESA_FECHA_HORA)
        }

        const agenda = await Agenda.findByPk(datos.agendaId)

        if (!agenda) {
            throw new AppError(404, 'Agenda no encontrada')
        }

        const disponible = await agenda.estaDisponible(datos.fecha, datos.hora)

        if (!disponible) {
            throw new AppError(409, MENSAJES.TURNO_YA_EXISTE_EN_ESA_FECHA_HORA)
        }

        const turno = await sequelize.transaction(async (transaction) => {
            return await Turno.create(
                {
                    pacienteId: datos.pacienteId,
                    profesionalId: datos.profesionalId,
                    agendaId: datos.agendaId,
                    fecha: datos.fecha,
                    hora: datos.hora,
                    motivo: datos.motivo,
                    observaciones: datos.observaciones ?? null,
                    estado: 'PENDIENTE',
                },
                { transaction },
            )
        })

        return Turno.findByPk(turno.id, {
            include: [
                { model: Agenda, as: 'agenda' },
            ],
        })
    }
}

export const turnoService = new TurnoService()
