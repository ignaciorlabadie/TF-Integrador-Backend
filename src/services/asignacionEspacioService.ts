import { AsignacionEspacio, Espacio, Profesional } from '../models/index.js'
import { AppError } from '../errors/AppError.js'
import type { TipoAsignacionEspacio } from '../types/TipoAsignacionEspacio.js'

export interface ListarAsignacionesEspacioFiltros {
    espacioId?: number
    profesionalId?: number
    tipo?: TipoAsignacionEspacio
}

const TIPOS_ASIGNACION: readonly TipoAsignacionEspacio[] = [
    'FIJA',
    'ESPECIFICA',
]

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
}

export const asignacionEspacioService = new AsignacionEspacioService()
