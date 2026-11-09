import { Op, type WhereOptions } from 'sequelize'
import { AsignacionEspacio, Espacio, Profesional } from '../models/index.js'
import { AppError } from '../errors/AppError.js'
import { DIAS_SEMANA } from '../types/DiaSemana.js'
import type { DiaSemana } from '../types/DiaSemana.js'
import { TIPOS_ASIGNACION } from '../types/TipoAsignacionEspacio.js'
import type { TipoAsignacionEspacio } from '../types/TipoAsignacionEspacio.js'
import { diaSemanaDeFecha, horaAMinutos, normalizarHora } from '../utils/horarios.js'
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
    SOLAPAMIENTO:
        'La asignación se superpone con otra existente para el espacio y/o profesional',
    ASIGNACION_NO_ENCONTRADA: 'Asignación no encontrada',
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

function diaDeAsignacion(asignacion: AsignacionEspacio): DiaSemana | null {
    if (asignacion.tipo === 'FIJA') {
        return asignacion.diaSemana
    }

    return asignacion.fecha ? diaSemanaDeFecha(asignacion.fecha) : null
}

function haySolapamiento(
    inicioA: number,
    finA: number,
    inicioB: number,
    finB: number,
): boolean {
    return inicioA < finB && finA > inicioB
}

async function verificarSolapamiento(
    datos: DatosAsignacionValidados,
    idExcluir?: number,
): Promise<void> {
    const where = {
        [Op.or]: [
            { espacioId: datos.espacioId },
            { profesionalId: datos.profesionalId },
        ],
        ...(idExcluir === undefined ? {} : { id: { [Op.ne]: idExcluir } }),
    } as WhereOptions

    const candidatas = await AsignacionEspacio.findAll({ where })

    const diaNuevo =
        datos.tipo === 'FIJA'
            ? datos.diaSemana
            : datos.fecha
              ? diaSemanaDeFecha(datos.fecha)
              : null

    const inicioNuevo = horaAMinutos(datos.horaInicio)
    const finNuevo = horaAMinutos(datos.horaFin)

    if (diaNuevo === null || inicioNuevo === null || finNuevo === null) {
        return
    }

    const conflicto = candidatas.some((candidata) => {
        if (idExcluir !== undefined && candidata.id === idExcluir) {
            return false
        }

        if (diaDeAsignacion(candidata) !== diaNuevo) {
            return false
        }

        const inicioCandidata = horaAMinutos(candidata.horaInicio)
        const finCandidata = horaAMinutos(candidata.horaFin)

        if (inicioCandidata === null || finCandidata === null) {
            return false
        }

        return haySolapamiento(
            inicioNuevo,
            finNuevo,
            inicioCandidata,
            finCandidata,
        )
    })

    if (conflicto) {
        throw new AppError(409, MENSAJES_ASIGNACION.SOLAPAMIENTO)
    }
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

    const horaInicio = normalizarHora(
        datos.horaInicio,
        'horaInicio',
        MENSAJES_ASIGNACION.HORA_INVALIDA,
    )
    const horaFin = normalizarHora(
        datos.horaFin,
        'horaFin',
        MENSAJES_ASIGNACION.HORA_INVALIDA,
    )
    
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

        await verificarSolapamiento(datosValidados)

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

    async actualizar(
        id: number,
        datos: DatosAsignacionEspacio,
    ): Promise<AsignacionEspacio | null> {
        const idValidado = validarIdentificador(id, 'ID de la asignación')

        const existente = await AsignacionEspacio.findByPk(idValidado)

        if (!existente) {
            throw new AppError(
                404,
                MENSAJES_ASIGNACION.ASIGNACION_NO_ENCONTRADA,
            )
        }

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

        await verificarSolapamiento(datosValidados, idValidado)

        await AsignacionEspacio.update(
            {
                espacioId: datosValidados.espacioId,
                profesionalId: datosValidados.profesionalId,
                tipo: datosValidados.tipo,
                diaSemana: datosValidados.diaSemana,
                fecha: datosValidados.fecha,
                horaInicio: datosValidados.horaInicio,
                horaFin: datosValidados.horaFin,
            },
            { where: { id: idValidado } },
        )

        return this.buscarPorId(idValidado)
    }

    async eliminar(id: number): Promise<void> {
        const idValidado = validarIdentificador(id, 'ID de la asignación')

        const existente = await AsignacionEspacio.findByPk(idValidado)

        if (!existente) {
            throw new AppError(
                404,
                MENSAJES_ASIGNACION.ASIGNACION_NO_ENCONTRADA,
            )
        }

        await AsignacionEspacio.destroy({ where: { id: idValidado } })
    }
}

export const asignacionEspacioService = new AsignacionEspacioService()
