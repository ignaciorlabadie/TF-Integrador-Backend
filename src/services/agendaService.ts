/**
 * Servicio de agendas médicas.
 *
 * Responsabilidades:
 * - Consultar, crear, actualizar y desactivar agendas.
 * - Validar día, horario y duración de turnos.
 * - Evitar superposiciones entre agendas activas del mismo profesional.
 * - Proteger los turnos futuros ante cambios de disponibilidad.
 *
 * Convenciones:
 * - diaSemana usa el ENUM del modelo: LUNES..DOMINGO. 
 * - Las horas se normalizan a HH:mm; PostgreSQL puede devolver HH:mm:ss.
 * - No contiene lógica HTTP ni validación de roles: eso queda en el controller
 *
 * Política ante turnos futuros afectados:
 * - Por defecto la operación se bloquea con 409.
 * - El llamador puede solicitar la cancelación automática mediante opciones.
 *
 * Códigos de error:
 * - 400: entrada inválida.
 * - 404: agenda o profesional inexistente.
 * - 409: superposición o turnos futuros afectados.
 */

import { Op } from 'sequelize'
import { Agenda, Profesional, Turno } from '../models/index.js'
import { AppError } from '../errors/AppError.js'
import { MENSAJES } from '../errors/mensajes.js'
import type { DiaSemana } from '../types/DiaSemana.js'

export interface ListarAgendasFiltros {
    profesionalId?: number
    activo?: boolean
}

export interface ListarAgendasPorProfesionalFiltros {
    activo?: boolean
}

/**
 * Datos necesarios para crear una agenda.
 */
export interface DatosAgenda {
    profesionalId: number
    diaSemana: DiaSemana
    horaInicio: string
    horaFin: string
    duracionTurno: number
}

// profesionalId y activo quedan fuera a proposito:
// el dueño de la agenda no se cambia desde actualizar()
// y la baja se realiza con desactivar().
export type DatosActualizarAgenda = Partial<
    Pick<
        DatosAgenda,
        'diaSemana' | 'horaInicio' | 'horaFin' | 'duracionTurno'
    >
>

/**
 * Permite resolver automáticamente los turnos que quedarían
 * fuera de la nueva disponibilidad al actualizar una agenda.
 */
export interface OpcionesActualizarAgenda {
    cancelarTurnosAfectados?: boolean
}


 // Permite resolver automáticamente los turnos futuros antes de desactivar una agenda.

export interface OpcionesDesactivarAgenda {
    cancelarTurnosFuturos?: boolean
}

/**
 * Resultado interno de la validación de horario.
 * Incluye las horas normalizadas y los minutos ya calculados para evitar conversiones repetidas.
 */
interface HorarioValidado {
    diaSemana: DiaSemana
    horaInicio: string
    horaFin: string
    duracionTurno: number
    inicioMinutos: number
    finMinutos: number
}

// Mensajes propios del dominio de agendas.
const MENSAJES_AGENDA = {
    AGENDA_NO_ENCONTRADA: 'Agenda no encontrada',
    DIA_SEMANA_INVALIDO: 'El día de la semana no es válido',
    HORA_INVALIDA: 'Las horas deben tener un formato válido HH:mm',
    HORARIO_INVALIDO:
        'La hora de inicio debe ser anterior a la hora de finalización',
    DURACION_INVALIDA:
        'La duración del turno debe ser un número entero positivo',
    DURACION_INCOMPATIBLE:
        'La duración del turno debe ser menor o igual al intervalo horario',
    AGENDA_SUPERPUESTA:
        'Ya existe una agenda activa para el profesional en ese día y horario',
    TURNOS_FUTUROS_AFECTADOS:
        'La agenda tiene turnos futuros que quedarían fuera de la nueva disponibilidad',
    TURNOS_FUTUROS_PENDIENTES:
        'No se puede desactivar la agenda porque tiene turnos futuros registrados',
} as const


const DIAS_SEMANA: readonly DiaSemana[] = [
    'LUNES',
    'MARTES',
    'MIERCOLES',
    'JUEVES',
    'VIERNES',
    'SABADO',
    'DOMINGO',
]

// getUTCDay() devuelve 0=domingo ... 6=sábado.
// Este array traduce ese índice al ENUM usado por el modelo Agenda.
const DIAS_POR_INDICE: readonly DiaSemana[] = [
    'DOMINGO',
    'LUNES',
    'MARTES',
    'MIERCOLES',
    'JUEVES',
    'VIERNES',
    'SABADO',
]

// Acepta HH:mm y HH:mm:ss. Los segundos se descartan al normalizar
// porque PostgreSQL los agrega al leer columnas DataTypes.TIME.
const HORA_REGEX = /^([01]\d|2[0-3]):([0-5]\d)(?::[0-5]\d)?$/

/**
 * Incluye únicamente información pública del profesional.
 * Nunca se incluye Usuario para evitar exponer datos sensibles.
 */
function incluirProfesional() {
    return {
        model: Profesional,
        as: 'profesional',
        attributes: ['id', 'nombre', 'apellido', 'matricula', 'especialidad'],
    }
}

/**
 * Valida que un identificador sea un entero positivo.
 */
function validarIdentificador(valor: unknown, nombreCampo: string): number {
    if (typeof valor !== 'number' || !Number.isInteger(valor) || valor <= 0) {
        throw new AppError(
            400,
            `El ${nombreCampo} debe ser un número entero positivo`,
        )
    }

    return valor
}

/**
 * Verifica que el valor pertenezca al ENUM de días del modelo.
 */
function esDiaSemanaValido(valor: unknown): valor is DiaSemana {
    return (
        typeof valor === 'string' &&
        (DIAS_SEMANA as readonly string[]).includes(valor)
    )
}

/**
 * Convierte una hora HH:mm o HH:mm:ss a minutos desde las 00:00.
 * Devuelve null si el formato no es válido.
 */
function horaAMinutos(valor: unknown): number | null {
    if (typeof valor !== 'string') {
        return null
    }

    const coincidencia = HORA_REGEX.exec(valor)

    if (!coincidencia) {
        return null
    }

    const horasTexto = coincidencia[1]
    const minutosTexto = coincidencia[2]

    if (horasTexto === undefined || minutosTexto === undefined) {
        return null
    }

    return Number(horasTexto) * 60 + Number(minutosTexto)
}

// Valida el formato de una hora y la devuelve siempre como HH:mm.
function normalizarHora(valor: unknown, nombreCampo: string): string {
    if (typeof valor !== 'string' || horaAMinutos(valor) === null) {
        throw new AppError(
            400,
            `${MENSAJES_AGENDA.HORA_INVALIDA} (${nombreCampo})`,
        )
    }

    return valor.slice(0, 5)
}

/**
 * Valida y normaliza un bloque horario.
 *
 * Reglas:
 * - día perteneciente al ENUM;
 * - horas en formato HH:mm;
 * - horaInicio anterior a horaFin;
 * - duración entera y positiva;
 * - duración menor o igual al intervalo total.
 */
function validarHorario(
    diaSemana: unknown,
    horaInicio: unknown,
    horaFin: unknown,
    duracionTurno: unknown,
): HorarioValidado {
    if (!esDiaSemanaValido(diaSemana)) {
        throw new AppError(400, MENSAJES_AGENDA.DIA_SEMANA_INVALIDO)
    }

    const horaInicioNormalizada = normalizarHora(horaInicio, 'horaInicio')
    const horaFinNormalizada = normalizarHora(horaFin, 'horaFin')
    const inicioMinutos = horaAMinutos(horaInicioNormalizada)
    const finMinutos = horaAMinutos(horaFinNormalizada)

    if (inicioMinutos === null || finMinutos === null) {
        throw new AppError(400, MENSAJES_AGENDA.HORA_INVALIDA)
    }

    if (inicioMinutos >= finMinutos) {
        throw new AppError(400, MENSAJES_AGENDA.HORARIO_INVALIDO)
    }

    if (
        typeof duracionTurno !== 'number' ||
        !Number.isInteger(duracionTurno) ||
        duracionTurno <= 0
    ) {
        throw new AppError(400, MENSAJES_AGENDA.DURACION_INVALIDA)
    }

    const totalMinutos = finMinutos - inicioMinutos

    if (duracionTurno > totalMinutos) {
        throw new AppError(400, MENSAJES_AGENDA.DURACION_INCOMPATIBLE)
    }

    return {
        diaSemana,
        horaInicio: horaInicioNormalizada,
        horaFin: horaFinNormalizada,
        duracionTurno,
        inicioMinutos,
        finMinutos,
    }
}

//Obtiene el día de la semana de una fecha YYYY-MM-DD.
function diaSemanaDeFecha(fecha: string): DiaSemana | null {
    const fechaNormalizada = fecha.slice(0, 10)
    const fechaParseada = new Date(`${fechaNormalizada}T00:00:00Z`)

    if (Number.isNaN(fechaParseada.getTime())) {
        return null
    }

    return DIAS_POR_INDICE[fechaParseada.getUTCDay()] ?? null
}

/**
 * Indica si un turno sigue siendo válido dentro de un horario.
 *
 * No alcanza con que esté dentro del rango: además debe pertenecer
 * a la grilla que empieza en horaInicio y avanza cada duracionTurno.
 * Así se detectan turnos desalineados o que quedarian superpuestos si cambia la duración.
 */
function turnoDentroDeHorario(
    turno: Turno,
    horario: HorarioValidado,
): boolean {
    if (diaSemanaDeFecha(turno.fecha) !== horario.diaSemana) {
        return false
    }

    const inicioTurno = horaAMinutos(turno.hora)

    if (inicioTurno === null) {
        return false
    }

    if (
        inicioTurno < horario.inicioMinutos ||
        inicioTurno >= horario.finMinutos
    ) {
        return false
    }

    if ((inicioTurno - horario.inicioMinutos) % horario.duracionTurno !== 0) {
        return false
    }

    return inicioTurno + horario.duracionTurno <= horario.finMinutos
}

/**
 * Verifica que no exista otra agenda activa superpuesta.
 *
 * Dos intervalos se superponen si:
 * nuevoInicio < existenteFin && nuevoFin > existenteInicio.
 *
 * Solo se comparan agendas activas: una inactiva no genera disponibilidad.
 * Al actualizar, se excluye la propia agenda mediante Op.ne.
 */
async function verificarSuperposicion(
    profesionalId: number,
    horario: HorarioValidado,
    agendaIdExcluida?: number,
): Promise<void> {
    const filtros = {
        profesionalId,
        diaSemana: horario.diaSemana,
        activo: true,
        horaInicio: { [Op.lt]: horario.horaFin },
        horaFin: { [Op.gt]: horario.horaInicio },
    }

    const superpuesta = await Agenda.findOne({
        where:
            agendaIdExcluida === undefined
                ? filtros
                : { ...filtros, id: { [Op.ne]: agendaIdExcluida } },
    })

    if (superpuesta) {
        throw new AppError(409, MENSAJES_AGENDA.AGENDA_SUPERPUESTA)
    }
}

/**
 * Obtiene los turnos futuros que todavía ocupan un cupo.
 *
 * Solo PENDIENTE y CONFIRMADO bloquean o cancelan la operación.
 * CANCELADO ya liberó el cupo y COMPLETADO no representa un turno futuro.
 */
async function obtenerTurnosFuturos(agendaId: number): Promise<Turno[]> {
    const hoy = new Date().toISOString().slice(0, 10)

    return Turno.findAll({
        where: {
            agendaId,
            fecha: { [Op.gte]: hoy },
            estado: { [Op.in]: ['PENDIENTE', 'CONFIRMADO'] },
        },
        order: [
            ['fecha', 'ASC'],
            ['hora', 'ASC'],
        ],
    })
}

/**
 * Cancela en bloque los turnos indicados.
 */
async function cancelarTurnos(turnos: Turno[]): Promise<void> {
    if (turnos.length === 0) {
        return
    }

    await Turno.update(
        { estado: 'CANCELADO' },
        {
            where: {
                id: {
                    [Op.in]: turnos.map((turno) => turno.id),
                },
            },
        },
    )
}

/**
 * Servicio de administración de agendas médicas.
 */
export class AgendaService {
    /**
     * Lista agendas con filtros opcionales.
     * Incluye únicamente datos públicos del profesional; NUNCA datos de Usuario.
     */
    async listar(filtros: ListarAgendasFiltros = {}): Promise<Agenda[]> {
        const where: { profesionalId?: number; activo?: boolean } = {}

        if (filtros.profesionalId !== undefined) {
            where.profesionalId = validarIdentificador(
                filtros.profesionalId,
                'profesionalId',
            )
        }

        if (filtros.activo !== undefined) {
            if (typeof filtros.activo !== 'boolean') {
                throw new AppError(400, 'El filtro activo debe ser booleano')
            }

            where.activo = filtros.activo
        }

        return Agenda.findAll({
            where,
            include: [incluirProfesional()],
            order: [['id', 'ASC']],
        })
    }

    /**
     * Devuelve la agenda o null si no existe.
     */
    async buscarPorId(id: number): Promise<Agenda | null> {
        return Agenda.findByPk(id, {
            include: [incluirProfesional()],
        })
    }

    /**
     * Lista las agendas de un profesional verificando que exista.
     *
     * El alcance de autorización se valida en el controller:
     * este servicio solo garantiza que filtra por el profesionalId recibido.
     */
    async listarPorProfesional(
        profesionalId: number,
        filtros: ListarAgendasPorProfesionalFiltros = {},
    ): Promise<Agenda[]> {
        const id = validarIdentificador(profesionalId, 'profesionalId')
        const profesional = await Profesional.findByPk(id)

        if (!profesional) {
            throw new AppError(404, MENSAJES.PROFESIONAL_NO_ENCONTRADO)
        }

        const where: { profesionalId: number; activo?: boolean } = {
            profesionalId: id,
        }

        if (filtros.activo !== undefined) {
            if (typeof filtros.activo !== 'boolean') {
                throw new AppError(400, 'El filtro activo debe ser booleano')
            }

            where.activo = filtros.activo
        }

        return Agenda.findAll({
            where,
            include: [incluirProfesional()],
            order: [['id', 'ASC']],
        })
    }

    /**
     * Crea una agenda activa usando el valor por defecto del modelo.
     *
     * Orden de validación:
     * 1. profesionalId;
     * 2. horario y duración;
     * 3. existencia del profesional;
     * 4. superposición con otra agenda activa del mismo profesional y día.
     */
    async crear(datos: DatosAgenda): Promise<Agenda | null> {
        const profesionalId = validarIdentificador(
            datos.profesionalId,
            'profesionalId',
        )

        // Se valida el horario antes de consultar la base, para fallar rápido ante datos inválidos.
        const horario = validarHorario(
            datos.diaSemana,
            datos.horaInicio,
            datos.horaFin,
            datos.duracionTurno,
        )
        const profesional = await Profesional.findByPk(profesionalId)

        if (!profesional) {
            throw new AppError(404, MENSAJES.PROFESIONAL_NO_ENCONTRADO)
        }

        await verificarSuperposicion(profesionalId, horario)

        // No se envía activo: Sequelize usa el default true del modelo
        const agenda = await Agenda.create({
            profesionalId,
            diaSemana: horario.diaSemana,
            horaInicio: horario.horaInicio,
            horaFin: horario.horaFin,
            duracionTurno: horario.duracionTurno,
        })

        return this.buscarPorId(agenda.id)
    }

    /**
     * Actualiza solo día, horaInicio, horaFin y duracionTurno.
     *
     * Si el cambio deja turnos futuros fuera de la nueva disponibilidad:
     * - sin opciones: lanza 409 y no modifica nada;
     * - con cancelarTurnosAfectados: cancela esos turnos y aplica el cambio.
     */
    async actualizar(
        id: number,
        datos: DatosActualizarAgenda,
        opciones: OpcionesActualizarAgenda = {},
    ): Promise<Agenda | null> {
        const agenda = await Agenda.findByPk(id)

        if (!agenda) {
            throw new AppError(404, MENSAJES_AGENDA.AGENDA_NO_ENCONTRADA)
        }

        // Se combinan los datos recibidos con los actuales para validar
        // el horario completo resultante, aunque la actualización sea parcial.
        const diaSemana =
            datos.diaSemana !== undefined
                ? datos.diaSemana
                : agenda.diaSemana
        const horaInicio =
            datos.horaInicio !== undefined
                ? datos.horaInicio
                : agenda.horaInicio
        const horaFin =
            datos.horaFin !== undefined ? datos.horaFin : agenda.horaFin
        const duracionTurno =
            datos.duracionTurno !== undefined
                ? datos.duracionTurno
                : agenda.duracionTurno

        const horario = validarHorario(
            diaSemana,
            horaInicio,
            horaFin,
            duracionTurno,
        )
        const horarioActual = validarHorario(
            agenda.diaSemana,
            agenda.horaInicio,
            agenda.horaFin,
            agenda.duracionTurno,
        )

        // Se comparan horas normalizadas para detectar cambios reales
        // y evitar consultas innecesarias a turnos y superposiciones.
        const cambiaHorario =
            horario.diaSemana !== horarioActual.diaSemana ||
            horario.horaInicio !== horarioActual.horaInicio ||
            horario.horaFin !== horarioActual.horaFin ||
            horario.duracionTurno !== horarioActual.duracionTurno

        if (cambiaHorario) {
            await verificarSuperposicion(
                agenda.profesionalId,
                horario,
                agenda.id,
            )

            const turnosFuturos = await obtenerTurnosFuturos(agenda.id)
            const turnosAfectados = turnosFuturos.filter(
                (turno) => !turnoDentroDeHorario(turno, horario),
            )

            if (turnosAfectados.length > 0) {
                if (opciones.cancelarTurnosAfectados === true) {
                    await cancelarTurnos(turnosAfectados)
                } else {
                    // Política por defecto: no dejar turnos confirmados
                    // fuera de la disponibilidad sin resolución explícita.
                    throw new AppError(
                        409,
                        `${MENSAJES_AGENDA.TURNOS_FUTUROS_AFECTADOS}. Cancelá o reprogramá esos turnos antes de continuar`,
                    )
                }
            }

            agenda.diaSemana = horario.diaSemana
            agenda.horaInicio = horario.horaInicio
            agenda.horaFin = horario.horaFin
            agenda.duracionTurno = horario.duracionTurno

            await agenda.save()
        }

        return this.buscarPorId(id)
    }

    /**
     * Desactiva una agenda. Es idempotente (se puede llamar varias veces sin efecto, por ejemplo, que ya esté desactivada).
     *
     * Si existen turnos futuros pendientes o confirmados:
     * - sin opciones: lanza 409;
     * - con cancelarTurnosFuturos: los cancela y luego desactiva la agenda.
     *
     * Una agenda inactiva no genera nuevos turnos porque el modelo Agenda
     * devuelve disponibilidad 0/false cuando activo es false.
     */
    async desactivar(
        id: number,
        opciones: OpcionesDesactivarAgenda = {},
    ): Promise<Agenda | null> {
        const agenda = await Agenda.findByPk(id)

        if (!agenda) {
            throw new AppError(404, MENSAJES_AGENDA.AGENDA_NO_ENCONTRADA)
        }

        // Si ya está inactiva no hace falta volver a guardarla.
        if (!agenda.activo) {
            return this.buscarPorId(id)
        }

        const turnosFuturos = await obtenerTurnosFuturos(agenda.id)

        if (turnosFuturos.length > 0) {
            if (opciones.cancelarTurnosFuturos === true) {
                await cancelarTurnos(turnosFuturos)
            } else {
                // Política por defecto: no desactivar una agenda
                // que todavía tiene turnos futuros sin resolver.
                throw new AppError(
                    409,
                    `${MENSAJES_AGENDA.TURNOS_FUTUROS_PENDIENTES}. Cancelá o reprogramá esos turnos antes de continuar`,
                )
            }
        }

        agenda.activo = false

        await agenda.save()

        return this.buscarPorId(id)
    }
}

export const agendaService = new AgendaService()