import type { NextFunction, Request, Response } from 'express'

import { espacioService } from '../services/espacioService.js'
import type {
    DatosActualizarEspacio,
    DatosEspacio,
    ListarEspaciosFiltros,
} from '../services/espacioService.js'
import { AppError } from '../errors/AppError.js'
import { TIPOS_ESPACIO } from '../types/TipoEspacio.js'
import type { TipoEspacio } from '../types/TipoEspacio.js'
import { UBICACIONES_ESPACIO } from '../types/UbicacionEspacio.js'
import type { UbicacionEspacio } from '../types/UbicacionEspacio.js'
import { esTextoValido } from '../utils/validacion.js'
import { validarId } from '../utils/validarId.js'

function esTipoEspacioValido(valor: unknown): valor is TipoEspacio {
    return (
        typeof valor === 'string' &&
        (TIPOS_ESPACIO as readonly string[]).includes(valor)
    )
}

function esUbicacionEspacioValida(valor: unknown): valor is UbicacionEspacio {
    return (
        typeof valor === 'string' &&
        (UBICACIONES_ESPACIO as readonly string[]).includes(valor)
    )
}

function validarDatosCrearEspacio(body: Request['body']): DatosEspacio {
    const datos = body ?? {}
    const { nombre, tipo, ubicacion } = datos

    if (nombre === undefined || tipo === undefined || ubicacion === undefined) {
        throw new AppError(
            400,
            'Faltan datos obligatorios: nombre, tipo y ubicacion',
        )
    }

    if (!esTextoValido(nombre, 1, 100)) {
        throw new AppError(
            400,
            'El nombre del espacio debe tener entre 1 y 100 caracteres',
        )
    }

    if (!esTipoEspacioValido(tipo)) {
        throw new AppError(400, 'El tipo de espacio no es válido')
    }

    if (!esUbicacionEspacioValida(ubicacion)) {
        throw new AppError(400, 'La ubicación del espacio no es válida')
    }

    return {
        nombre: nombre.trim(),
        tipo,
        ubicacion,
    }
}

function validarDatosActualizarEspacio(
    body: Request['body'],
): DatosActualizarEspacio {
    const cuerpo = body ?? {}
    const datos: DatosActualizarEspacio = {}

    if (cuerpo.nombre !== undefined) {
        if (!esTextoValido(cuerpo.nombre, 1, 100)) {
            throw new AppError(
                400,
                'El nombre del espacio debe tener entre 1 y 100 caracteres',
            )
        }

        datos.nombre = cuerpo.nombre.trim()
    }

    if (cuerpo.tipo !== undefined) {
        if (!esTipoEspacioValido(cuerpo.tipo)) {
            throw new AppError(400, 'El tipo de espacio no es válido')
        }

        datos.tipo = cuerpo.tipo
    }

    if (cuerpo.ubicacion !== undefined) {
        if (!esUbicacionEspacioValida(cuerpo.ubicacion)) {
            throw new AppError(400, 'La ubicación del espacio no es válida')
        }

        datos.ubicacion = cuerpo.ubicacion
    }

    if (Object.keys(datos).length === 0) {
        throw new AppError(400, 'No hay datos para actualizar')
    }

    return datos
}

export class EspacioController {
    async obtenerOcupacion(req: Request, res: Response, next: NextFunction) {
        try {
            const { start, end } = req.query

            if (
                typeof start !== 'string' ||
                !start.trim() ||
                typeof end !== 'string' ||
                !end.trim()
            ) {
                throw new AppError(
                    400,
                    'Faltan los parámetros start y end (ej: ?start=2026-10-05&end=2026-10-11)',
                )
            }

            const espacios = await espacioService.obtenerOcupacion(start, end)

            return res.status(200).json({ data: espacios })
        } catch (error) {
            return next(error)
        }
    }

    async listar(req: Request, res: Response, next: NextFunction) {
        try {
            const filtros: ListarEspaciosFiltros = {}
            const { activo, tipo, ubicacion } = req.query

            if (activo !== undefined) {
                if (activo !== 'true' && activo !== 'false') {
                    throw new AppError(
                        400,
                        'El filtro activo debe ser true o false',
                    )
                }

                filtros.activo = activo === 'true'
            }

            if (tipo !== undefined) {
                if (!esTipoEspacioValido(tipo)) {
                    throw new AppError(400, 'El tipo de espacio no es válido')
                }

                filtros.tipo = tipo
            }

            if (ubicacion !== undefined) {
                if (!esUbicacionEspacioValida(ubicacion)) {
                    throw new AppError(
                        400,
                        'La ubicación del espacio no es válida',
                    )
                }

                filtros.ubicacion = ubicacion
            }

            const espacios = await espacioService.listar(filtros)

            return res.status(200).json(espacios)
        } catch (error) {
            return next(error)
        }
    }

    async buscarPorId(req: Request, res: Response, next: NextFunction) {
        try {
            const id = validarId(req.params.id)

            const espacio = await espacioService.buscarPorId(id)

            if (!espacio) {
                throw new AppError(404, 'Espacio no encontrado')
            }

            return res.status(200).json(espacio)
        } catch (error) {
            return next(error)
        }
    }

    async crear(req: Request, res: Response, next: NextFunction) {
        try {
            const datos = validarDatosCrearEspacio(req.body)

            const espacio = await espacioService.crear(datos)

            return res.status(201).json(espacio)
        } catch (error) {
            return next(error)
        }
    }

    async actualizar(req: Request, res: Response, next: NextFunction) {
        try {
            const id = validarId(req.params.id)
            const datos = validarDatosActualizarEspacio(req.body)

            const espacio = await espacioService.actualizar(id, datos)

            return res.status(200).json(espacio)
        } catch (error) {
            return next(error)
        }
    }

    async desactivar(req: Request, res: Response, next: NextFunction) {
        try {
            const id = validarId(req.params.id)

            const espacio = await espacioService.desactivar(id)

            return res.status(200).json(espacio)
        } catch (error) {
            return next(error)
        }
    }

    async reactivar(req: Request, res: Response, next: NextFunction) {
        try {
            const id = validarId(req.params.id)

            const espacio = await espacioService.reactivar(id)

            return res.status(200).json(espacio)
        } catch (error) {
            return next(error)
        }
    }

    async eliminar(req: Request, res: Response, next: NextFunction) {
        try {
            const id = validarId(req.params.id)

            await espacioService.eliminar(id)

            return res.status(204).send()
        } catch (error) {
            return next(error)
        }
    }
}

export const espacioController = new EspacioController()

export const getOcupacionAdmin =
    espacioController.obtenerOcupacion.bind(espacioController)
