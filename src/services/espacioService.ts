import { Op } from 'sequelize'
import {
    Espacio,
    AsignacionEspacio,
    Profesional,
    TarifaEspacios,
} from '../models/index.js'
import { AppError } from '../errors/AppError.js'
import { MENSAJES } from '../errors/mensajes.js'
import { esFechaValida, esTextoValido } from '../utils/validacion.js'
import { validarEnteroPositivo } from '../utils/validarId.js'
import type { TipoEspacio } from '../types/TipoEspacio.js'
import type { UbicacionEspacio } from '../types/UbicacionEspacio.js'
import {
    esTipoEspacioValido,
    esUbicacionEspacioValida,
} from '../utils/validacionesEntidades.js'

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

function validarNombre(valor: unknown): string {
    if (!esTextoValido(valor, 1, 100)) {
        throw new AppError(400, MENSAJES.NOMBRE_ESPACIO_INVALIDO)
    }

    return valor.trim()
}

function validarTipo(valor: unknown): TipoEspacio {
    if (!esTipoEspacioValido(valor)) {
        throw new AppError(400, MENSAJES.TIPO_ESPACIO_INVALIDO)
    }

    return valor
}

function validarUbicacion(valor: unknown): UbicacionEspacio {
    if (!esUbicacionEspacioValida(valor)) {
        throw new AppError(400, MENSAJES.UBICACION_ESPACIO_INVALIDA)
    }

    return valor
}

async function obtenerOcupacion(
    fechaInicio: string,
    fechaFin: string,
): Promise<Espacio[]> {
    if (!esFechaValida(fechaInicio) || !esFechaValida(fechaFin)) {
        throw new AppError(400, MENSAJES.ESPACIO_FECHAS_INVALIDAS)
    }

    if (fechaInicio > fechaFin) {
        throw new AppError(400, MENSAJES.RANGO_FECHAS_INVALIDO)
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
    private async cambiarActivo(
        id: number,
        activo: boolean,
    ): Promise<Espacio | null> {
        const idValidado = validarEnteroPositivo(id, 'ID del espacio')
        const espacio = await Espacio.findByPk(idValidado)

        if (!espacio) {
            throw new AppError(404, MENSAJES.ESPACIO_NO_ENCONTRADO)
        }

        if (espacio.activo === activo) {
            return this.buscarPorId(idValidado)
        }

        espacio.activo = activo

        await espacio.save()

        return this.buscarPorId(idValidado)
    }

    async listar(filtros: ListarEspaciosFiltros = {}): Promise<Espacio[]> {
        const where: {
            activo?: boolean
            tipo?: TipoEspacio
            ubicacion?: UbicacionEspacio
        } = {}

        if (filtros.activo !== undefined) {
            if (typeof filtros.activo !== 'boolean') {
                throw new AppError(400, MENSAJES.FILTRO_ACTIVO_INVALIDO)
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
            throw new AppError(400, MENSAJES.ESPACIO_DATOS_INVALIDOS)
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
            throw new AppError(400, MENSAJES.SIN_DATOS_ACTUALIZAR)
        }

        const espacio = await Espacio.findByPk(idValidado)

        if (!espacio) {
            throw new AppError(404, MENSAJES.ESPACIO_NO_ENCONTRADO)
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
        return this.cambiarActivo(id, false)
    }

    async reactivar(id: number): Promise<Espacio | null> {
        return this.cambiarActivo(id, true)
    }

    async eliminar(id: number): Promise<void> {
        const idValidado = validarEnteroPositivo(id, 'ID del espacio')
        const espacio = await Espacio.findByPk(idValidado)

        if (!espacio) {
            throw new AppError(404, MENSAJES.ESPACIO_NO_ENCONTRADO)
        }

        const [asignaciones, tarifas] = await Promise.all([
            AsignacionEspacio.count({ where: { espacioId: idValidado } }),
            TarifaEspacios.count({ where: { espacioId: idValidado } }),
        ])

        if (asignaciones > 0 || tarifas > 0) {
            throw new AppError(409, MENSAJES.ESPACIO_CON_DEPENDENCIAS)
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