import type { NextFunction, Request, Response } from 'express'

import { turnoService } from '../services/turnoService.js'
import { AppError } from '../errors/AppError.js'
import { validarId } from '../utils/validarId.js'

function validarDatosCreacion(body: Request['body']) {
    const { pacienteId, profesionalId, agendaId, fecha, hora, motivo } = body

    if (
        pacienteId === undefined ||
        profesionalId === undefined ||
        agendaId === undefined ||
        fecha === undefined ||
        hora === undefined ||
        motivo === undefined
    ) {
        throw new AppError(400, 'Datos de turno incompletos')
    }

    return {
        pacienteId: Number(pacienteId),
        profesionalId: Number(profesionalId),
        agendaId: Number(agendaId),
        fecha: String(fecha),
        hora: String(hora),
        motivo: String(motivo),
        observaciones: body.observaciones !== undefined ? String(body.observaciones) : undefined,
    }
}

function validarDatosActualizacion(body: Request['body']) {
    const { fecha, hora, motivo, observaciones, estado } = body

    if (
        fecha === undefined &&
        hora === undefined &&
        motivo === undefined &&
        observaciones === undefined &&
        estado === undefined
    ) {
        throw new AppError(400, 'Datos de actualización inválidos')
    }

    return { fecha, hora, motivo, observaciones, estado }
}

export class TurnoController {
    async listar(req: Request, res: Response, next: NextFunction) {
        try {
            const filtros = {
                profesionalId: req.query.profesionalId,
                pacienteId: req.query.pacienteId,
                fecha: req.query.fecha,
                estado: req.query.estado,
            }

            const turnos = await turnoService.listar(filtros)

            return res.status(200).json(turnos)
        } catch (error) {
            return next(error)
        }
    }

    async buscarPorId(req: Request, res: Response, next: NextFunction) {
        try {
            const id = validarId(req.params.id)

            const turno = await turnoService.buscarPorId(id)

            return res.status(200).json(turno)
        } catch (error) {
            return next(error)
        }
    }

    async crear(req: Request, res: Response, next: NextFunction) {
        try {
            const datos = validarDatosCreacion(req.body)

            const turno = await turnoService.crear(datos)

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

            const turno = await turnoService.cancelar(id)

            return res.status(200).json(turno)
        } catch (error) {
            return next(error)
        }
    }
}

export const turnoController = new TurnoController()
