import type { NextFunction, Request, Response } from 'express'

import {
    turnoService,
    type OpcionesRelaciones,
} from '../services/turnoService.js'
import { AppError } from '../errors/AppError.js'
import { MENSAJES } from '../errors/mensajes.js'
import type { CrearTurno } from '../types/CrearTurno.js'
import type { ActualizarTurno } from '../types/ActualizarTurno.js'
import { ESTADOS_TURNO, type EstadoTurno } from '../types/EstadoTurno.js'
import {
    turnoDentroDelAlcance,
    type AlcanceTurnos,
} from '../utils/alcanceTurnos.js'
import { normalizarHora } from '../utils/horarios.js'
import { validarFecha } from '../utils/validacion.js'
import { validarId } from '../utils/validarId.js'

function usuarioAutenticado(req: Request) {
    if (!req.usuario) {
        throw new AppError(401, MENSAJES.AUTENTICACION_REQUERIDA)
    }

    return req.usuario
}

// Solo el ADMIN ve los datos sensibles del profesional dentro del turno. Al
// PROFESIONAL solo le llegan sus propios turnos, así que también los ve.
function opcionesPara(req: Request): OpcionesRelaciones {
    return { profesionalCompleto: req.usuario?.rol !== 'PACIENTE' }
}

function validarEstado(valor: unknown): EstadoTurno {
    if (typeof valor !== 'string' || !ESTADOS_TURNO.some((e) => e === valor)) {
        throw new AppError(400, MENSAJES.TURNO_ESTADO_INVALIDO)
    }

    return valor as EstadoTurno
}

function validarMotivo(valor: unknown): string {
    if (typeof valor !== 'string' || valor.trim().length === 0) {
        throw new AppError(400, 'El motivo es obligatorio')
    }

    if (valor.length > 255) {
        throw new AppError(400, 'El motivo no puede superar 255 caracteres')
    }

    return valor.trim()
}

/**
 * Para un PACIENTE el pacienteId sale de su perfil y se ignora el del body:
 * así no puede sacar turnos a nombre de otro.
 */
function validarDatosCreacion(
    body: Request['body'],
    pacienteIdForzado?: number,
): CrearTurno {
    const { pacienteId, profesionalId, agendaId, fecha, hora, motivo } =
        body ?? {}

    if (
        (pacienteIdForzado === undefined && pacienteId === undefined) ||
        profesionalId === undefined ||
        agendaId === undefined ||
        fecha === undefined ||
        hora === undefined ||
        motivo === undefined
    ) {
        throw new AppError(400, 'Datos de turno incompletos')
    }

    return {
        pacienteId: pacienteIdForzado ?? validarId(pacienteId, 'pacienteId'),
        profesionalId: validarId(profesionalId, 'profesionalId'),
        agendaId: validarId(agendaId, 'agendaId'),
        fecha: validarFecha(fecha),
        hora: normalizarHora(hora, 'hora'),
        motivo: validarMotivo(motivo),
        observaciones:
            body.observaciones !== undefined && body.observaciones !== null
                ? String(body.observaciones)
                : null,
    }
}

function validarDatosActualizacion(body: Request['body']): ActualizarTurno {
    const { fecha, hora, motivo, observaciones, estado } = body ?? {}

    if (
        fecha === undefined &&
        hora === undefined &&
        motivo === undefined &&
        observaciones === undefined &&
        estado === undefined
    ) {
        throw new AppError(400, 'Datos de actualización inválidos')
    }

    const datos: ActualizarTurno = {}

    if (fecha !== undefined) {
        datos.fecha = validarFecha(fecha)
    }

    if (hora !== undefined) {
        datos.hora = normalizarHora(hora, 'hora')
    }

    if (motivo !== undefined) {
        datos.motivo = validarMotivo(motivo)
    }

    if (observaciones !== undefined) {
        datos.observaciones =
            observaciones === null ? null : String(observaciones)
    }

    if (estado !== undefined) {
        datos.estado = validarEstado(estado)
    }

    return datos
}

function filtrosDeAdmin(query: Request['query']) {
    const filtros: Record<string, string | number> = {}

    if (query.profesionalId !== undefined) {
        filtros.profesionalId = validarId(query.profesionalId, 'profesionalId')
    }

    if (query.pacienteId !== undefined) {
        filtros.pacienteId = validarId(query.pacienteId, 'pacienteId')
    }

    if (query.fecha !== undefined) {
        filtros.fecha = validarFecha(query.fecha)
    }

    if (query.estado !== undefined) {
        filtros.estado = validarEstado(query.estado)
    }

    return filtros
}

function filtrosPorAlcance(
    alcance: AlcanceTurnos,
    query: Request['query'],
): Record<string, string | number> {
    if (alcance.tipo === 'TODOS') {
        return filtrosDeAdmin(query)
    }

    // PACIENTE y PROFESIONAL pueden filtrar por fecha y estado, pero nunca
    // por otro paciente o profesional: ese filtro lo pone el server.
    const { fecha, estado } = filtrosDeAdmin({
        fecha: query.fecha,
        estado: query.estado,
    })
    const filtros: Record<string, string | number> = {}

    if (fecha !== undefined) filtros.fecha = fecha
    if (estado !== undefined) filtros.estado = estado

    if (alcance.tipo === 'PACIENTE') {
        filtros.pacienteId = alcance.pacienteId
    } else if (alcance.tipo === 'PROFESIONAL') {
        filtros.profesionalId = alcance.profesionalId
    }

    return filtros
}

export class TurnoController {
    async listar(req: Request, res: Response, next: NextFunction) {
        try {
            const usuario = usuarioAutenticado(req)
            const alcance = await turnoService.obtenerAlcance(usuario)

            if (alcance.tipo === 'NINGUNO') {
                return res.status(200).json([])
            }

            const turnos = await turnoService.listar(
                filtrosPorAlcance(alcance, req.query),
                opcionesPara(req),
            )

            return res.status(200).json(turnos)
        } catch (error) {
            return next(error)
        }
    }

    async buscarPorId(req: Request, res: Response, next: NextFunction) {
        try {
            const id = validarId(req.params.id)
            const usuario = usuarioAutenticado(req)

            const turno = await turnoService.buscarPorId(id, opcionesPara(req))
            const alcance = await turnoService.obtenerAlcance(usuario)

            // 404 y no 403: no se revela que el turno existe.
            if (!turnoDentroDelAlcance(turno, alcance)) {
                throw new AppError(404, MENSAJES.TURNO_NO_ENCONTRADO)
            }

            return res.status(200).json(turno)
        } catch (error) {
            return next(error)
        }
    }

    async horariosLibres(req: Request, res: Response, next: NextFunction) {
        try {
            if (req.query.profesionalId === undefined) {
                throw new AppError(400, 'El profesionalId es obligatorio')
            }

            if (req.query.fecha === undefined) {
                throw new AppError(400, MENSAJES.FECHA_INVALIDA)
            }

            const profesionalId = validarId(
                req.query.profesionalId,
                'profesionalId',
            )
            const fecha = validarFecha(req.query.fecha)

            const horarios = await turnoService.horariosLibres(
                profesionalId,
                fecha,
            )

            return res.status(200).json(horarios)
        } catch (error) {
            return next(error)
        }
    }

    async crear(req: Request, res: Response, next: NextFunction) {
        try {
            const usuario = usuarioAutenticado(req)
            let pacienteIdForzado: number | undefined

            if (usuario.rol === 'PACIENTE') {
                const alcance = await turnoService.obtenerAlcance(usuario)

                if (alcance.tipo !== 'PACIENTE') {
                    throw new AppError(403, MENSAJES.PERFIL_PACIENTE_REQUERIDO)
                }

                pacienteIdForzado = alcance.pacienteId
            }

            const datos = validarDatosCreacion(req.body, pacienteIdForzado)

            const turno = await turnoService.crear(datos, opcionesPara(req))

            return res.status(201).json(turno)
        } catch (error) {
            return next(error)
        }
    }

    async actualizar(req: Request, res: Response, next: NextFunction) {
        try {
            const id = validarId(req.params.id)

            const datos = validarDatosActualizacion(req.body)

            const turno = await turnoService.actualizar(id, datos)

            return res.status(200).json(turno)
        } catch (error) {
            return next(error)
        }
    }

    async cancelar(req: Request, res: Response, next: NextFunction) {
        try {
            const id = validarId(req.params.id)
            const usuario = usuarioAutenticado(req)

            if (usuario.rol !== 'ADMIN') {
                const alcance = await turnoService.obtenerAlcance(usuario)
                const turno = await turnoService.buscarPorId(id)

                if (!turnoDentroDelAlcance(turno, alcance)) {
                    throw new AppError(404, MENSAJES.TURNO_NO_ENCONTRADO)
                }
            }

            const turno = await turnoService.cancelar(id, opcionesPara(req))

            return res.status(200).json(turno)
        } catch (error) {
            return next(error)
        }
    }
}

export const turnoController = new TurnoController()
