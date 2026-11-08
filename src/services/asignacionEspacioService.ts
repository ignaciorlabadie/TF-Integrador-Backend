import { AsignacionEspacio, Espacio, Profesional } from '../models/index.js'
import { AppError } from '../errors/AppError.js'
import type { DiaSemana } from '../types/DiaSemana.js'
import type { TipoAsignacionEspacio } from '../types/TipoAsignacionEspacio.js'
import { esFechaValida } from '../utils/validacion.js'

export interface ListarAsignacionesEspacioFiltros {
    espacioId?: number
    profesionalId?: number
    tipo?: TipoAsignacionEspacio
}

export interface DatosAsignacionEspacio {
    espacioId: number
    profesionalId: number
    tipo: TipoAsignacionEspacio
    diaSemana?: DiaSemana | null
    fecha?: string | null
    horaInicio: string
    horaFin: string
}

interface DatosAsignacionValidados {
    espacioId: number
    profesionalId: number
    tipo: TipoAsignacionEspacio
    diaSemana: DiaSemana | null
    fecha: string | null
    horaInicio: string
    horaFin: string
}

const TIPOS_ASIGNACION: readonly TipoAsignacionEspacio[] = [
    'FIJA',
    'ESPECIFICA',
]

const DIAS_SEMANA: readonly DiaSemana[] = [
    'LUNES',
    'MARTES',
    'MIERCOLES',
    'JUEVES',
    'VIERNES',
    'SABADO',
    'DOMINGO',
]

const HORA_REGEX = /^([01]\d|2[0-3]):([0-5]\d)(?::[0-5]\d)?$/

const MENSAJES_ASIGNACION = {
    DATOS_INVALIDOS: 'Datos de la asignación inválidos',
    TIPO_INVALIDO: 'El tipo de asignación no es válido',
    HORA_INVALIDA: 'La hora debe tener formato HH:mm',
    HORARIO_INVALIDO: 'La hora de inicio debe ser anterior a la hora de fin',
    DIA_SEMANA_INVALIDO: 'El día de la semana no es válido',
    FIJA_CON_FECHA: 'Una asignación FIJA no puede tener fecha',
    FECHA_INVALIDA: 'La fecha debe tener formato YYYY-MM-DD',
    ESPECIFICA_CON_DIA:
        'Una asignación ESPECIFICA no puede tener día de semana',
    FECHA_PASADA: 'La fecha de la asignación no puede ser pasada',
    ESPACIO_NO_ENCONTRADO: 'Espacio no encontrado',
    ESPACIO_INACTIVO: 'No se puede asignar un espacio inactivo',
    PROFESIONAL_NO_ENCONTRADO: 'Profesional no encontrado',
} as const

function validarIdentificador(valor: unknown, nombreCampo: string): number {
    if (typeof valor !== 'number' || !Number.isInteger(valor) || valor <= 0) {
        throw new AppError(
            400,
            `El ${nombreCampo} debe ser un número entero positivo`,
        )
    }

    return valor
}

function esTipoValido(valor: unknown): valor is TipoAsignacionEspacio {
    return (
        typeof valor === 'string' &&
        (TIPOS_ASIGNACION as readonly string[]).includes(valor)
    )
}

function esDiaSemanaValido(valor: unknown): valor is DiaSemana {
    return (
        typeof valor === 'string' &&
        (DIAS_SEMANA as readonly string[]).includes(valor)
    )
}

function horaAMinutos(valor: string): number | null {
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

function normalizarHora(valor: unknown, nombreCampo: string): string {
    if (typeof valor !== 'string' || horaAMinutos(valor) === null) {
        throw new AppError(
            400,
            `${MENSAJES_ASIGNACION.HORA_INVALIDA} (${nombreCampo})`,
        )
    }

    return valor.slice(0, 5)
}

function incluirRelaciones() {
    return [
        {
            model: Espacio,
            as: 'espacio',
            attributes: ['id', 'nombre', 'tipo', 'ubicacion', 'activo'],
        },
        {
            model: Profesional,
            as: 'profesional',
            attributes: ['id', 'nombre', 'apellido'],
        },
    ]
}

function validarDatosCreacion(
    datos: DatosAsignacionEspacio,
): DatosAsignacionValidados {
    if (!datos || typeof datos !== 'object') {
        throw new AppError(400, MENSAJES_ASIGNACION.DATOS_INVALIDOS)
    }

    const espacioId = validarIdentificador(datos.espacioId, 'ID del espacio')
    const profesionalId = validarIdentificador(
        datos.profesionalId,
        'ID del profesional',
    )

    if (!esTipoValido(datos.tipo)) {
        throw new AppError(400, MENSAJES_ASIGNACION.TIPO_INVALIDO)
    }

    const horaInicio = normalizarHora(datos.horaInicio, 'horaInicio')
    const horaFin = normalizarHora(datos.horaFin, 'horaFin')
    const inicioMinutos = horaAMinutos(horaInicio)
    const finMinutos = horaAMinutos(horaFin)

    if (inicioMinutos === null || finMinutos === null) {
        throw new AppError(400, MENSAJES_ASIGNACION.HORA_INVALIDA)
    }

    if (inicioMinutos >= finMinutos) {
        throw new AppError(400, MENSAJES_ASIGNACION.HORARIO_INVALIDO)
    }

    if (datos.tipo === 'FIJA') {
        if (!esDiaSemanaValido(datos.diaSemana)) {
            throw new AppError(400, MENSAJES_ASIGNACION.DIA_SEMANA_INVALIDO)
        }

        if (datos.fecha !== null && datos.fecha !== undefined) {
            throw new AppError(400, MENSAJES_ASIGNACION.FIJA_CON_FECHA)
        }

        return {
            espacioId,
            profesionalId,
            tipo: 'FIJA',
            diaSemana: datos.diaSemana,
            fecha: null,
            horaInicio,
            horaFin,
        }
    }

    const fecha = datos.fecha

    if (!fecha || !esFechaValida(fecha)) {
        throw new AppError(400, MENSAJES_ASIGNACION.FECHA_INVALIDA)
    }

    if (datos.diaSemana !== null && datos.diaSemana !== undefined) {
        throw new AppError(400, MENSAJES_ASIGNACION.ESPECIFICA_CON_DIA)
    }

    const hoy = new Date().toISOString().slice(0, 10)

    if (fecha < hoy) {
        throw new AppError(400, MENSAJES_ASIGNACION.FECHA_PASADA)
    }

    return {
        espacioId,
        profesionalId,
        tipo: 'ESPECIFICA',
        diaSemana: null,
        fecha,
        horaInicio,
        horaFin,
    }
}

export class AsignacionEspacioService {
    async listar(
        filtros: ListarAsignacionesEspacioFiltros = {},
    ): Promise<AsignacionEspacio[]> {
        const where: Record<string, unknown> = {}

        if (filtros.espacioId !== undefined) {
            where.espacioId = validarIdentificador(
                filtros.espacioId,
                'ID del espacio',
            )
        }

        if (filtros.profesionalId !== undefined) {
            where.profesionalId = validarIdentificador(
                filtros.profesionalId,
                'ID del profesional',
            )
        }

        if (filtros.tipo !== undefined) {
            if (!esTipoValido(filtros.tipo)) {
                throw new AppError(400, 'El tipo de asignación no es válido')
            }

            where.tipo = filtros.tipo
        }

        return AsignacionEspacio.findAll({
            where,
            include: incluirRelaciones(),
            order: [['id', 'ASC']],
        })
    }

    async buscarPorId(id: number): Promise<AsignacionEspacio | null> {
        return AsignacionEspacio.findByPk(
            validarIdentificador(id, 'ID de la asignación'),
            { include: incluirRelaciones() },
        )
    }

    async crear(
        datos: DatosAsignacionEspacio,
    ): Promise<AsignacionEspacio | null> {
        const datosValidados = validarDatosCreacion(datos)

        const espacio = await Espacio.findByPk(datosValidados.espacioId)

        if (!espacio) {
            throw new AppError(404, MENSAJES_ASIGNACION.ESPACIO_NO_ENCONTRADO)
        }

        if (!espacio.activo) {
            throw new AppError(409, MENSAJES_ASIGNACION.ESPACIO_INACTIVO)
        }

        const profesional = await Profesional.findByPk(
            datosValidados.profesionalId,
        )

        if (!profesional) {
            throw new AppError(
                404,
                MENSAJES_ASIGNACION.PROFESIONAL_NO_ENCONTRADO,
            )
        }

        const asignacion = await AsignacionEspacio.create({
            espacioId: datosValidados.espacioId,
            profesionalId: datosValidados.profesionalId,
            tipo: datosValidados.tipo,
            diaSemana: datosValidados.diaSemana,
            fecha: datosValidados.fecha,
            horaInicio: datosValidados.horaInicio,
            horaFin: datosValidados.horaFin,
        })

        return this.buscarPorId(asignacion.id)
    }
}

export const asignacionEspacioService = new AsignacionEspacioService()
