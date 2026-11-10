import { Op } from 'sequelize'
import {
    Espacio,
    AsignacionEspacio,
    Profesional,
    TarifaEspacios,
} from '../models/index.js'
import { AppError } from '../errors/AppError.js'
import { esFechaValida, esTextoValido } from '../utils/validacion.js'
import { validarEnteroPositivo } from '../utils/validarId.js'
import { TIPOS_ESPACIO } from '../types/TipoEspacio.js'
import type { TipoEspacio } from '../types/TipoEspacio.js'
import { UBICACIONES_ESPACIO } from '../types/UbicacionEspacio.js'
import type { UbicacionEspacio } from '../types/UbicacionEspacio.js'

export interface ListarEspaciosFiltros {
    activo?: boolean
    tipo?: TipoEspacio
    ubicacion?: UbicacionEspacio
}

export interface DatosEspacio {
    nombre: string
    tipo: TipoEspacio
    ubicacion: UbicacionEspacio
}

export type DatosActualizarEspacio = Partial<DatosEspacio>

const MENSAJES_ESPACIO = {
    ESPACIO_NO_ENCONTRADO: 'Espacio no encontrado',
    NOMBRE_INVALIDO:
        'El nombre del espacio debe tener entre 1 y 100 caracteres',
    TIPO_INVALIDO: 'El tipo de espacio no es válido',
    UBICACION_INVALIDA: 'La ubicación del espacio no es válida',
    ACTIVO_INVALIDO: 'El filtro activo debe ser booleano',
    SIN_DATOS_ACTUALIZAR: 'No hay datos para actualizar',
    FECHA_INVALIDA: 'Las fechas deben tener el formato YYYY-MM-DD',
    RANGO_FECHAS_INVALIDO:
        'La fecha de inicio no puede ser posterior a la fecha de fin',
    ESPACIO_CON_DEPENDENCIAS:
        'No se puede eliminar el espacio porque tiene asignaciones o tarifas asociadas. Podés desactivarlo en su lugar',
} as const

function validarNombre(valor: unknown): string {
    if (!esTextoValido(valor, 1, 100)) {
        throw new AppError(400, MENSAJES_ESPACIO.NOMBRE_INVALIDO)
    }

    return valor.trim()
}

function esTipoEspacioValido(valor: unknown): valor is TipoEspacio {
    return (
        typeof valor === 'string' &&
        (TIPOS_ESPACIO as readonly string[]).includes(valor)
    )
}

function validarTipo(valor: unknown): TipoEspacio {
    if (!esTipoEspacioValido(valor)) {
        throw new AppError(400, MENSAJES_ESPACIO.TIPO_INVALIDO)
    }

    return valor
}

function esUbicacionEspacioValida(valor: unknown): valor is UbicacionEspacio {
    return (
        typeof valor === 'string' &&
        (UBICACIONES_ESPACIO as readonly string[]).includes(valor)
    )
}

function validarUbicacion(valor: unknown): UbicacionEspacio {
    if (!esUbicacionEspacioValida(valor)) {
        throw new AppError(400, MENSAJES_ESPACIO.UBICACION_INVALIDA)
    }

    return valor
}

async function obtenerOcupacion(
    fechaInicio: string,
    fechaFin: string,
): Promise<Espacio[]> {
    if (!esFechaValida(fechaInicio) || !esFechaValida(fechaFin)) {
        throw new AppError(400, MENSAJES_ESPACIO.FECHA_INVALIDA)
    }

    if (fechaInicio > fechaFin) {
        throw new AppError(400, MENSAJES_ESPACIO.RANGO_FECHAS_INVALIDO)
    }

    return Espacio.findAll({
        include: [
            {
                model: AsignacionEspacio,
                as: 'asignaciones',
                required: false,
                where: {
                    [Op.or]: [
                        { tipo: 'FIJA' },
                        {
                            tipo: 'ESPECIFICA',
                            fecha: {
                                [Op.between]: [fechaInicio, fechaFin],
                            },
                        },
                    ],
                },
                include: [
                    {
                        model: Profesional,
                        as: 'profesional',
                        attributes: ['id', 'nombre', 'apellido'],
                    },
                ],
            },
        ],
        order: [['id', 'ASC']],
    })
}

export class EspacioService {
    async listar(filtros: ListarEspaciosFiltros = {}): Promise<Espacio[]> {
        const where: {
            activo?: boolean
            tipo?: TipoEspacio
            ubicacion?: UbicacionEspacio
        } = {}

        if (filtros.activo !== undefined) {
            if (typeof filtros.activo !== 'boolean') {
                throw new AppError(400, MENSAJES_ESPACIO.ACTIVO_INVALIDO)
            }

            where.activo = filtros.activo
        }

        if (filtros.tipo !== undefined) {
            where.tipo = validarTipo(filtros.tipo)
        }

        if (filtros.ubicacion !== undefined) {
            where.ubicacion = validarUbicacion(filtros.ubicacion)
        }

        return Espacio.findAll({
            where,
            order: [['id', 'ASC']],
        })
    }

    async buscarPorId(id: number): Promise<Espacio | null> {
        return Espacio.findByPk(validarEnteroPositivo(id, 'ID del espacio'))
    }

    async crear(datos: DatosEspacio): Promise<Espacio | null> {
        if (!datos || typeof datos !== 'object') {
            throw new AppError(400, 'Datos del espacio inválidos')
        }

        const espacio = await Espacio.create({
            nombre: validarNombre(datos.nombre),
            tipo: validarTipo(datos.tipo),
            ubicacion: validarUbicacion(datos.ubicacion),
        })

        return this.buscarPorId(espacio.id)
    }

    async actualizar(
        id: number,
        datos: DatosActualizarEspacio,
    ): Promise<Espacio | null> {
        const idValidado = validarEnteroPositivo(id, 'ID del espacio')

        if (!datos || Object.keys(datos).length === 0) {
            throw new AppError(400, MENSAJES_ESPACIO.SIN_DATOS_ACTUALIZAR)
        }

        const espacio = await Espacio.findByPk(idValidado)

        if (!espacio) {
            throw new AppError(404, MENSAJES_ESPACIO.ESPACIO_NO_ENCONTRADO)
        }

        if (datos.nombre !== undefined) {
            espacio.nombre = validarNombre(datos.nombre)
        }

        if (datos.tipo !== undefined) {
            espacio.tipo = validarTipo(datos.tipo)
        }

        if (datos.ubicacion !== undefined) {
            espacio.ubicacion = validarUbicacion(datos.ubicacion)
        }

        await espacio.save()

        return this.buscarPorId(idValidado)
    }

    async desactivar(id: number): Promise<Espacio | null> {
        const idValidado = validarEnteroPositivo(id, 'ID del espacio')
        const espacio = await Espacio.findByPk(idValidado)

        if (!espacio) {
            throw new AppError(404, MENSAJES_ESPACIO.ESPACIO_NO_ENCONTRADO)
        }

        if (!espacio.activo) {
            return this.buscarPorId(idValidado)
        }

        espacio.activo = false

        await espacio.save()

        return this.buscarPorId(idValidado)
    }

    async reactivar(id: number): Promise<Espacio | null> {
        const idValidado = validarEnteroPositivo(id, 'ID del espacio')
        const espacio = await Espacio.findByPk(idValidado)

        if (!espacio) {
            throw new AppError(404, MENSAJES_ESPACIO.ESPACIO_NO_ENCONTRADO)
        }

        if (espacio.activo) {
            return this.buscarPorId(idValidado)
        }

        espacio.activo = true

        await espacio.save()

        return this.buscarPorId(idValidado)
    }

    async eliminar(id: number): Promise<void> {
        const idValidado = validarEnteroPositivo(id, 'ID del espacio')
        const espacio = await Espacio.findByPk(idValidado)

        if (!espacio) {
            throw new AppError(404, MENSAJES_ESPACIO.ESPACIO_NO_ENCONTRADO)
        }

        const [asignaciones, tarifas] = await Promise.all([
            AsignacionEspacio.count({ where: { espacioId: idValidado } }),
            TarifaEspacios.count({ where: { espacioId: idValidado } }),
        ])

        if (asignaciones > 0 || tarifas > 0) {
            throw new AppError(409, MENSAJES_ESPACIO.ESPACIO_CON_DEPENDENCIAS)
        }

        await espacio.destroy()
    }

    async obtenerOcupacion(
        fechaInicio: string,
        fechaFin: string,
    ): Promise<Espacio[]> {
        return obtenerOcupacion(fechaInicio, fechaFin)
    }
}

export const espacioService = new EspacioService()

export { obtenerOcupacion }

export default obtenerOcupacion
