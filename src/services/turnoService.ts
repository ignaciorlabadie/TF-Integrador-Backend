import { Op } from 'sequelize'

import sequelize from '../config/database.js'
import {
    Agenda,
    Paciente,
    Profesional,
    Turno,
    Usuario,
} from '../models/index.js'
import { ATRIBUTOS_USUARIO_PUBLICOS } from '../models/atributosUsuario.js'
import { AppError } from '../errors/AppError.js'
import { MENSAJES } from '../errors/mensajes.js'
import type { ActualizarTurno } from '../types/ActualizarTurno.js'
import type { CrearTurno } from '../types/CrearTurno.js'
import type { Rol } from '../types/Rol.js'
import type { AlcanceTurnos } from '../utils/alcanceTurnos.js'
import {
    ahoraLocal,
    diaSemanaDeFecha,
    horaAMinutos,
    minutosAHora,
} from '../utils/horarios.js'
import {
    enviarEmailTurnoCancelado,
    enviarEmailTurnoCreado,
} from './emailService.js'

type TurnoConRelaciones = Turno & {
    paciente?: Paciente & { usuario?: Usuario }
    profesional?: Profesional
    agenda?: Agenda
}

export interface OpcionesRelaciones {
    // Con false, el profesional del turno se devuelve solo con sus datos
    // públicos (sin DNI, teléfono ni matrícula).
    profesionalCompleto?: boolean
}

export interface HorarioLibre {
    agendaId: number
    hora: string
}

export const ATRIBUTOS_PROFESIONAL_PUBLICOS = [
    'id',
    'nombre',
    'apellido',
    'especialidad',
]

const ESTADOS_CANCELABLES = ['PENDIENTE', 'CONFIRMADO']

const atributosUsuario = {
    attributes: ATRIBUTOS_USUARIO_PUBLICOS,
}

const incluirRelaciones = (opciones: OpcionesRelaciones = {}) => {
    const profesionalCompleto = opciones.profesionalCompleto ?? true

    return [
        {
            model: Paciente,
            as: 'paciente',
            include: [{ model: Usuario, as: 'usuario', ...atributosUsuario }],
        },
        profesionalCompleto
            ? { model: Profesional, as: 'profesional' }
            : {
                  model: Profesional,
                  as: 'profesional',
                  attributes: ATRIBUTOS_PROFESIONAL_PUBLICOS,
              },
        { model: Agenda, as: 'agenda' },
    ]
}

function normalizarHoraTurno(hora: string): string {
    return hora.slice(0, 5)
}

function validarNoPasado(fecha: string, hora: string) {
    const ahora = ahoraLocal()
    const minutos = horaAMinutos(hora)

    if (
        fecha < ahora.fecha ||
        (fecha === ahora.fecha && minutos !== null && minutos <= ahora.minutos)
    ) {
        throw new AppError(400, MENSAJES.TURNO_EN_EL_PASADO)
    }
}

/**
 * Verifica que fecha y hora caigan en un turno real de la agenda:
 * mismo día de la semana, dentro del bloque y alineado a la grilla que
 * arranca en horaInicio y avanza cada duracionTurno.
 */
function validarHorarioEnAgenda(agenda: Agenda, fecha: string, hora: string) {
    if (diaSemanaDeFecha(fecha) !== agenda.diaSemana) {
        throw new AppError(400, MENSAJES.TURNO_DIA_NO_COINCIDE)
    }

    const inicioTurno = horaAMinutos(hora)
    const inicioAgenda = horaAMinutos(agenda.horaInicio)
    const finAgenda = horaAMinutos(agenda.horaFin)

    if (inicioTurno === null || inicioAgenda === null || finAgenda === null) {
        throw new AppError(400, MENSAJES.TURNO_FUERA_DE_HORARIO)
    }

    const dentroDelBloque =
        inicioTurno >= inicioAgenda &&
        inicioTurno + agenda.duracionTurno <= finAgenda
    const alineado = (inicioTurno - inicioAgenda) % agenda.duracionTurno === 0

    if (!dentroDelBloque || !alineado) {
        throw new AppError(400, MENSAJES.TURNO_FUERA_DE_HORARIO)
    }
}

export class TurnoService {
    /**
     * Traduce el usuario del token a su perfil de paciente o profesional.
     * El id del usuario NO es el mismo que pacienteId / profesionalId.
     */
    async obtenerAlcance(usuario: {
        id: number
        rol: Rol
    }): Promise<AlcanceTurnos> {
        if (usuario.rol === 'ADMIN') {
            return { tipo: 'TODOS' }
        }

        if (usuario.rol === 'PACIENTE') {
            const paciente = await Paciente.findOne({
                where: { usuarioId: usuario.id },
                attributes: ['id'],
            })

            return paciente
                ? { tipo: 'PACIENTE', pacienteId: Number(paciente.id) }
                : { tipo: 'NINGUNO' }
        }

        const profesional = await Profesional.findOne({
            where: { usuarioId: usuario.id },
            attributes: ['id'],
        })

        return profesional
            ? { tipo: 'PROFESIONAL', profesionalId: Number(profesional.id) }
            : { tipo: 'NINGUNO' }
    }

    async crear(datos: CrearTurno, opciones: OpcionesRelaciones = {}) {
        validarNoPasado(datos.fecha, datos.hora)

        const paciente = await Paciente.findByPk(datos.pacienteId)

        if (!paciente) {
            throw new AppError(404, MENSAJES.PACIENTE_NO_ENCONTRADO)
        }

        const agenda = await Agenda.findByPk(datos.agendaId)

        if (!agenda) {
            throw new AppError(404, MENSAJES.AGENDA_NO_ENCONTRADA)
        }

        if (Number(agenda.profesionalId) !== datos.profesionalId) {
            throw new AppError(400, MENSAJES.TURNO_AGENDA_DE_OTRO_PROFESIONAL)
        }

        if (!agenda.activo) {
            throw new AppError(409, MENSAJES.TURNO_AGENDA_INACTIVA)
        }

        validarHorarioEnAgenda(agenda, datos.fecha, datos.hora)

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
                    estado: 'CONFIRMADO',
                },
                { transaction },
            )
        })

        const turnoConRelaciones = (await Turno.findByPk(turno.id, {
            include: incluirRelaciones(opciones),
        })) as TurnoConRelaciones | null

        const pacienteTurno = turnoConRelaciones?.paciente
        const profesional = turnoConRelaciones?.profesional

        if (pacienteTurno && profesional && pacienteTurno.usuario) {
            enviarEmailTurnoCreado(
                pacienteTurno.usuario.email,
                pacienteTurno.nombre,
                turno.fecha,
                turno.hora,
                profesional.nombre,
            ).catch(() => {})
        }

        return turnoConRelaciones
    }

    async listar(
        filtros: Record<string, string | number> = {},
        opciones: OpcionesRelaciones = {},
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
            include: incluirRelaciones(opciones),
            order: [
                ['fecha', 'ASC'],
                ['hora', 'ASC'],
            ],
        })
    }

    async buscarPorId(id: number, opciones: OpcionesRelaciones = {}) {
        const turno = await Turno.findByPk(id, {
            include: incluirRelaciones(opciones),
        })

        if (!turno) {
            throw new AppError(404, MENSAJES.TURNO_NO_ENCONTRADO)
        }

        return turno
    }

    /**
     * Horarios libres de un profesional para una fecha: recorre sus agendas
     * activas de ese día de la semana, arma la grilla de turnos y descarta
     * los ocupados (cualquier estado salvo CANCELADO) y los que ya pasaron.
     */
    async horariosLibres(
        profesionalId: number,
        fecha: string,
    ): Promise<HorarioLibre[]> {
        const profesional = await Profesional.findByPk(profesionalId, {
            attributes: ['id'],
        })

        if (!profesional) {
            throw new AppError(404, MENSAJES.PROFESIONAL_NO_ENCONTRADO)
        }

        const ahora = ahoraLocal()

        if (fecha < ahora.fecha) {
            return []
        }

        const diaSemana = diaSemanaDeFecha(fecha)

        if (!diaSemana) {
            return []
        }

        const agendas = await Agenda.findAll({
            where: { profesionalId, diaSemana, activo: true },
            order: [['horaInicio', 'ASC']],
        })

        if (agendas.length === 0) {
            return []
        }

        const turnosOcupados = await Turno.findAll({
            where: {
                profesionalId,
                fecha,
                estado: { [Op.not]: 'CANCELADO' },
            },
            attributes: ['hora'],
        })

        const ocupadas = new Set(
            turnosOcupados.map((turno) => normalizarHoraTurno(turno.hora)),
        )
        const esHoy = fecha === ahora.fecha
        const libres: HorarioLibre[] = []

        for (const agenda of agendas) {
            const inicio = horaAMinutos(agenda.horaInicio)
            const fin = horaAMinutos(agenda.horaFin)

            if (inicio === null || fin === null || agenda.duracionTurno <= 0) {
                continue
            }

            for (
                let minuto = inicio;
                minuto + agenda.duracionTurno <= fin;
                minuto += agenda.duracionTurno
            ) {
                const hora = minutosAHora(minuto)

                if (ocupadas.has(hora)) {
                    continue
                }

                if (esHoy && minuto <= ahora.minutos) {
                    continue
                }

                libres.push({ agendaId: agenda.id, hora })
            }
        }

        return libres.sort((a, b) => a.hora.localeCompare(b.hora))
    }

    async actualizar(id: number, datos: ActualizarTurno) {
        const turno = await Turno.findByPk(id)

        if (!turno) {
            throw new AppError(404, MENSAJES.TURNO_NO_ENCONTRADO)
        }

        const nuevaFecha = datos.fecha ?? turno.fecha
        const nuevaHora = datos.hora ?? normalizarHoraTurno(turno.hora)
        const fechaCambio =
            datos.fecha !== undefined && datos.fecha !== turno.fecha
        const horaCambio =
            datos.hora !== undefined &&
            datos.hora !== normalizarHoraTurno(turno.hora)

        if (fechaCambio || horaCambio) {
            validarNoPasado(nuevaFecha, nuevaHora)

            const turnoExistente = await Turno.findOne({
                where: {
                    profesionalId: turno.profesionalId,
                    fecha: nuevaFecha,
                    hora: nuevaHora,
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
                throw new AppError(404, MENSAJES.AGENDA_NO_ENCONTRADA)
            }

            validarHorarioEnAgenda(agenda, nuevaFecha, nuevaHora)

            const disponible = await agenda.estaDisponible(
                nuevaFecha,
                nuevaHora,
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

        if (fechaCambio || horaCambio) {
            turno.recordatorioEnviadoAt = null
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

    async cancelar(id: number, opciones: OpcionesRelaciones = {}) {
        const turno = await Turno.findByPk(id)

        if (!turno) {
            throw new AppError(404, MENSAJES.TURNO_NO_ENCONTRADO)
        }

        if (!ESTADOS_CANCELABLES.includes(turno.estado)) {
            throw new AppError(409, MENSAJES.TURNO_NO_CANCELABLE)
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
            include: incluirRelaciones(opciones),
        })
    }
}

export const turnoService = new TurnoService()
