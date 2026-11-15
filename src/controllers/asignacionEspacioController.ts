import type { NextFunction, Request, Response } from 'express'
import { asignacionEspacioService } from '../services/asignacionEspacioService.js'
import type {
    DatosAsignacionEspacio,
    ListarAsignacionesEspacioFiltros,
} from '../services/asignacionEspacioService.js'
import { AppError } from '../errors/AppError.js'
import { MENSAJES } from '../errors/mensajes.js'
import { esTipoAsignacionValido } from '../utils/validacionesEntidades.js'
import { validarId } from '../utils/validarId.js'
import { profesionalService } from '../services/profesionalService.js'

function validarDatosAsignacion(body: Request['body']): DatosAsignacionEspacio {
    const datos = body ?? {}
    const {
        espacioId,
        profesionalId,
        tipo,
        diaSemana,
        fecha,
        horaInicio,
        horaFin,
    } = datos

    if (
        espacioId === undefined ||
        profesionalId === undefined ||
        tipo === undefined ||
        horaInicio === undefined ||
        horaFin === undefined
    ) {
        throw new AppError(
            400,
            'Faltan datos obligatorios: espacioId, profesionalId, tipo, horaInicio y horaFin',
        )
    }

    return {
        espacioId: validarId(espacioId, 'espacioId'),
        profesionalId: validarId(profesionalId, 'profesionalId'),
        tipo,
        horaInicio,
        horaFin,
        ...(diaSemana !== undefined ? { diaSemana } : {}),
        ...(fecha !== undefined ? { fecha } : {}),
    }
}

async function obtenerProfesionalDelUsuario(req: Request) {
    const usuario = req.usuario

    if (!usuario) {
        throw new AppError(401, MENSAJES.AUTENTICACION_REQUERIDA)
    }

    const profesional = await profesionalService.buscarPorUsuarioId(usuario.id)

    if (!profesional) {
        throw new AppError(404, MENSAJES.PROFESIONAL_NO_ENCONTRADO)
    }

    return profesional
}

export class AsignacionEspacioController {
    async listar(req: Request, res: Response, next: NextFunction) {
        try {
            const filtros: ListarAsignacionesEspacioFiltros = {}
            const { espacioId, profesionalId, tipo } = req.query

            if (espacioId !== undefined) {
                filtros.espacioId = validarId(espacioId, 'espacioId')
            }

            if (profesionalId !== undefined) {
                filtros.profesionalId = validarId(
                    profesionalId,
                    'profesionalId',
                )
            }

            if (tipo !== undefined) {
                if (!esTipoAsignacionValido(tipo)) {
                    throw new AppError(400, MENSAJES.TIPO_ASIGNACION_INVALIDO)
                }

                filtros.tipo = tipo
            }

            if (req.usuario?.rol === 'PROFESIONAL') {
                const profesional = await obtenerProfesionalDelUsuario(req)
                filtros.profesionalId = profesional.id
            }

            const asignaciones = await asignacionEspacioService.listar(filtros)

            return res.status(200).json(asignaciones)
        } catch (error) {
            return next(error)
        }
    }

    async buscarPorId(req: Request, res: Response, next: NextFunction) {
        try {
            const id = validarId(req.params.id)

            const asignacion = await asignacionEspacioService.buscarPorId(id)

            if (!asignacion) {
                throw new AppError(404, 'Asignación no encontrada')
            }

            if (req.usuario?.rol === 'PROFESIONAL') {
                const profesional = await obtenerProfesionalDelUsuario(req)

                if (asignacion.profesionalId !== profesional.id) {
                    throw new AppError(403, MENSAJES.SIN_PERMISOS)
                }
            }

            return res.status(200).json(asignacion)
        } catch (error) {
            return next(error)
        }
    }

    async crear(req: Request, res: Response, next: NextFunction) {
        try {
            const datos = validarDatosAsignacion(req.body)

            if (req.usuario?.rol === 'PROFESIONAL') {
                const profesional = await obtenerProfesionalDelUsuario(req)

                if (datos.tipo === 'FIJA') {
                    throw new AppError(403, MENSAJES.SIN_PERMISOS)
                }

                datos.profesionalId = profesional.id
            }

            const asignacion = await asignacionEspacioService.crear(datos)

            return res.status(201).json(asignacion)
        } catch (error) {
            return next(error)
        }
    }

    async actualizar(req: Request, res: Response, next: NextFunction) {
        try {
            const id = validarId(req.params.id)
            const datos = validarDatosAsignacion(req.body)

            if (req.usuario?.rol === 'PROFESIONAL') {
                const profesional = await obtenerProfesionalDelUsuario(req)
                const existente = await asignacionEspacioService.buscarPorId(id)

                if (!existente) {
                    throw new AppError(404, 'Asignación no encontrada')
                }

                if (
                    existente.profesionalId !== profesional.id ||
                    existente.tipo !== 'ESPECIFICA' ||
                    datos.tipo === 'FIJA'
                ) {
                    throw new AppError(403, MENSAJES.SIN_PERMISOS)
                }

                datos.profesionalId = profesional.id
            }

            const asignacion = await asignacionEspacioService.actualizar(
                id,
                datos,
            )

            return res.status(200).json(asignacion)
        } catch (error) {
            return next(error)
        }
    }

    async eliminar(req: Request, res: Response, next: NextFunction) {
        try {
            const id = validarId(req.params.id)

            if (req.usuario?.rol === 'PROFESIONAL') {
                const profesional = await obtenerProfesionalDelUsuario(req)
                const existente = await asignacionEspacioService.buscarPorId(id)

                if (!existente) {
                    throw new AppError(404, 'Asignación no encontrada')
                }

                if (
                    existente.profesionalId !== profesional.id ||
                    existente.tipo !== 'ESPECIFICA'
                ) {
                    throw new AppError(403, MENSAJES.SIN_PERMISOS)
                }
            }

            await asignacionEspacioService.eliminar(id)

            return res.status(204).send()
        } catch (error) {
            return next(error)
        }
    }
}

export const asignacionEspacioController = new AsignacionEspacioController()
