import type { NextFunction, Request, Response } from 'express'
import { agendaService } from '../services/agendaService.js'
import type {
    DatosActualizarAgenda,
    DatosAgenda,
    ListarAgendasFiltros,
    OpcionesActualizarAgenda,
    OpcionesDesactivarAgenda,
} from '../services/agendaService.js'
import { AppError } from '../errors/AppError.js'
import { MENSAJES } from '../errors/mensajes.js'
import { validarId } from '../utils/validarId.js'

function validarDatosCrearAgenda(body: Request['body']): DatosAgenda {
    const datos = body ?? {}
    const { profesionalId, diaSemana, horaInicio, horaFin, duracionTurno } =
        datos

    if (
        profesionalId === undefined ||
        diaSemana === undefined ||
        horaInicio === undefined ||
        horaFin === undefined ||
        duracionTurno === undefined
    ) {
        throw new AppError(
            400,
            'Faltan datos obligatorios: profesionalId, diaSemana, horaInicio, horaFin y duracionTurno',
        )
    }

    return {
        profesionalId: validarId(profesionalId, 'profesionalId'),
        diaSemana,
        horaInicio,
        horaFin,
        duracionTurno,
    }
}

function validarDatosActualizarAgenda(body: Request['body']): {
    datos: DatosActualizarAgenda
    opciones: OpcionesActualizarAgenda
} {
    const cuerpo = body ?? {}
    const datos: DatosActualizarAgenda = {}
    const opciones: OpcionesActualizarAgenda = {}

    if (cuerpo.cancelarTurnosAfectados !== undefined) {
        if (typeof cuerpo.cancelarTurnosAfectados !== 'boolean') {
            throw new AppError(400, 'cancelarTurnosAfectados debe ser booleano')
        }

        opciones.cancelarTurnosAfectados = cuerpo.cancelarTurnosAfectados
    }

    if (cuerpo.diaSemana !== undefined) {
        datos.diaSemana = cuerpo.diaSemana
    }

    if (cuerpo.horaInicio !== undefined) {
        datos.horaInicio = cuerpo.horaInicio
    }

    if (cuerpo.horaFin !== undefined) {
        datos.horaFin = cuerpo.horaFin
    }

    if (cuerpo.duracionTurno !== undefined) {
        datos.duracionTurno = cuerpo.duracionTurno
    }

    if (Object.keys(datos).length === 0) {
        throw new AppError(400, MENSAJES.SIN_DATOS_ACTUALIZAR)
    }

    return { datos, opciones }
}

export class AgendaController {
    async listar(req: Request, res: Response, next: NextFunction) {
        try {
            const filtros: ListarAgendasFiltros = {}
            const { profesionalId, activo } = req.query

            if (profesionalId !== undefined) {
                filtros.profesionalId = validarId(
                    profesionalId,
                    'profesionalId',
                )
            }

            if (activo !== undefined) {
                if (activo !== 'true' && activo !== 'false') {
                    throw new AppError(
                        400,
                        MENSAJES.FILTRO_ACTIVO_INVALIDO,
                    )
                }

                filtros.activo = activo === 'true'
            }

            const agendas = await agendaService.listar(filtros)

            return res.status(200).json(agendas)
        } catch (error) {
            return next(error)
        }
    }
    
    async buscarPorId(req: Request, res: Response, next: NextFunction) {
        try {
            const id = validarId(req.params.id)

            const agenda = await agendaService.buscarPorId(id)

            if (!agenda) {
                throw new AppError(404, 'Agenda no encontrada')
            }

            return res.status(200).json(agenda)
        } catch (error) {
            return next(error)
        }
    }
    
    async listarPorProfesional(
        req: Request,
        res: Response,
        next: NextFunction,
    ) {
        try {
            const profesionalId = validarId(
                req.params.profesionalId,
                'ID del profesional',
            )

            const agendas =
                await agendaService.listarPorProfesional(profesionalId)

            return res.status(200).json(agendas)
        } catch (error) {
            return next(error)
        }
    }
    
    async crear(req: Request, res: Response, next: NextFunction) {
        try {
            const datos = validarDatosCrearAgenda(req.body)

            const agenda = await agendaService.crear(datos)

            return res.status(201).json(agenda)
        } catch (error) {
            return next(error)
        }
    }
    
    async actualizar(req: Request, res: Response, next: NextFunction) {
        try {
            const id = validarId(req.params.id)
            const { datos, opciones } = validarDatosActualizarAgenda(req.body)

            const agenda =
                Object.keys(opciones).length > 0
                    ? await agendaService.actualizar(id, datos, opciones)
                    : await agendaService.actualizar(id, datos)

            return res.status(200).json(agenda)
        } catch (error) {
            return next(error)
        }
    }
    
    async desactivar(req: Request, res: Response, next: NextFunction) {
        try {
            const id = validarId(req.params.id)
            const { cancelarTurnosFuturos } = req.body ?? {}

            if (
                cancelarTurnosFuturos !== undefined &&
                typeof cancelarTurnosFuturos !== 'boolean'
            ) {
                throw new AppError(
                    400,
                    'cancelarTurnosFuturos debe ser booleano',
                )
            }

            const opciones: OpcionesDesactivarAgenda = {}

            if (cancelarTurnosFuturos !== undefined) {
                opciones.cancelarTurnosFuturos = cancelarTurnosFuturos
            }

            if (Object.keys(opciones).length > 0) {
                await agendaService.desactivar(id, opciones)
            } else {
                await agendaService.desactivar(id)
            }

            return res.status(204).send()
        } catch (error) {
            return next(error)
        }
    }
}

export const agendaController = new AgendaController()