import { Op } from 'sequelize'

import sequelize from '../config/database.js'
import {
    Agenda,
    Paciente,
    Profesional,
    Turno,
    Usuario,
} from '../models/index.js'
import { AppError } from '../errors/AppError.js'
import { MENSAJES } from '../errors/mensajes.js'
import type { ActualizarTurno } from '../types/ActualizarTurno.js'
import type { CrearTurno } from '../types/CrearTurno.js'
import {
    enviarEmailTurnoCancelado,
    enviarEmailTurnoCreado,
} from './emailService.js'

type TurnoConRelaciones = Turno & {
    paciente?: Paciente & { usuario?: Usuario }
    profesional?: Profesional
    agenda?: Agenda
}

const incluirRelaciones = () => [
    {
        model: Paciente,
        as: 'paciente',
        include: [{ model: Usuario, as: 'usuario' }],
    },
    { model: Profesional, as: 'profesional' },
    { model: Agenda, as: 'agenda' },
]

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

        const turnoConRelaciones = (await Turno.findByPk(turno.id, {
            include: incluirRelaciones(),
        })) as TurnoConRelaciones | null

        const paciente = turnoConRelaciones?.paciente
        const profesional = turnoConRelaciones?.profesional

        if (paciente && profesional && paciente.usuario) {
            enviarEmailTurnoCreado(
                paciente.usuario.email,
                paciente.nombre,
                turno.fecha,
                turno.hora,
                profesional.nombre,
            ).catch(() => {})
        }

        return turnoConRelaciones
    }

    async listar(
        filtros: {
            profesionalId?: string | number
            pacienteId?: string | number
            fecha?: string
            estado?: string
        } = {},
    ) {
        const where: Record<string, unknown> = {}

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
            order: [
                ['fecha', 'ASC'],
                ['hora', 'ASC'],
            ],
        })
    }

    async buscarPorId(id: number) {
        const turno = await Turno.findByPk(id, {
            include: incluirRelaciones(),
        })

        if (!turno) {
            throw new AppError(404, 'Turno no encontrado')
        }

        return turno
    }

    async actualizar(id: number, datos: ActualizarTurno) {
        const turno = await Turno.findByPk(id)

        if (!turno) {
            throw new AppError(404, 'Turno no encontrado')
        }

        if (
            (datos.fecha || datos.hora) &&
            datos.fecha !== undefined &&
            datos.hora !== undefined
        ) {
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
                throw new AppError(
                    409,
                    MENSAJES.TURNO_YA_EXISTE_EN_ESA_FECHA_HORA,
                )
            }

            const agenda = await Agenda.findByPk(turno.agendaId)

            if (!agenda) {
                throw new AppError(404, 'Agenda no encontrada')
            }

            const disponible = await agenda.estaDisponible(
                datos.fecha,
                datos.hora,
            )

            if (!disponible) {
                throw new AppError(
                    409,
                    MENSAJES.TURNO_YA_EXISTE_EN_ESA_FECHA_HORA,
                )
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

    async cancelar(id: number) {
        const turno = await Turno.findByPk(id)

        if (!turno) {
            throw new AppError(404, 'Turno no encontrado')
        }

        const turnoConRelaciones = (await Turno.findByPk(id, {
            include: incluirRelaciones(),
        })) as TurnoConRelaciones | null

        const paciente = turnoConRelaciones?.paciente
        const profesional = turnoConRelaciones?.profesional

        turno.estado = 'CANCELADO'
        await turno.save()

        if (paciente && profesional && paciente.usuario) {
            enviarEmailTurnoCancelado(
                paciente.usuario.email,
                paciente.nombre,
                turno.fecha,
                turno.hora,
                profesional.nombre,
            ).catch(() => {})
        }

        return Turno.findByPk(id, {
            include: incluirRelaciones(),
        })
    }
}

export const turnoService = new TurnoService()
