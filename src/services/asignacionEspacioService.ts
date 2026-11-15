import { Op, type WhereOptions } from 'sequelize'
import { AsignacionEspacio, Espacio, Profesional } from '../models/index.js'
import { AppError } from '../errors/AppError.js'
import { MENSAJES } from '../errors/mensajes.js'
import type { DiaSemana } from '../types/DiaSemana.js'
import type { TipoAsignacionEspacio } from '../types/TipoAsignacionEspacio.js'
import {
    diaSemanaDeFecha,
    horaAMinutos,
    validarBloqueHorario,
} from '../utils/horarios.js'
import { validarFechaNoPasada } from '../utils/validacion.js'
import {
    esTipoAsignacionValido,
    validarDiaSemana,
    validarTipoAsignacion,
} from '../utils/validacionesEntidades.js'
import { validarEnteroPositivo } from '../utils/validarId.js'

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
        throw new AppError(409, MENSAJES.ASIGNACION_SUPERPUESTA)
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
        throw new AppError(400, MENSAJES.ASIGNACION_DATOS_INVALIDOS)
    }

    const espacioId = validarEnteroPositivo(datos.espacioId, 'ID del espacio')
    const profesionalId = validarEnteroPositivo(
        datos.profesionalId,
        'ID del profesional',
    )
    const tipo = validarTipoAsignacion(datos.tipo)
    const bloque = validarBloqueHorario(datos.horaInicio, datos.horaFin)

    if (tipo === 'FIJA') {
        const diaSemana = validarDiaSemana(datos.diaSemana)

        if (datos.fecha !== null && datos.fecha !== undefined) {
            throw new AppError(400, MENSAJES.ASIGNACION_FIJA_CON_FECHA)
        }

        return {
            espacioId,
            profesionalId,
            tipo,
            diaSemana,
            fecha: null,
            horaInicio: bloque.horaInicio,
            horaFin: bloque.horaFin,
        }
    }

    if (datos.diaSemana !== null && datos.diaSemana !== undefined) {
        throw new AppError(400, MENSAJES.ASIGNACION_ESPECIFICA_CON_DIA)
    }

    const fecha = validarFechaNoPasada(datos.fecha)

    return {
        espacioId,
        profesionalId,
        tipo,
        diaSemana: null,
        fecha,
        horaInicio: bloque.horaInicio,
        horaFin: bloque.horaFin,
    }
}

export class AsignacionEspacioService {
    async listar(
        filtros: ListarAsignacionesEspacioFiltros = {},
    ): Promise<AsignacionEspacio[]> {
        const where: Record<string, unknown> = {}

        if (filtros.espacioId !== undefined) {
            where.espacioId = validarEnteroPositivo(
                filtros.espacioId,
                'ID del espacio',
            )
        }

        if (filtros.profesionalId !== undefined) {
            where.profesionalId = validarEnteroPositivo(
                filtros.profesionalId,
                'ID del profesional',
            )
        }

        if (filtros.tipo !== undefined) {
            if (!esTipoAsignacionValido(filtros.tipo)) {
                throw new AppError(400, MENSAJES.TIPO_ASIGNACION_INVALIDO)
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
            validarEnteroPositivo(id, 'ID de la asignación'),
            { include: incluirRelaciones() },
        )
    }

    async crear(
        datos: DatosAsignacionEspacio,
    ): Promise<AsignacionEspacio | null> {
        const datosValidados = validarDatosCreacion(datos)

        const espacio = await Espacio.findByPk(datosValidados.espacioId)

        if (!espacio) {
            throw new AppError(404, MENSAJES.ESPACIO_NO_ENCONTRADO)
        }

        if (!espacio.activo) {
            throw new AppError(409, MENSAJES.ESPACIO_INACTIVO)
        }

        const profesional = await Profesional.findByPk(
            datosValidados.profesionalId,
        )

        if (!profesional) {
            throw new AppError(404, MENSAJES.PROFESIONAL_NO_ENCONTRADO)
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
        const idValidado = validarEnteroPositivo(id, 'ID de la asignación')

        const existente = await AsignacionEspacio.findByPk(idValidado)

        if (!existente) {
            throw new AppError(404, MENSAJES.ASIGNACION_NO_ENCONTRADA)
        }

        const datosValidados = validarDatosCreacion(datos)

        const espacio = await Espacio.findByPk(datosValidados.espacioId)

        if (!espacio) {
            throw new AppError(404, MENSAJES.ESPACIO_NO_ENCONTRADO)
        }

        if (!espacio.activo) {
            throw new AppError(409, MENSAJES.ESPACIO_INACTIVO)
        }

        const profesional = await Profesional.findByPk(
            datosValidados.profesionalId,
        )

        if (!profesional) {
            throw new AppError(404, MENSAJES.PROFESIONAL_NO_ENCONTRADO)
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
        const idValidado = validarEnteroPositivo(id, 'ID de la asignación')

        const existente = await AsignacionEspacio.findByPk(idValidado)

        if (!existente) {
            throw new AppError(404, MENSAJES.ASIGNACION_NO_ENCONTRADA)
        }

        await AsignacionEspacio.destroy({ where: { id: idValidado } })
    }
}

export const asignacionEspacioService = new AsignacionEspacioService()
